import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { createNotificationHelper, logActivityHelper } from "./notifications";

/**
 * Permission verification helper for comment operations
 */
async function verifyCommentPermission(
  ctx: any,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  requiredPermission = "task:comment"
): Promise<boolean> {
  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) throw new Error("Workspace not found.");

  if (workspace.ownerId === userId) return true;

  const membership = await ctx.db
    .query("workspace_members")
    .withIndex("by_workspace_and_user", (q: any) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId)
    )
    .first();

  if (!membership) {
    throw new Error("Access denied: You are not a member of this workspace.");
  }

  const role = await ctx.db.get(membership.roleId);
  if (!role) {
    throw new Error("Access denied: Role definition not found.");
  }

  if (role.name === "Owner" || role.name === "Admin" || role.name === "Manager" || role.name === "Member") {
    return true;
  }

  const perms: string[] = role.permissions || [];
  if (perms.includes("*") || perms.includes("all")) return true;

  return perms.includes(requiredPermission) || perms.includes("task:read");
}

/* =========================================================================
 * QUERIES (real-time)
 * ========================================================================= */

/**
 * 1. getTaskComments(taskId, limit = 50)
 * Returns all active comments on task sorted by createdAt asc (oldest first).
 * Enriched with author information, mentions, and reactions.
 */
