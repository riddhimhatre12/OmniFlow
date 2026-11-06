import { query, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { createNotificationHelper, logActivityHelper } from "./notifications";

/**
 * Permission verification helper for Task operations
 */
async function verifyTaskPermission(
  ctx: any,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  requiredPermission: string
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

  if (!membership) throw new Error("Access denied: You are not a member of this workspace.");

  const role = await ctx.db.get(membership.roleId);
  if (!role) throw new Error("Access denied: Role definition not found.");

  if (role.name === "Owner" || role.name === "Admin") return true;

  const perms: string[] = role.permissions || [];
  if (perms.includes("*") || perms.includes("all")) return true;

  return (
    perms.includes(requiredPermission) ||
    perms.includes(requiredPermission.replace(":", "_"))
  );
}

/**
 * Helper to check user notification preferences and dispatch task assignment email
 */
async function sendTaskAssignmentEmailIfEnabled(
  ctx: any,
  params: {
    workspaceId: Id<"workspaces">;
    projectId: Id<"projects">;
    taskId: Id<"tasks">;
    assigneeId: Id<"users">;
    assignerUserId: Id<"users">;
    taskTitle: string;
    taskDescription?: string;
    priority: string;
    dueDate?: number;
  }
) {
  // Avoid self-notification
  if (params.assigneeId === params.assignerUserId) return;

  const assignee = await ctx.db.get(params.assigneeId);
  if (!assignee || !assignee.email) return;

  const assigner = await ctx.db.get(params.assignerUserId);
  const assignerName = assigner?.name || assigner?.email || "A team member";

  const project = await ctx.db.get(params.projectId);
  const projectName = project?.name || "Productflow Project";

  // Check user notification preferences
  const prefs = await ctx.db
    .query("notification_preferences")
    .withIndex("by_userId_workspace", (q: any) =>
      q.eq("userId", params.assigneeId).eq("workspaceId", params.workspaceId)
    )
    .first();

  const isEmailEnabled =
    !prefs ||
    (prefs.emailNotifications !== false && prefs.taskAssignedEnabled !== false);

  if (!isEmailEnabled) return;

  const formattedDueDate = params.dueDate
    ? new Date(params.dueDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "No deadline";

  ctx.scheduler.runAfter(0, api.mailer.sendTaskAssignmentEmail, {
    assigneeEmail: assignee.email,
    assigneeName: assignee.name || assignee.email.split("@")[0],
    assignerName,
    taskTitle: params.taskTitle,
    projectName,
    taskDescription: params.taskDescription,
    priority: params.priority,
    dueDate: formattedDueDate,
    taskId: params.taskId,
    projectId: params.projectId,
  });
}

/* =========================================================================
 * QUERIES (read-only)
 * ========================================================================= */

/**
 * 1. getTask(taskId)
 * Returns full task object with assignee, project, sprint, and creator details
 */
export const getTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) return null;

    let assignee = null;
    if (task.assigneeId) {
      const u = await ctx.db.get(task.assigneeId);
      if (u) {
        assignee = {
          id: u._id,
          name: u.name,
          email: u.email,
          avatar: u.avatar,
        };
      }
    }

    let creator = null;
    if (task.createdBy) {
      const cu = await ctx.db.get(task.createdBy);
      if (cu) {
        creator = {
          id: cu._id,
          name: cu.name,
          email: cu.email,
          avatar: cu.avatar,
        };
      }
    }

    const project = await ctx.db.get(task.projectId);

    let sprint = null;
    if (task.sprintId) {
      const s = await ctx.db.get(task.sprintId);
      if (s) {
        sprint = {
          id: s._id,
          name: s.name,
          status: s.status,
          goal: s.goal,
          startDate: s.startDate,
          endDate: s.endDate,
        };
      }
    }

    return {
      taskId: task._id,
      _id: task._id,
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      sprintId: task.sprintId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      storyPoints: task.storyPoints,
      dueDate: task.dueDate,
      order: task.order,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      assignee,
      creator,
      project: project
        ? {
            id: project._id,
            name: project.name,
            color: project.color ?? "#6366f1",
            slug: project.slug,
          }
        : null,
      sprint,
    };
  },
});

