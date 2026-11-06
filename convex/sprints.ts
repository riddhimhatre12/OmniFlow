import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { createNotificationHelper, logActivityHelper } from "./notifications";

/**
 * Permission verification helper for Sprint operations
 */
async function verifySprintPermission(
  ctx: any,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  requiredPermission: "sprint:create" | "sprint:update" | "sprint:delete" | "sprint:read" | "admin"
): Promise<boolean> {
  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) throw new Error("Workspace not found.");

  // Workspace owner always has all permissions
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

  if (role.name === "Owner") return true;
  if (role.name === "Admin") return true;

  if (requiredPermission === "admin") {
    throw new Error("Access denied: Only Workspace Owner or Admin can perform this action.");
  }

  const perms: string[] = role.permissions || [];
  if (perms.includes("*") || perms.includes("all")) return true;

  const altPerm = requiredPermission.replace("sprint:", "project:");
  if (
    perms.includes(requiredPermission) ||
    perms.includes(requiredPermission.replace(":", "_")) ||
    perms.includes(altPerm) ||
    perms.includes(altPerm.replace(":", "_"))
  ) {
    return true;
  }

  throw new Error(`Access denied: Missing ${requiredPermission} permission.`);
}

/* =========================================================================
 * QUERIES (read-only)
 * ========================================================================= */

/**
 * 1. getProjectSprints(projectId, includeArchived = false)
 * - Returns all sprints in a project
 * - Filtered by status if includeArchived = false (excludes closed sprints)
 * - Sorted by: active first, then by startDate descending, then by order
 * - Includes per-sprint: taskCount, completedCount, totalPoints, completedPoints, progress
 */
export const getProjectSprints = query({
  args: {
    projectId: v.id("projects"),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const rawSprints = await ctx.db
      .query("sprints")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    let filtered = rawSprints;
    if (!args.includeArchived) {
      filtered = filtered.filter((s) => s.status !== "closed");
    }

    const enriched = [];
    for (const sprint of filtered) {
      const sprintTasks = await ctx.db
        .query("tasks")
        .withIndex("by_sprintId", (q) => q.eq("sprintId", sprint._id))
        .collect();

      const taskCount = sprintTasks.length;
      const completedCount = sprintTasks.filter((t) => t.status === "done").length;
      const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const completedPoints = sprintTasks.reduce(
        (sum, t) => sum + (t.status === "done" ? t.storyPoints || 0 : 0),
        0
      );

      const progress =
        totalPoints > 0
          ? Math.round((completedPoints / totalPoints) * 100)
          : taskCount > 0
          ? Math.round((completedCount / taskCount) * 100)
          : 0;

      enriched.push({
        sprintId: sprint._id,
        _id: sprint._id,
        projectId: sprint.projectId,
        workspaceId: sprint.workspaceId,
        name: sprint.name,
        description: sprint.description,
        status: sprint.status,
        goal: sprint.goal,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        capacity: sprint.capacity,
        completedPoints,
        totalPoints,
        taskCount,
        completedCount,
        progress,
        order: sprint.order,
        createdAt: sprint.createdAt,
        updatedAt: sprint.updatedAt,
      });
    }

    // Sort order: "active" first, then startDate descending, then order ascending
    enriched.sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (b.status === "active" && a.status !== "active") return 1;

      if (a.startDate && b.startDate) {
        return b.startDate - a.startDate;
      }
      return a.order - b.order;
    });

    return enriched;
  },
});

/**
 * 2. getActiveSprint(projectId)
 * - Returns currently active sprint for the project, or null if none
 * - Includes full sprint details + task count + story points
 */
export const getActiveSprint = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const activeSprint = await ctx.db
      .query("sprints")
      .withIndex("by_project_and_status", (q) =>
        q.eq("projectId", args.projectId).eq("status", "active")
      )
      .first();

    if (!activeSprint) return null;

    const sprintTasks = await ctx.db
      .query("tasks")
      .withIndex("by_sprintId", (q) => q.eq("sprintId", activeSprint._id))
      .collect();

    const taskCount = sprintTasks.length;
    const completedCount = sprintTasks.filter((t) => t.status === "done").length;
    const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedPoints = sprintTasks.reduce(
      (sum, t) => sum + (t.status === "done" ? t.storyPoints || 0 : 0),
      0
    );

    const progress =
      totalPoints > 0
        ? Math.round((completedPoints / totalPoints) * 100)
        : taskCount > 0
        ? Math.round((completedCount / taskCount) * 100)
        : 0;

    return {
      ...activeSprint,
      sprintId: activeSprint._id,
      taskCount,
      completedCount,
      totalPoints,
      completedPoints,
      progress,
    };
  },
});