export const getTaskComments = query({
  args: {
    taskId: v.id("tasks"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const comments = await ctx.db
      .query("task_comments")
      .withIndex("by_taskId_and_createdAt", (q) => q.eq("taskId", args.taskId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .take(limit);

    // Enrich comments with author and editor metadata
    return await Promise.all(
      comments.map(async (comment) => {
        const author = await ctx.db.get(comment.userId);
        const editor = comment.editedBy ? await ctx.db.get(comment.editedBy) : null;

        return {
          ...comment,
          commentId: comment._id,
          author: author
            ? {
                _id: author._id,
                name: author.name,
                email: author.email,
                avatar: author.avatar,
                role: author.role,
              }
            : {
                _id: comment.userId,
                name: "Deleted User",
                email: "",
                avatar: undefined,
                role: undefined,
              },
          editor: editor
            ? {
                _id: editor._id,
                name: editor.name,
              }
            : undefined,
          reactions: comment.reactions || {},
        };
      })
    );
  },
});

/**
 * 2. getCommentDetails(commentId)
 * Returns a single comment with full author details and task reference.
 */
export const getCommentDetails = query({
  args: {
    commentId: v.id("task_comments"),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.isDeleted) return null;

    const author = await ctx.db.get(comment.userId);
    const task = await ctx.db.get(comment.taskId);
    const editor = comment.editedBy ? await ctx.db.get(comment.editedBy) : null;

    return {
      ...comment,
      commentId: comment._id,
      taskTitle: task?.title || "Unknown Task",
      author: author
        ? {
            _id: author._id,
            name: author.name,
            email: author.email,
            avatar: author.avatar,
          }
        : null,
      editor: editor
        ? {
            _id: editor._id,
            name: editor.name,
          }
        : null,
      reactions: comment.reactions || {},
    };
  },
});

/* =========================================================================
 * MUTATIONS (write)
 * ========================================================================= */

/**
 * 1. createComment(taskId, workspaceId, userId, content, mentions?)
 * Validates permission & content length, inserts comment, dispatches mention notifications,
 * and logs to the workspace activity feed.
 */
export const createComment = mutation({
  args: {
    taskId: v.id("tasks"),
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    content: v.string(),
    mentions: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          userName: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // 1. Permission check
    await verifyCommentPermission(ctx, args.workspaceId, args.userId, "task:comment");

    // 2. Validate content
    const trimmed = args.content.trim();
    if (!trimmed || trimmed.length === 0) {
      throw new Error("Comment content cannot be empty.");
    }
    if (trimmed.length > 5000) {
      throw new Error("Comment exceeds maximum allowed length of 5000 characters.");
    }

    // 3. Fetch task & user details
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found.");

    const commenter = await ctx.db.get(args.userId);
    const commenterName = commenter?.name || "A team member";

    // 4. Parse mentions if not explicitly provided
    let finalMentions = args.mentions || [];
    if (finalMentions.length === 0) {
      // Auto-extract @mentions if members exist in the workspace
      const mentionMatches = trimmed.match(/@(\w+)/g);
      if (mentionMatches) {
        const workspaceMembers = await ctx.db
          .query("workspace_members")
          .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
          .collect();

        for (const mentionTag of mentionMatches) {
          const searchName = mentionTag.slice(1).toLowerCase();
          for (const member of workspaceMembers) {
            const memberUser = await ctx.db.get(member.userId);
            if (
              memberUser &&
              memberUser.name.toLowerCase().includes(searchName) &&
              !finalMentions.some((m) => m.userId === member.userId)
            ) {
              finalMentions.push({
                userId: member.userId,
                userName: memberUser.name,
              });
            }
          }
        }
      }
    }

    // 5. Insert comment record
    const now = Date.now();
    const commentId = await ctx.db.insert("task_comments", {
      taskId: args.taskId,
      workspaceId: args.workspaceId,
      userId: args.userId,
      content: trimmed,
      mentions: finalMentions,
      reactions: {},
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });

    const preview = trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;

    // 6. Notify mentioned users
    for (const mention of finalMentions) {
      if (mention.userId !== args.userId) {
        await createNotificationHelper(ctx, {
          userId: mention.userId,
          workspaceId: args.workspaceId,
          type: "mention",
          title: "Mentioned in task",
          message: `${commenterName} mentioned you in task "${task.title}": "${preview}"`,
          actionBy: args.userId,
          relatedResourceId: args.taskId,
          relatedResourceType: "task",
          link: `/tasks?selectedTask=${args.taskId}`,
          metadata: { taskId: args.taskId, commentId },
        });
      }
    }

    // 7. Notify task assignee if not commenter and not already notified as mentioned
    if (task.assigneeId && task.assigneeId !== args.userId) {
      const alreadyMentioned = finalMentions.some((m) => m.userId === task.assigneeId);
      if (!alreadyMentioned) {
        await createNotificationHelper(ctx, {
          userId: task.assigneeId,
          workspaceId: args.workspaceId,
          type: "task_commented",
          title: "New comment on your task",
          message: `${commenterName} commented on "${task.title}": "${preview}"`,
          actionBy: args.userId,
          relatedResourceId: args.taskId,
          relatedResourceType: "task",
          link: `/tasks?selectedTask=${args.taskId}`,
          metadata: { taskId: args.taskId, commentId },
        });
      }
    }

    // 8. Notify subscribers watching this task
    const subscribers = await ctx.db
      .query("task_subscribers")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .collect();

    for (const sub of subscribers) {
      if (
        sub.userId !== args.userId &&
        sub.userId !== task.assigneeId &&
        !finalMentions.some((m) => m.userId === sub.userId)
      ) {
        await createNotificationHelper(ctx, {
          userId: sub.userId,
          workspaceId: args.workspaceId,
          type: "task_commented",
          title: "New activity on watched task",
          message: `${commenterName} commented on watched task "${task.title}": "${preview}"`,
          actionBy: args.userId,
          relatedResourceId: args.taskId,
          relatedResourceType: "task",
          link: `/tasks?selectedTask=${args.taskId}`,
          metadata: { taskId: args.taskId, commentId },
        });
      }
    }

    // 9. Log workspace activity
    await logActivityHelper(ctx, {
      workspaceId: args.workspaceId,
      userId: args.userId,
      action: "task_commented",
      resourceType: "task",
      resourceId: args.taskId,
      resourceName: task.title,
      description: `${commenterName} commented on task "${task.title}"`,
      changes: { commentId, preview },
    });

    return {
      commentId,
      content: trimmed,
      createdAt: now,
      taskId: args.taskId,
      userId: args.userId,
    };
  },
});

/**
 * 2. editComment(commentId, newContent, editedBy)
 * Validates author or admin status and updates content.
 */
export const editComment = mutation({
  args: {
    commentId: v.id("task_comments"),
    newContent: v.string(),
    editedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.isDeleted) {
      throw new Error("Comment not found or already deleted.");
    }

    const trimmed = args.newContent.trim();
    if (!trimmed || trimmed.length === 0) {
      throw new Error("Comment content cannot be empty.");
    }
    if (trimmed.length > 5000) {
      throw new Error("Comment exceeds maximum allowed length of 5000 characters.");
    }

    // Verify permission: comment author or workspace admin/owner
    if (comment.userId !== args.editedBy) {
      const workspace = await ctx.db.get(comment.workspaceId);
      const isOwner = workspace?.ownerId === args.editedBy;

      let isAdmin = false;
      if (!isOwner) {
        const membership = await ctx.db
          .query("workspace_members")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", comment.workspaceId).eq("userId", args.editedBy)
          )
          .first();

        if (membership) {
          const role = await ctx.db.get(membership.roleId);
          if (role && (role.name === "Owner" || role.name === "Admin")) {
            isAdmin = true;
          }
        }
      }

      if (!isOwner && !isAdmin) {
        throw new Error("Permission denied: You can only edit your own comments.");
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.commentId, {
      content: trimmed,
      updatedAt: now,
      editedBy: args.editedBy,
    });

    return {
      success: true,
      commentId: args.commentId,
      updatedAt: now,
    };
  },
});

/**
 * 3. deleteComment(commentId, deletedBy)
 * Soft-deletes a comment for audit history.
 */
export const deleteComment = mutation({
  args: {
    commentId: v.id("task_comments"),
    deletedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.isDeleted) {
      throw new Error("Comment not found or already deleted.");
    }

    // Verify permission: author or workspace owner/admin
    if (comment.userId !== args.deletedBy) {
      const workspace = await ctx.db.get(comment.workspaceId);
      const isOwner = workspace?.ownerId === args.deletedBy;

      let isAdmin = false;
      if (!isOwner) {
        const membership = await ctx.db
          .query("workspace_members")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", comment.workspaceId).eq("userId", args.deletedBy)
          )
          .first();

        if (membership) {
          const role = await ctx.db.get(membership.roleId);
          if (role && (role.name === "Owner" || role.name === "Admin")) {
            isAdmin = true;
          }
        }
      }

      if (!isOwner && !isAdmin) {
        throw new Error("Permission denied: You can only delete your own comments.");
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.commentId, {
      isDeleted: true,
      deletedAt: now,
      deletedBy: args.deletedBy,
    });

    return { success: true, commentId: args.commentId };
  },
});