/**
 * 2. getTasksByAssignee(userId, workspaceId, sprintId?)
 * Returns all tasks assigned to user in workspace, optionally filtered by sprint
 */
export const getTasksByAssignee = query({
  args: {
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    sprintId: v.optional(v.id("sprints")),
  },
  handler: async (ctx, args) => {
    const rawTasks = await ctx.db
      .query("tasks")
      .withIndex("by_assigneeId", (q) => q.eq("assigneeId", args.userId))
      .filter((q) => q.eq(q.field("workspaceId"), args.workspaceId))
      .collect();

    let filtered = rawTasks;
    if (args.sprintId) {
      filtered = filtered.filter((t) => t.sprintId === args.sprintId);
    }

    const enriched = [];
    for (const task of filtered) {
      const proj = await ctx.db.get(task.projectId);
      let sprint = null;
      if (task.sprintId) {
        const s = await ctx.db.get(task.sprintId);
        if (s) {
          sprint = {
            id: s._id,
            name: s.name,
            status: s.status,
          };
        }
      }

      enriched.push({
        taskId: task._id,
        _id: task._id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        storyPoints: task.storyPoints,
        dueDate: task.dueDate,
        order: task.order,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        projectId: task.projectId,
        projectName: proj?.name ?? "Project",
        projectColor: proj?.color ?? "#6366f1",
        sprint,
      });
    }

    // Sort by order asc, then updatedAt desc
    enriched.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return b.updatedAt - a.updatedAt;
    });

    return enriched;
  },
});

/**
 * 3. getTasksInStatus(sprintId, status)
 * Returns tasks in specific sprint and status, sorted by order for Kanban columns
 */
export const getTasksInStatus = query({
  args: {
    sprintId: v.id("sprints"),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("in_review"),
      v.literal("done")
    ),
  },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_sprint_and_status", (q) =>
        q.eq("sprintId", args.sprintId).eq("status", args.status)
      )
      .collect();

    const enriched = [];
    for (const task of tasks) {
      let assignee = null;
      if (task.assigneeId) {
        const u = await ctx.db.get(task.assigneeId);
        if (u) {
          assignee = {
            id: u._id,
            name: u.name,
            email: u.email,
            avatar: u.avatar,
          };
        }
      }

      enriched.push({
        taskId: task._id,
        _id: task._id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        storyPoints: task.storyPoints,
        dueDate: task.dueDate,
        order: task.order,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        assignee,
      });
    }

    enriched.sort((a, b) => a.order - b.order);
    return enriched;
  },
});

/**
 * 4. getWorkspaceTasks
 * Retrieves tasks filtered by workspace, project, sprint, status, or backlog
 */
export const getWorkspaceTasks = query({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    sprintId: v.optional(v.id("sprints")),
    isBacklogOnly: v.optional(v.boolean()),
    status: v.optional(v.string()),
    assigneeId: v.optional(v.id("users")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let tasksQuery;

    if (args.projectId) {
      tasksQuery = ctx.db
        .query("tasks")
        .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId!));
    } else {
      tasksQuery = ctx.db
        .query("tasks")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId));
    }

    const rawTasks = await tasksQuery.collect();

    let filtered = rawTasks;

    if (args.isBacklogOnly) {
      filtered = filtered.filter((t) => !t.sprintId);
    } else if (args.sprintId) {
      filtered = filtered.filter((t) => t.sprintId === args.sprintId);
    }

    if (args.status && args.status !== "all") {
      filtered = filtered.filter((t) => t.status === args.status);
    }

    if (args.assigneeId) {
      filtered = filtered.filter((t) => t.assigneeId === args.assigneeId);
    }

    if (args.search && args.search.trim()) {
      const q = args.search.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    const enriched = [];
    for (const task of filtered) {
      let assignee = null;
      if (task.assigneeId) {
        const u = await ctx.db.get(task.assigneeId);
        if (u) {
          assignee = {
            id: u._id,
            name: u.name,
            email: u.email,
            avatar: u.avatar,
          };
        }
      }

      let sprint = null;
      if (task.sprintId) {
        const s = await ctx.db.get(task.sprintId);
        if (s) {
          sprint = {
            id: s._id,
            name: s.name,
            status: s.status,
          };
        }
      }

      const proj = await ctx.db.get(task.projectId);

      enriched.push({
        taskId: task._id,
        _id: task._id,
        workspaceId: task.workspaceId,
        projectId: task.projectId,
        sprintId: task.sprintId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        storyPoints: task.storyPoints,
        dueDate: task.dueDate,
        order: task.order,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        assignee,
        sprint,
        projectName: proj?.name ?? "Project",
        projectColor: proj?.color ?? "#6366f1",
      });
    }

    enriched.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return b.updatedAt - a.updatedAt;
    });

    return enriched;
  },
});