/**
 * 3. getSprintDetails(sprintId, userId?)
 * - Full sprint object with status counts, story point velocity, and creator info
 * - Verifies caller has workspace access
 */
export const getSprintDetails = query({
  args: {
    sprintId: v.id("sprints"),
    userId: v.optional(v.union(v.id("users"), v.string())),
  },
  handler: async (ctx, args) => {
    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) return null;

    if (args.userId) {
      await verifySprintPermission(
        ctx,
        sprint.workspaceId,
        args.userId as Id<"users">,
        "sprint:read"
      );
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_sprintId", (q) => q.eq("sprintId", sprint._id))
      .collect();

    const statusCounts = {
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      in_review: tasks.filter((t) => t.status === "in_review").length,
      done: tasks.filter((t) => t.status === "done").length,
    };

    const totalStoryPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedStoryPoints = tasks.reduce(
      (sum, t) => sum + (t.status === "done" ? t.storyPoints || 0 : 0),
      0
    );

    const creator = await ctx.db.get(sprint.createdBy);

    return {
      sprintId: sprint._id,
      _id: sprint._id,
      projectId: sprint.projectId,
      workspaceId: sprint.workspaceId,
      name: sprint.name,
      description: sprint.description,
      status: sprint.status,
      goal: sprint.goal,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      capacity: sprint.capacity,
      completedPoints: completedStoryPoints,
      totalPoints: totalStoryPoints,
      taskCount: tasks.length,
      statusCounts,
      createdBy: creator
        ? {
            id: creator._id,
            name: creator.name,
            email: creator.email,
            avatar: creator.avatar,
          }
        : null,
      createdAt: sprint.createdAt,
      updatedAt: sprint.updatedAt,
    };
  },
});

/**
 * 4. getProjectBacklog(projectId)
 * - Returns all tasks NOT assigned to any sprint (sprintId == undefined / null)
 * - Sorted by: priority (urgent -> high -> medium -> low), then createdAt descending
 */
export const getProjectBacklog = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    const backlogTasks = allTasks.filter((t) => !t.sprintId);

    const priorityWeight: Record<string, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const enriched = [];
    for (const task of backlogTasks) {
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
        assignee,
        dueDate: task.dueDate,
        order: task.order,
        createdAt: task.createdAt,
      });
    }

    enriched.sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return b.createdAt - a.createdAt;
    });

    return enriched;
  },
});

/**
 * 5. getSprintTasks(sprintId)
 * - Returns all tasks in a sprint grouped by status:
 *   { todo: [...], in_progress: [...], in_review: [...], done: [...] }
 * - Sorted within each status by order field for drag-and-drop
 */
export const getSprintTasks = query({
  args: {
    sprintId: v.id("sprints"),
  },
  handler: async (ctx, args) => {
    const rawTasks = await ctx.db
      .query("tasks")
      .withIndex("by_sprintId", (q) => q.eq("sprintId", args.sprintId))
      .collect();

    const grouped: {
      todo: any[];
      in_progress: any[];
      in_review: any[];
      done: any[];
    } = {
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    };

    for (const task of rawTasks) {
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

      const item = {
        taskId: task._id,
        _id: task._id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        storyPoints: task.storyPoints,
        assignee,
        dueDate: task.dueDate,
        order: task.order,
        createdAt: task.createdAt,
      };

      if (task.status in grouped) {
        grouped[task.status as keyof typeof grouped].push(item);
      } else {
        grouped.todo.push(item);
      }
    }

    // Sort within each status by order field
    grouped.todo.sort((a, b) => a.order - b.order);
    grouped.in_progress.sort((a, b) => a.order - b.order);
    grouped.in_review.sort((a, b) => a.order - b.order);
    grouped.done.sort((a, b) => a.order - b.order);

    return grouped;
  },
});