/**
 * 4. addReaction(commentId, userId, emoji)
 * Adds emoji reaction for user, or toggles it off if already present.
 */
export const addReaction = mutation({
  args: {
    commentId: v.id("task_comments"),
    userId: v.id("users"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.isDeleted) {
      throw new Error("Comment not found.");
    }

    const reactions: Record<string, string[]> = { ...(comment.reactions || {}) };
    const currentUsers = reactions[args.emoji] || [];

    const userStr = args.userId as string;
    let updatedUsers: string[];

    // Toggle behavior: if user already reacted with this emoji, remove it
    if (currentUsers.includes(userStr)) {
      updatedUsers = currentUsers.filter((id) => id !== userStr);
    } else {
      updatedUsers = [...currentUsers, userStr];
    }

    if (updatedUsers.length > 0) {
      reactions[args.emoji] = updatedUsers;
    } else {
      delete reactions[args.emoji];
    }

    await ctx.db.patch(args.commentId, {
      reactions,
    });

    return reactions;
  },
});

/**
 * 5. removeReaction(commentId, userId, emoji)
 * Removes specific emoji reaction for user.
 */
export const removeReaction = mutation({
  args: {
    commentId: v.id("task_comments"),
    userId: v.id("users"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.isDeleted) {
      throw new Error("Comment not found.");
    }

    const reactions: Record<string, string[]> = { ...(comment.reactions || {}) };
    const currentUsers = reactions[args.emoji] || [];

    const userStr = args.userId as string;
    const updatedUsers = currentUsers.filter((id) => id !== userStr);

    if (updatedUsers.length > 0) {
      reactions[args.emoji] = updatedUsers;
    } else {
      delete reactions[args.emoji];
    }

    await ctx.db.patch(args.commentId, {
      reactions,
    });

    return reactions;
  },
});