/* =========================================================================
 * MUTATIONS (write)
 * ========================================================================= */

/**
 * 1. createTask
 * Creates a work item with status = "todo"
 */
export const createTask = mutation({
  args: {
    projectId: v.id("projects"),
    sprintId: v.optional(v.id("sprints")),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("todo"),
        v.literal("in_progress"),
        v.literal("in_review"),
        v.literal("done")
      )
    ),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent")
      )
    ),
    storyPoints: v.optional(v.number()),
    assigneeId: v.optional(v.id("users")),
    dueDate: v.optional(v.number()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found.");

    await verifyTaskPermission(ctx, project.workspaceId, args.userId, "task:create");

    const trimmedTitle = args.title.trim();
    if (!trimmedTitle) throw new Error("Task title cannot be empty.");

    // Validate sprint if provided
    let sprintName = "";
    if (args.sprintId) {
      const sprint = await ctx.db.get(args.sprintId);
      if (!sprint) throw new Error("Target sprint not found.");
      if (sprint.status === "closed") {
        throw new Error("Cannot add tasks to a closed sprint.");
      }
      sprintName = sprint.name;
    }

    // Auto-generate order: highest existing in that context + 1
    let existingTasks;
    if (args.sprintId) {
      existingTasks = await ctx.db
        .query("tasks")
        .withIndex("by_sprintId", (q) => q.eq("sprintId", args.sprintId!))
        .collect();
    } else {
      const allProjectTasks = await ctx.db
        .query("tasks")
        .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
        .collect();
      existingTasks = allProjectTasks.filter((t) => !t.sprintId);
    }

    const maxOrder = existingTasks.reduce((max, t) => Math.max(max, t.order || 0), 0);
    const now = Date.now();

    const taskId = await ctx.db.insert("tasks", {
      workspaceId: project.workspaceId,
      projectId: args.projectId,
      sprintId: args.sprintId,
      title: trimmedTitle,
      description: args.description?.trim(),
      status: args.status || "todo",
      priority: args.priority ?? "medium",
      storyPoints: args.storyPoints,
      assigneeId: args.assigneeId,
      dueDate: args.dueDate,
      order: maxOrder + 1,
      createdAt: now,
      createdBy: args.userId,
      updatedAt: now,
    });

    // Activity logging
    if (args.sprintId) {
      await ctx.db.insert("sprint_activities", {
        sprintId: args.sprintId,
        workspaceId: project.workspaceId,
        action: "task_added_to_sprint",
        userId: args.userId,
        details: JSON.stringify({ taskId, taskTitle: trimmedTitle, sprintName }),
        createdAt: now,
      });
    }

    const creator = await ctx.db.get(args.userId);
    const creatorName = creator?.name || creator?.email || "A team member";

    // Activity Feed log
    await logActivityHelper(ctx, {
      workspaceId: project.workspaceId,
      userId: args.userId,
      action: "task_created",
      resourceType: "task",
      resourceId: taskId,
      resourceName: trimmedTitle,
      description: `${creatorName} created task "${trimmedTitle}"`,
    });

    // Notify assignee if specified and not self
    if (args.assigneeId && args.assigneeId !== args.userId) {
      await createNotificationHelper(ctx, {
        userId: args.assigneeId,
        workspaceId: project.workspaceId,
        type: "task_assigned",
        title: "You were assigned a task",
        message: `${creatorName} assigned you "${trimmedTitle}"`,
        actionBy: args.userId,
        relatedResourceId: taskId,
        relatedResourceType: "task",
        link: `/tasks`,
        metadata: { projectId: args.projectId, taskId },
      });

      await sendTaskAssignmentEmailIfEnabled(ctx, {
        workspaceId: project.workspaceId,
        projectId: args.projectId,
        taskId,
        assigneeId: args.assigneeId,
        assignerUserId: args.userId,
        taskTitle: trimmedTitle,
        taskDescription: args.description?.trim(),
        priority: args.priority || "medium",
        dueDate: args.dueDate,
      });
    }

    return {
      taskId,
      title: trimmedTitle,
      status: "todo",
      order: maxOrder + 1,
    };
  },
});