/**
 * 6. getSprintBurndown(sprintId)
 * - Returns data for burndown chart: days elapsed, tasks remaining, ideal line
 */
export const getSprintBurndown = query({
  args: {
    sprintId: v.id("sprints"),
  },
  handler: async (ctx, args) => {
    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) return null;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_sprintId", (q) => q.eq("sprintId", args.sprintId))
      .collect();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "done").length;
    const tasksRemaining = totalTasks - completedTasks;

    const totalStoryPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedStoryPoints = tasks.reduce(
      (sum, t) => sum + (t.status === "done" ? t.storyPoints || 0 : 0),
      0
    );
    const baselinePoints = sprint.capacity || totalStoryPoints;
    const pointsRemaining = Math.max(0, baselinePoints - completedStoryPoints);

    // Calculate time metrics
    const now = Date.now();
    const startDate = sprint.startDate || sprint.createdAt;
    const defaultDurationMs = 14 * 24 * 60 * 60 * 1000;
    const endDate = sprint.endDate || startDate + defaultDurationMs;

    const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    const daysElapsed = Math.min(
      totalDays,
      Math.max(0, Math.floor((now - startDate) / (1000 * 60 * 60 * 24)))
    );
    const daysRemaining = Math.max(0, totalDays - daysElapsed);

    const completionPercentage =
      baselinePoints > 0
        ? Math.round((completedStoryPoints / baselinePoints) * 100)
        : totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

    // Daily burndown timeline projection
    const dailyBurndown = [];
    for (let day = 0; day <= totalDays; day++) {
      const idealPoints = Math.max(0, Math.round(baselinePoints - (baselinePoints / totalDays) * day));
      const isPastOrToday = day <= daysElapsed;

      dailyBurndown.push({
        day,
        idealPoints,
        pointsRemaining: isPastOrToday ? pointsRemaining : null,
        tasksRemaining: isPastOrToday ? tasksRemaining : null,
      });
    }

    return {
      sprintId: sprint._id,
      name: sprint.name,
      totalStoryPoints,
      completedStoryPoints,
      pointsRemaining,
      totalTasks,
      completedTasks,
      tasksRemaining,
      completionPercentage,
      totalDays,
      daysElapsed,
      daysRemaining,
      timeline: dailyBurndown,
    };
  },
});

/* =========================================================================
 * MUTATIONS (write)
 * ========================================================================= */

/**
 * 1. createSprint
 * Creates a new sprint in planning mode
 */
export const createSprint = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    goal: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    capacity: v.optional(v.number()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found.");

    await verifySprintPermission(ctx, project.workspaceId, args.userId, "sprint:create");

    const trimmedName = args.name.trim();
    if (!trimmedName) throw new Error("Sprint name cannot be empty.");

    if (args.startDate && args.endDate && args.startDate >= args.endDate) {
      throw new Error("Invalid dates: Sprint start date must precede target end date.");
    }

    // Determine next sequential order for this project's sprints
    const existingSprints = await ctx.db
      .query("sprints")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    const maxOrder = existingSprints.reduce((max, s) => Math.max(max, s.order || 0), 0);
    const now = Date.now();

    const sprintId = await ctx.db.insert("sprints", {
      workspaceId: project.workspaceId,
      projectId: args.projectId,
      name: trimmedName,
      description: args.description?.trim(),
      status: "planning",
      goal: args.goal?.trim(),
      startDate: args.startDate,
      endDate: args.endDate,
      capacity: args.capacity,
      completedPoints: 0,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
      createdBy: args.userId,
    });

    // Log sprint creation activity
    await ctx.db.insert("sprint_activities", {
      sprintId,
      workspaceId: project.workspaceId,
      action: "sprint_created",
      userId: args.userId,
      details: JSON.stringify({ sprintName: trimmedName }),
      createdAt: now,
    });

    return {
      sprintId,
      projectId: args.projectId,
      name: trimmedName,
      status: "planning",
      order: maxOrder + 1,
    };
  },
});

/**
 * 2. updateSprint
 * Updates sprint metadata (only allowed when sprint status is "planning")
 */
