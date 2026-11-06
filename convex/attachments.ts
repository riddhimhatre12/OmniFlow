import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { logActivityHelper } from "./notifications";

const DISALLOWED_EXTENSIONS = [
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".sh",
  ".vbs",
  ".com",
  ".scr",
  ".msi",
  ".jar",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Permission verification helper for attachment operations
 */
async function verifyAttachmentPermission(
  ctx: any,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">
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

  return true;
}

/* =========================================================================
 * QUERIES (real-time)
 * ========================================================================= */

/**
 * 1. getTaskAttachments(taskId)
 * Returns all active attachments on a task sorted by uploadedAt desc (newest first).
 * Enriched with uploader profile information.
 */
export const getTaskAttachments = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const attachments = await ctx.db
      .query("task_attachments")
      .withIndex("by_taskId_and_uploadedAt", (q) => q.eq("taskId", args.taskId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .order("desc")
      .collect();

    return await Promise.all(
      attachments.map(async (att) => {
        const uploader = await ctx.db.get(att.uploadedBy);

        // Dynamically verify latest downloadable URL (Cloudinary or Convex storage)
        let currentUrl = att.cloudinarySecureUrl || att.cloudinaryUrl || att.url || "";
        if (att.storageKey && !att.cloudinaryPublicId) {
          try {
            const freshUrl = await ctx.storage.getUrl(att.storageKey as any);
            if (freshUrl) currentUrl = freshUrl;
          } catch {
            // Fall back to recorded URL
          }
        }

        return {
          ...att,
          attachmentId: att._id,
          url: currentUrl,
          uploader: uploader
            ? {
                _id: uploader._id,
                name: uploader.name,
                email: uploader.email,
                avatar: uploader.avatar,
              }
            : {
                _id: att.uploadedBy,
                name: "Deleted User",
                email: "",
                avatar: undefined,
              },
        };
      })
    );
  },
});

/**
 * 2. getAttachmentDownloadUrl(attachmentId)
 * Returns fresh downloadable URL for an attachment.
 */
export const getAttachmentDownloadUrl = query({
  args: {
    attachmentId: v.id("task_attachments"),
  },
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment || attachment.isDeleted) {
      throw new Error("Attachment not found or deleted.");
    }

    let url = attachment.cloudinarySecureUrl || attachment.cloudinaryUrl || attachment.url || "";
    if (attachment.storageKey && !attachment.cloudinaryPublicId) {
      try {
        const storageUrl = await ctx.storage.getUrl(attachment.storageKey as any);
        if (storageUrl) url = storageUrl;
      } catch {
        // Fall back to recorded URL
      }
    }

    return {
      url,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
    };
  },
});

/* =========================================================================
 * MUTATIONS (write)
 * ========================================================================= */

/**
 * 1. generateUploadUrl()
 * Generates a temporary pre-signed upload URL for Convex File Storage.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * 2. uploadAttachment(taskId, workspaceId, userId, storageKey, fileName, fileType, fileSize, description?)
 * Validates file size and extension, saves metadata record to task_attachments, and logs activity.
 */