/**
 * 2. updateTask
 * Updates task fields and logs activity changes
 */
export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.id("users"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent")
      )
    ),
    storyPoints: v.optional(v.number()),
    assigneeId: v.optional(v.id("users")),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found.");

    await verifyTaskPermission(ctx, task.workspaceId, args.userId, "task:update");

    const now = Date.now();
    const updates: Partial<typeof task> = {
      updatedAt: now,
    };

    if (args.title !== undefined) {
      const trimmed = args.title.trim();
      if (!trimmed) throw new Error("Task title cannot be empty.");
      updates.title = trimmed;
    }
    if (args.description !== undefined) updates.description = args.description.trim() || undefined;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;

    // Handle assignee update & activity
    if (args.assigneeId !== undefined && args.assigneeId !== task.assigneeId) {
      updates.assigneeId = args.assigneeId;

      let assigneeName = "unassigned";
      if (args.assigneeId) {
        const u = await ctx.db.get(args.assigneeId);
        assigneeName = u?.name ?? "user";
      }

      if (task.sprintId) {
        await ctx.db.insert("sprint_activities", {
          sprintId: task.sprintId,
          workspaceId: task.workspaceId,
          action: "task_reassigned",
          userId: args.userId,
          details: JSON.stringify({ taskId: task._id, taskTitle: task.title, assigneeName }),
          createdAt: now,
        });
      }

      // If assigned to a new user and not self, notify & email
      if (args.assigneeId && args.assigneeId !== args.userId) {
        const actor = await ctx.db.get(args.userId);
        const actorName = actor?.name || actor?.email || "A team member";

        await createNotificationHelper(ctx, {
          userId: args.assigneeId,
          workspaceId: task.workspaceId,
          type: "task_assigned",
          title: "You were assigned a task",
          message: `${actorName} assigned you "${updates.title || task.title}"`,
          actionBy: args.userId,
          relatedResourceId: task._id,
          relatedResourceType: "task",
          link: `/tasks`,
          metadata: { projectId: task.projectId, taskId: task._id },
        });

        await sendTaskAssignmentEmailIfEnabled(ctx, {
          workspaceId: task.workspaceId,
          projectId: task.projectId,
          taskId: task._id,
          assigneeId: args.assigneeId,
          assignerUserId: args.userId,
          taskTitle: updates.title || task.title,
          taskDescription:
            updates.description !== undefined
              ? updates.description
              : task.description,
          priority: updates.priority || task.priority,
          dueDate:
            updates.dueDate !== undefined ? updates.dueDate : task.dueDate,
        });
      }
    }

    // Handle story points update & recalculate sprint completedPoints if task is done
    if (args.storyPoints !== undefined && args.storyPoints !== task.storyPoints) {
      updates.storyPoints = args.storyPoints;

      if (task.sprintId && task.status === "done") {
        const sprint = await ctx.db.get(task.sprintId);
        if (sprint) {
          const delta = (args.storyPoints || 0) - (task.storyPoints || 0);
          await ctx.db.patch(task.sprintId, {
            completedPoints: Math.max(0, sprint.completedPoints + delta),
            updatedAt: now,
          });
        }
      }

      if (task.sprintId) {
        await ctx.db.insert("sprint_activities", {
          sprintId: task.sprintId,
          workspaceId: task.workspaceId,
          action: "story_points_updated",
          userId: args.userId,
          details: JSON.stringify({
            taskId: task._id,
            previousPoints: task.storyPoints,
            newPoints: args.storyPoints,
          }),
          createdAt: now,
        });
      }
    }

    await ctx.db.patch(args.taskId, updates);
    return { success: true, taskId: args.taskId };
  },
});