export const updateSprint = mutation({
  args: {
    sprintId: v.id("sprints"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    goal: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    capacity: v.optional(v.number()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) throw new Error("Sprint not found.");

    await verifySprintPermission(ctx, sprint.workspaceId, args.userId, "sprint:update");

    // Restrict editing if sprint is closed
    if (sprint.status !== "planning") {
      throw new Error(`Cannot modify sprint details while sprint is in '${sprint.status}' status. Only planning sprints can be modified.`);
    }

    const start = args.startDate !== undefined ? args.startDate : sprint.startDate;
    const end = args.endDate !== undefined ? args.endDate : sprint.endDate;
    if (start && end && start >= end) {
      throw new Error("Invalid dates: Sprint start date must precede target end date.");
    }

    const now = Date.now();
    const updates: Partial<typeof sprint> = {
      updatedAt: now,
    };

    if (args.name !== undefined) {
      const trimmed = args.name.trim();
      if (!trimmed) throw new Error("Sprint name cannot be empty.");
      updates.name = trimmed;
    }
    if (args.description !== undefined) updates.description = args.description.trim() || undefined;
    if (args.goal !== undefined) updates.goal = args.goal.trim() || undefined;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    if (args.endDate !== undefined) updates.endDate = args.endDate;
    if (args.capacity !== undefined) updates.capacity = args.capacity;

    await ctx.db.patch(args.sprintId, updates);

    await ctx.db.insert("sprint_activities", {
      sprintId: args.sprintId,
      workspaceId: sprint.workspaceId,
      action: "sprint_updated",
      userId: args.userId,
      details: JSON.stringify({ updatedFields: Object.keys(updates) }),
      createdAt: now,
    });

    return { success: true, sprintId: args.sprintId };
  },
});

/**
 * 3. startSprint(sprintId, startDate = now)
 * Validates status = "planning", changes to "active", auto-records dates
 */
export const startSprint = mutation({
  args: {
    sprintId: v.id("sprints"),
    startDate: v.optional(v.number()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) throw new Error("Sprint not found.");

    await verifySprintPermission(ctx, sprint.workspaceId, args.userId, "sprint:update");

    if (sprint.status !== "planning") {
      throw new Error(`Cannot start sprint: Sprint is currently in '${sprint.status}' status. Only planning sprints can be started.`);
    }

    const now = Date.now();
    const effectiveStart = args.startDate || now;
    // Default 2-week sprint end date if not already specified
    const effectiveEnd = sprint.endDate || effectiveStart + 14 * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.sprintId, {
      status: "active",
      startDate: effectiveStart,
      endDate: effectiveEnd,
      updatedAt: now,
    });

    await ctx.db.insert("sprint_activities", {
      sprintId: args.sprintId,
      workspaceId: sprint.workspaceId,
      action: "sprint_started",
      userId: args.userId,
      details: JSON.stringify({ startDate: effectiveStart, endDate: effectiveEnd }),
      createdAt: now,
    });

    const actor = await ctx.db.get(args.userId);
    const actorName = actor?.name || actor?.email || "Team lead";

    // Activity feed
    await logActivityHelper(ctx, {
      workspaceId: sprint.workspaceId,
      userId: args.userId,
      action: "sprint_started",
      resourceType: "sprint",
      resourceId: args.sprintId,
      resourceName: sprint.name,
      description: `${actorName} started sprint "${sprint.name}"`,
    });

    // Notify all sprint assignees
    const sprintTasks = await ctx.db
      .query("tasks")
      .withIndex("by_sprintId", (q) => q.eq("sprintId", args.sprintId))
      .collect();

    const assigneeCounts = new Map<string, number>();
    for (const t of sprintTasks) {
      if (t.assigneeId) {
        assigneeCounts.set(t.assigneeId, (assigneeCounts.get(t.assigneeId) || 0) + 1);
      }
    }

    for (const [assigneeIdStr, count] of assigneeCounts.entries()) {
      const assigneeId = assigneeIdStr as Id<"users">;
      if (assigneeId !== args.userId) {
        await createNotificationHelper(ctx, {
          userId: assigneeId,
          workspaceId: sprint.workspaceId,
          type: "sprint_started",
          title: "Sprint started",
          message: `Sprint "${sprint.name}" has started. You have ${count} task${count > 1 ? "s" : ""} assigned.`,
          actionBy: args.userId,
          relatedResourceId: args.sprintId,
          relatedResourceType: "sprint",
          link: `/projects/${sprint.projectId}/sprints/planning`,
          metadata: { sprintId: args.sprintId, projectId: sprint.projectId },
        });
      }
    }

    return {
      sprintId: args.sprintId,
      status: "active",
      startDate: effectiveStart,
      endDate: effectiveEnd,
    };
  },
});