export const uploadAttachment = mutation({
  args: {
    taskId: v.id("tasks"),
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    storageKey: v.string(), // Convex storage ID
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Permission check
    await verifyAttachmentPermission(ctx, args.workspaceId, args.userId);

    // 2. Validate file size (max 50MB)
    if (args.fileSize > MAX_FILE_SIZE) {
      throw new Error(`File exceeds maximum size limit of 50MB (received ${(args.fileSize / (1024 * 1024)).toFixed(2)}MB).`);
    }

    // 3. Validate file extension
    const ext = args.fileName.slice(args.fileName.lastIndexOf(".")).toLowerCase();
    if (DISALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(`File type "${ext}" is not permitted for security reasons.`);
    }

    // 4. Resolve download URL from storage
    const storageUrl = await ctx.storage.getUrl(args.storageKey as any);
    const finalUrl = storageUrl || "";

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found.");

    const now = Date.now();
    const attachmentId = await ctx.db.insert("task_attachments", {
      taskId: args.taskId,
      workspaceId: args.workspaceId,
      uploadedBy: args.userId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      storageKey: args.storageKey,
      url: finalUrl,
      description: args.description?.trim(),
      uploadedAt: now,
      isDeleted: false,
    });

    const user = await ctx.db.get(args.userId);
    const uploaderName = user?.name || "A team member";

    // 5. Log activity
    await logActivityHelper(ctx, {
      workspaceId: args.workspaceId,
      userId: args.userId,
      action: "file_uploaded",
      resourceType: "task",
      resourceId: args.taskId,
      resourceName: task.title,
      description: `${uploaderName} uploaded "${args.fileName}" to task "${task.title}"`,
      changes: { attachmentId, fileName: args.fileName, fileSize: args.fileSize },
    });

    return {
      attachmentId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      url: finalUrl,
      uploadedAt: now,
    };
  },
});

/**
 * 3. deleteAttachment(attachmentId, deletedBy)
 * Soft-deletes an attachment record (uploader or admin).
 */
export const deleteAttachment = mutation({
  args: {
    attachmentId: v.id("task_attachments"),
    deletedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment || attachment.isDeleted) {
      throw new Error("Attachment not found or already deleted.");
    }

    // Verify permission: uploader or workspace owner/admin
    if (attachment.uploadedBy !== args.deletedBy) {
      const workspace = await ctx.db.get(attachment.workspaceId);
      const isOwner = workspace?.ownerId === args.deletedBy;

      let isAdmin = false;
      if (!isOwner) {
        const membership = await ctx.db
          .query("workspace_members")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", attachment.workspaceId).eq("userId", args.deletedBy)
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
        throw new Error("Permission denied: You can only remove attachments you uploaded.");
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.attachmentId, {
      isDeleted: true,
      deletedAt: now,
    });

    return { success: true, attachmentId: args.attachmentId };
  },
});

/* =========================================================================
 * TASK SUBSCRIBERS / WATCHERS (Optional functions from 2.2.md)
 * ========================================================================= */

/**
 * subscribeToTask(taskId, userId)
 * Adds user to subscribers watching this task.
 */
export const subscribeToTask = mutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("task_subscribers")
      .withIndex("by_taskId_and_userId", (q) =>
        q.eq("taskId", args.taskId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      return { success: true, subscribed: true, subscriberId: existing._id };
    }

    const subscriberId = await ctx.db.insert("task_subscribers", {
      taskId: args.taskId,
      userId: args.userId,
      subscribedAt: Date.now(),
    });

    return { success: true, subscribed: true, subscriberId };
  },
});

/**
 * unsubscribeFromTask(taskId, userId)
 * Removes user from subscribers watching this task.
 */
export const unsubscribeFromTask = mutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("task_subscribers")
      .withIndex("by_taskId_and_userId", (q) =>
        q.eq("taskId", args.taskId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true, subscribed: false };
  },
});

/**
 * getTaskSubscribers(taskId)
 * Returns all active watchers on a task with user details.
 */
export const getTaskSubscribers = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const subscribers = await ctx.db
      .query("task_subscribers")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .collect();

    return await Promise.all(
      subscribers.map(async (sub) => {
        const user = await ctx.db.get(sub.userId);
        return {
          ...sub,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
              }
            : null,
        };
      })
    );
  },
});

/**
 * isTaskSubscribed(taskId, userId)
 * Checks if a specific user is watching a task.
 */
export const isTaskSubscribed = query({
  args: {
    taskId: v.id("tasks"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (!args.userId) return false;

    const currentUserId = args.userId;
    const existing = await ctx.db
      .query("task_subscribers")
      .withIndex("by_taskId_and_userId", (q) =>
        q.eq("taskId", args.taskId).eq("userId", currentUserId)
      )
      .first();

    return Boolean(existing);
  },
});