/**
 * 3. assignTaskToUser
 * Quick assignment helper
 */
export const assignTaskToUser = mutation({
  args: {
    taskId: v.id("tasks"),
    assigneeId: v.optional(v.id("users")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found.");

    await verifyTaskPermission(ctx, task.workspaceId, args.userId, "task:update");

    const now = Date.now();
    await ctx.db.patch(args.taskId, {
      assigneeId: args.assigneeId,
      updatedAt: now,
    });

    if (task.sprintId) {
      let assigneeName = "unassigned";
      if (args.assigneeId) {
        const u = await ctx.db.get(args.assigneeId);
        assigneeName = u?.name ?? "user";
      }
      await ctx.db.insert("sprint_activities", {
        sprintId: task.sprintId,
        workspaceId: task.workspaceId,
        action: "task_reassigned",
        userId: args.userId,
        details: JSON.stringify({ taskId: task._id, assigneeName }),
        createdAt: now,
      });
    }

    const actor = await ctx.db.get(args.userId);
    const actorName = actor?.name || actor?.email || "A team member";

    // Activity feed
    await logActivityHelper(ctx, {
      workspaceId: task.workspaceId,
      userId: args.userId,
      action: "task_assigned",
      resourceType: "task",
      resourceId: task._id,
      resourceName: task.title,
      description: args.assigneeId
        ? `${actorName} assigned "${task.title}"`
        : `${actorName} unassigned "${task.title}"`,
    });

    // Notify new assignee if not self
    if (args.assigneeId && args.assigneeId !== args.userId) {
      await createNotificationHelper(ctx, {
        userId: args.assigneeId,
        workspaceId: task.workspaceId,
        type: "task_assigned",
        title: "You were assigned a task",
        message: `${actorName} assigned you "${task.title}"`,
        actionBy: args.userId,
        relatedResourceId: task._id,
        relatedResourceType: "task",
        link: `/tasks`,
        metadata: { projectId: task.projectId, taskId: task._id },
      });

      await sendTaskAssignmentEmailIfEnabled(ctx, {
        workspaceId: task.workspaceId,
        projectId: task.projectId,
        taskId: task._id,
        assigneeId: args.assigneeId,
        assignerUserId: args.userId,
        taskTitle: task.title,
        taskDescription: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
      });
    }

    return { success: true, taskId: args.taskId, assigneeId: args.assigneeId };
  },
});

/**
 * 4. updateTaskStatus
 * Moves task across Kanban columns and auto-updates sprint completedPoints
 */
export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    newStatus: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("in_review"),
      v.literal("done")
    ),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found.");

    await verifyTaskPermission(ctx, task.workspaceId, args.userId, "task:update");

    const oldStatus = task.status;
    if (oldStatus === args.newStatus) {
      return { success: true, taskId: args.taskId, status: task.status };
    }

    const now = Date.now();

    // Auto-update sprint completedPoints if task moves to or from "done"
    if (task.sprintId && task.storyPoints) {
      const sprint = await ctx.db.get(task.sprintId);
      if (sprint) {
        if (args.newStatus === "done" && oldStatus !== "done") {
          await ctx.db.patch(task.sprintId, {
            completedPoints: sprint.completedPoints + task.storyPoints,
            updatedAt: now,
          });
        } else if (oldStatus === "done" && args.newStatus !== "done") {
          await ctx.db.patch(task.sprintId, {
            completedPoints: Math.max(0, sprint.completedPoints - task.storyPoints),
            updatedAt: now,
          });
        }
      }
    }

    await ctx.db.patch(args.taskId, {
      status: args.newStatus,
      updatedAt: now,
    });

    if (task.sprintId) {
      await ctx.db.insert("sprint_activities", {
        sprintId: task.sprintId,
        workspaceId: task.workspaceId,
        action: "task_status_changed",
        userId: args.userId,
        details: JSON.stringify({
          taskId: task._id,
          taskTitle: task.title,
          from: oldStatus,
          to: args.newStatus,
        }),
        createdAt: now,
      });
    }

    const actor = await ctx.db.get(args.userId);
    const actorName = actor?.name || actor?.email || "A team member";

    // Activity feed
    await logActivityHelper(ctx, {
      workspaceId: task.workspaceId,
      userId: args.userId,
      action: "task_status_changed",
      resourceType: "task",
      resourceId: task._id,
      resourceName: task.title,
      description: `${actorName} moved "${task.title}" to ${args.newStatus.replace("_", " ")}`,
      changes: { from: oldStatus, to: args.newStatus },
    });

    // Notify task assignee if someone else changed the status
    if (task.assigneeId && task.assigneeId !== args.userId) {
      await createNotificationHelper(ctx, {
        userId: task.assigneeId,
        workspaceId: task.workspaceId,
        type: "task_status_changed",
        title: "Task status changed",
        message: `${actorName} updated "${task.title}" to ${args.newStatus.replace("_", " ")}`,
        actionBy: args.userId,
        relatedResourceId: task._id,
        relatedResourceType: "task",
        link: `/tasks`,
        metadata: { projectId: task.projectId, taskId: task._id, newStatus: args.newStatus },
      });
    }

    return {
      success: true,
      taskId: args.taskId,
      previousStatus: oldStatus,
      newStatus: args.newStatus,
    };
  },
});