/**
 * 4. closeSprint(sprintId)
 * Validates status = "active", moves incomplete tasks back to backlog, sets status = "closed"
 */
export const closeSprint = mutation({
  args: {
    sprintId: v.id("sprints"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) throw new Error("Sprint not found.");

    await verifySprintPermission(ctx, sprint.workspaceId, args.userId, "sprint:update");

    if (sprint.status !== "active") {
      throw new Error(`Cannot close sprint: Sprint is in '${sprint.status}' status. Only active sprints can be closed.`);
    }

    const now = Date.now();

    // Query tasks in sprint
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_sprintId", (q) => q.eq("sprintId", args.sprintId))
      .collect();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "done");
    const incompleteTasks = tasks.filter((t) => t.status !== "done");

    const completedPoints = completedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    // Reassign all incomplete tasks back to product backlog (sprintId = undefined)
    for (const incTask of incompleteTasks) {
      await ctx.db.patch(incTask._id, {
        sprintId: undefined,
        updatedAt: now,
      });
    }

    // Update sprint to closed with completion stats
    await ctx.db.patch(args.sprintId, {
      status: "closed",
      endDate: now,
      completedPoints,
      updatedAt: now,
    });

    const completionRate =
      totalPoints > 0
        ? Math.round((completedPoints / totalPoints) * 100)
        : totalTasks > 0
        ? Math.round((completedTasks.length / totalTasks) * 100)
        : 100;

    await ctx.db.insert("sprint_activities", {
      sprintId: args.sprintId,
      workspaceId: sprint.workspaceId,
      action: "sprint_completed",
      userId: args.userId,
      details: JSON.stringify({
        totalTasks,
        completedTasks: completedTasks.length,
        incompleteReturnedToBacklog: incompleteTasks.length,
        completedPoints,
        totalPoints,
        completionRate: `${completionRate}%`,
      }),
      createdAt: now,
    });

    const actor = await ctx.db.get(args.userId);
    const actorName = actor?.name || actor?.email || "Team lead";

    // Activity feed
    await logActivityHelper(ctx, {
      workspaceId: sprint.workspaceId,
      userId: args.userId,
      action: "sprint_closed",
      resourceType: "sprint",
      resourceId: args.sprintId,
      resourceName: sprint.name,
      description: `${actorName} completed sprint "${sprint.name}" (${completedPoints}/${totalPoints} pts, ${completionRate}% completed)`,
    });

    // Notify all participants in sprint
    const uniqueAssignees = Array.from(new Set(tasks.map((t) => t.assigneeId).filter(Boolean))) as Id<"users">[];
    for (const assigneeId of uniqueAssignees) {
      if (assigneeId !== args.userId) {
        await createNotificationHelper(ctx, {
          userId: assigneeId,
          workspaceId: sprint.workspaceId,
          type: "sprint_closed",
          title: "Sprint completed",
          message: `Sprint "${sprint.name}" has completed with ${completedPoints} points completed (${completionRate}%).`,
          actionBy: args.userId,
          relatedResourceId: args.sprintId,
          relatedResourceType: "sprint",
          link: `/projects/${sprint.projectId}/sprints/history`,
          metadata: { sprintId: args.sprintId, projectId: sprint.projectId },
        });
      }
    }

    return {
      sprintId: args.sprintId,
      status: "closed",
      completedPoints,
      totalPoints,
      completionRate,
      tasksReturnedToBacklog: incompleteTasks.length,
    };
  },
});

/**
 * 5. deleteSprint(sprintId)
 * Validates status = "planning" (can't delete active/closed), requires Owner or Admin
 */