/**
 * 5. moveTaskToSprint
 * Moves task from backlog to sprint (or between sprints)
 */
export const moveTaskToSprint = mutation({
  args: {
    taskId: v.id("tasks"),
    sprintId: v.id("sprints"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found.");

    await verifyTaskPermission(ctx, task.workspaceId, args.userId, "task:update");

    const targetSprint = await ctx.db.get(args.sprintId);
    if (!targetSprint) throw new Error("Target sprint not found.");

    if (targetSprint.status === "closed") {
      throw new Error("Cannot move tasks into a closed sprint.");
    }

    if (task.sprintId === args.sprintId) {
      return { success: true, taskId: args.taskId, sprintId: args.sprintId };
    }

    const now = Date.now();

    // If task was in a different sprint and completed, adjust points
    if (task.sprintId && task.status === "done" && task.storyPoints) {
      const oldSprint = await ctx.db.get(task.sprintId);
      if (oldSprint) {
        await ctx.db.patch(task.sprintId, {
          completedPoints: Math.max(0, oldSprint.completedPoints - task.storyPoints),
          updatedAt: now,
        });
      }
    }

    // If task is completed and moving into target sprint, adjust target sprint points
    if (task.status === "done" && task.storyPoints) {
      await ctx.db.patch(args.sprintId, {
        completedPoints: targetSprint.completedPoints + task.storyPoints,
        updatedAt: now,
      });
    }

    // Determine target sprint order
    const sprintTasks = await ctx.db
      .query("tasks")
      .withIndex("by_sprintId", (q) => q.eq("sprintId", args.sprintId))
      .collect();

    const maxOrder = sprintTasks.reduce((max, t) => Math.max(max, t.order || 0), 0);

    await ctx.db.patch(args.taskId, {
      sprintId: args.sprintId,
      order: maxOrder + 1,
      updatedAt: now,
    });

    await ctx.db.insert("sprint_activities", {
      sprintId: args.sprintId,
      workspaceId: task.workspaceId,
      action: "task_added_to_sprint",
      userId: args.userId,
      details: JSON.stringify({
        taskId: task._id,
        taskTitle: task.title,
        sprintName: targetSprint.name,
      }),
      createdAt: now,
    });

    return { success: true, taskId: args.taskId, sprintId: args.sprintId };
  },
});

/**
 * 6. moveTaskToBacklog
 * Removes task from sprint and returns it to product backlog
 */
export const moveTaskToBacklog = mutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found.");

    await verifyTaskPermission(ctx, task.workspaceId, args.userId, "task:update");

    if (!task.sprintId) {
      return { success: true, taskId: args.taskId, message: "Task is already in backlog." };
    }

    const now = Date.now();
    const oldSprintId = task.sprintId;

    // Adjust sprint completedPoints if task was done
    if (task.status === "done" && task.storyPoints) {
      const oldSprint = await ctx.db.get(oldSprintId);
      if (oldSprint) {
        await ctx.db.patch(oldSprintId, {
          completedPoints: Math.max(0, oldSprint.completedPoints - task.storyPoints),
          updatedAt: now,
        });
      }
    }

    // Calculate max backlog order
    const allProjectTasks = await ctx.db
      .query("tasks")
      .withIndex("by_projectId", (q) => q.eq("projectId", task.projectId))
      .collect();

    const backlogTasks = allProjectTasks.filter((t) => !t.sprintId);
    const maxOrder = backlogTasks.reduce((max, t) => Math.max(max, t.order || 0), 0);

    await ctx.db.patch(args.taskId, {
      sprintId: undefined,
      order: maxOrder + 1,
      updatedAt: now,
    });

    await ctx.db.insert("sprint_activities", {
      sprintId: oldSprintId,
      workspaceId: task.workspaceId,
      action: "task_removed_to_backlog",
      userId: args.userId,
      details: JSON.stringify({ taskId: task._id, taskTitle: task.title }),
      createdAt: now,
    });

    return { success: true, taskId: args.taskId, sprintId: undefined };
  },
});

/**
 * 7. reorderTasksInSprint
 * Sequentially updates order for tasks in a sprint
 */
export const reorderTasksInSprint = mutation({
  args: {
    sprintId: v.id("sprints"),
    taskIds: v.array(v.id("tasks")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) throw new Error("Sprint not found.");

    await verifyTaskPermission(ctx, sprint.workspaceId, args.userId, "task:update");

    const now = Date.now();
    for (let index = 0; index < args.taskIds.length; index++) {
      const taskId = args.taskIds[index];
      const task = await ctx.db.get(taskId);
      if (task && task.sprintId === args.sprintId) {
        await ctx.db.patch(taskId, {
          order: index,
          updatedAt: now,
        });
      }
    }

    return { success: true };
  },
});

/**
 * 8. reorderBacklogTasks
 * Sequentially updates order for backlog tasks
 */
export const reorderBacklogTasks = mutation({
  args: {
    projectId: v.id("projects"),
    taskIds: v.array(v.id("tasks")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found.");

    await verifyTaskPermission(ctx, project.workspaceId, args.userId, "task:update");

    const now = Date.now();
    for (let index = 0; index < args.taskIds.length; index++) {
      const taskId = args.taskIds[index];
      const task = await ctx.db.get(taskId);
      if (task && task.projectId === args.projectId && !task.sprintId) {
        await ctx.db.patch(taskId, {
          order: index,
          updatedAt: now,
        });
      }
    }

    return { success: true };
  },
});

/**
 * 9. deleteTask
 * Only tasks in "todo" status can be deleted
 */
export const deleteTask = mutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found.");

    await verifyTaskPermission(ctx, task.workspaceId, args.userId, "task:delete");

    if (task.status !== "todo") {
      throw new Error(`Cannot delete task in '${task.status}' status. Only tasks in 'todo' status can be deleted.`);
    }

    if (task.sprintId) {
      await ctx.db.insert("sprint_activities", {
        sprintId: task.sprintId,
        workspaceId: task.workspaceId,
        action: "task_deleted",
        userId: args.userId,
        details: JSON.stringify({ taskId: task._id, taskTitle: task.title }),
        createdAt: Date.now(),
      });
    }

    await ctx.db.delete(args.taskId);
    return { success: true };
  },
});

/**
 * 10. reorderTasks
 * Batch updates orders and statuses for Kanban drag-and-drop
 */
export const reorderTasks = mutation({
  args: {
    userId: v.id("users"),
    items: v.array(
      v.object({
        taskId: v.id("tasks"),
        order: v.number(),
        status: v.optional(
          v.union(
            v.literal("todo"),
            v.literal("in_progress"),
            v.literal("in_review"),
            v.literal("done")
          )
        ),
        sprintId: v.optional(v.id("sprints")),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const item of args.items) {
      const task = await ctx.db.get(item.taskId);
      if (!task) continue;

      const patch: Partial<typeof task> = {
        order: item.order,
        updatedAt: now,
      };
      if (item.status) patch.status = item.status;
      if (item.sprintId !== undefined) patch.sprintId = item.sprintId;

      await ctx.db.patch(item.taskId, patch);
    }
    return { success: true };
  },
});