export const deleteSprint = mutation({
  args: {
    sprintId: v.id("sprints"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) throw new Error("Sprint not found.");

    // Only Owner or Admin can delete sprints
    await verifySprintPermission(ctx, sprint.workspaceId, args.userId, "admin");

    if (sprint.status !== "planning") {
      throw new Error(`Cannot delete sprint: Sprint is in '${sprint.status}' status. Only planning sprints can be deleted.`);
    }

    const now = Date.now();

    // Reassign any tasks back to backlog
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_sprintId", (q) => q.eq("sprintId", args.sprintId))
      .collect();

    for (const task of tasks) {
      await ctx.db.patch(task._id, {
        sprintId: undefined,
        updatedAt: now,
      });
    }

    // Delete associated sprint activities
    const activities = await ctx.db
      .query("sprint_activities")
      .withIndex("by_sprintId", (q) => q.eq("sprintId", args.sprintId))
      .collect();

    for (const act of activities) {
      await ctx.db.delete(act._id);
    }

    await ctx.db.delete(args.sprintId);
    return { success: true, movedTasksCount: tasks.length };
  },
});

/**
 * 6. updateSprintCapacity(sprintId, capacityPoints)
 * Updates story point capacity for sprint planning
 */
export const updateSprintCapacity = mutation({
  args: {
    sprintId: v.id("sprints"),
    capacity: v.number(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) throw new Error("Sprint not found.");

    await verifySprintPermission(ctx, sprint.workspaceId, args.userId, "sprint:update");

    const now = Date.now();
    await ctx.db.patch(args.sprintId, {
      capacity: args.capacity,
      updatedAt: now,
    });

    await ctx.db.insert("sprint_activities", {
      sprintId: args.sprintId,
      workspaceId: sprint.workspaceId,
      action: "sprint_capacity_updated",
      userId: args.userId,
      details: JSON.stringify({ capacity: args.capacity }),
      createdAt: now,
    });

    return { sprintId: args.sprintId, capacity: args.capacity };
  },
});

/**
 * 7. getSprintActivities(sprintId)
 * Query activity history for a sprint
 */
export const getSprintActivities = query({
  args: {
    sprintId: v.id("sprints"),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("sprint_activities")
      .withIndex("by_sprintId", (q) => q.eq("sprintId", args.sprintId))
      .collect();

    const enriched = [];
    for (const act of activities) {
      const user = await ctx.db.get(act.userId);
      enriched.push({
        ...act,
        userName: user?.name ?? "Team Member",
        userAvatar: user?.avatar,
      });
    }

    enriched.sort((a, b) => b.createdAt - a.createdAt);
    return enriched;
  },
});

/**
 * 8. saveSprintRetrospective
 * Saves sprint retrospective analysis in sprint_activities
 */
export const saveSprintRetrospective = mutation({
  args: {
    sprintId: v.id("sprints"),
    userId: v.id("users"),
    summary: v.optional(v.string()),
    achievements: v.optional(v.string()),
    challenges: v.optional(v.string()),
    improvements: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) throw new Error("Sprint not found.");

    await verifySprintPermission(ctx, sprint.workspaceId, args.userId, "sprint:update");

    const now = Date.now();
    const details = JSON.stringify({
      summary: args.summary || "",
      achievements: args.achievements || "",
      challenges: args.challenges || "",
      improvements: args.improvements || "",
      updatedAt: now,
    });

    await ctx.db.insert("sprint_activities", {
      sprintId: args.sprintId,
      workspaceId: sprint.workspaceId,
      action: "sprint_retrospective",
      userId: args.userId,
      details,
      createdAt: now,
    });

    return { success: true };
  },
});

/**
 * 9. getSprintRetrospective
 * Returns the most recent retrospective record for a sprint
 */
export const getSprintRetrospective = query({
  args: {
    sprintId: v.id("sprints"),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("sprint_activities")
      .withIndex("by_sprintId", (q) => q.eq("sprintId", args.sprintId))
      .collect();

    const retros = activities
      .filter((a) => a.action === "sprint_retrospective")
      .sort((a, b) => b.createdAt - a.createdAt);

    if (retros.length === 0) return null;

    try {
      const parsed = JSON.parse(retros[0].details || "{}");
      return {
        ...parsed,
        createdAt: retros[0].createdAt,
      };
    } catch {
      return null;
    }
  },
});

