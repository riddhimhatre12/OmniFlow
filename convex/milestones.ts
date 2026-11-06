import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { logActivityHelper } from "./notifications";

/* =========================================================================
 * QUERIES
 * ========================================================================= */

/**
 * 1. getProjectMilestones(projectId)
 * Returns all milestones for a project sorted by targetDate ascending,
 * enriched with linked sprints and calculated progress metrics.
 */
export const getProjectMilestones = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const milestones = await ctx.db
      .query("project_milestones")
      .withIndex("by_project_and_targetDate", (q) => q.eq("projectId", args.projectId))
      .collect();

    return await Promise.all(
      milestones.map(async (m) => {
        let totalPoints = 0;
        let completedPoints = 0;
        const linkedSprintDetails = [];

        for (const sId of m.linkedSprints || []) {
          const sprint = await ctx.db.get(sId);
          if (sprint) {
            linkedSprintDetails.push({
              _id: sprint._id,
              name: sprint.name,
              status: sprint.status,
              startDate: sprint.startDate,
              endDate: sprint.endDate,
              totalPoints: sprint.capacity || 0,
              completedPoints: sprint.completedPoints || 0,
            });
            totalPoints += sprint.capacity || 0;
            completedPoints += sprint.completedPoints || 0;
          }
        }

        const progressPercent =
          totalPoints > 0 ? Math.min(100, Math.round((completedPoints / totalPoints) * 100)) : 0;

        return {
          ...m,
          milestoneId: m._id,
          totalPoints,
          completedPoints,
          progressPercent,
          sprints: linkedSprintDetails,
          linkedSprintsCount: (m.linkedSprints || []).length,
        };
      })
    );
  },
});

/**
 * 2. getMilestoneDetails(milestoneId)
 * Returns a full milestone object with linked sprint details and creator metadata.
 */
export const getMilestoneDetails = query({
  args: {
    milestoneId: v.id("project_milestones"),
  },
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) return null;

    const project = await ctx.db.get(milestone.projectId);
    const creator = await ctx.db.get(milestone.createdBy);

    let totalPoints = 0;
    let completedPoints = 0;
    const linkedSprints = [];

    for (const sId of milestone.linkedSprints || []) {
      const sprint = await ctx.db.get(sId);
      if (sprint) {
        linkedSprints.push(sprint);
        totalPoints += sprint.capacity || 0;
        completedPoints += sprint.completedPoints || 0;
      }
    }

    const progressPercent =
      totalPoints > 0 ? Math.min(100, Math.round((completedPoints / totalPoints) * 100)) : 0;

    return {
      ...milestone,
      milestoneId: milestone._id,
      projectName: project?.name || "Project",
      creatorName: creator?.name || "Team Member",
      linkedSprints,
      totalPoints,
      completedPoints,
      progressPercent,
    };
  },
});

/**
 * 3. getMilestoneProgress(milestoneId)
 * Returns story point and completion percentage calculations for a milestone.
 */
export const getMilestoneProgress = query({
  args: {
    milestoneId: v.id("project_milestones"),
  },
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) return { totalPoints: 0, completedPoints: 0, progressPercent: 0, linkedSprints: [] };

    let totalPoints = 0;
    let completedPoints = 0;
    const sprints = [];

    for (const sId of milestone.linkedSprints || []) {
      const sprint = await ctx.db.get(sId);
      if (sprint) {
        sprints.push({
          id: sprint._id,
          name: sprint.name,
          status: sprint.status,
          totalPoints: sprint.capacity || 0,
          completedPoints: sprint.completedPoints || 0,
        });
        totalPoints += sprint.capacity || 0;
        completedPoints += sprint.completedPoints || 0;
      }
    }

    const progressPercent =
      totalPoints > 0 ? Math.min(100, Math.round((completedPoints / totalPoints) * 100)) : 0;

    return {
      totalPoints,
      completedPoints,
      progressPercent,
      linkedSprints: sprints,
    };
  },
});

/**
 * 4. getUpcomingMilestones(workspaceId, limit = 5)
 * Returns upcoming milestones across all projects in the workspace for dashboard widgets.
 */
export const getUpcomingMilestones = query({
  args: {
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;

    const milestones = await ctx.db
      .query("project_milestones")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.neq(q.field("status"), "completed"))
      .order("asc")
      .take(limit);

    return await Promise.all(
      milestones.map(async (m) => {
        const project = await ctx.db.get(m.projectId);

        let totalPoints = 0;
        let completedPoints = 0;
        for (const sId of m.linkedSprints || []) {
          const sprint = await ctx.db.get(sId);
          if (sprint) {
            totalPoints += sprint.capacity || 0;
            completedPoints += sprint.completedPoints || 0;
          }
        }

        const progressPercent =
          totalPoints > 0 ? Math.min(100, Math.round((completedPoints / totalPoints) * 100)) : 0;

        return {
          ...m,
          milestoneId: m._id,
          projectName: project?.name || "Project",
          progressPercent,
        };
      })
    );
  },
});

/* =========================================================================
 * MUTATIONS
 * ========================================================================= */

/**
 * 1. createMilestone(...)
 * Creates a new project milestone and logs activity.
 */
export const createMilestone = mutation({
  args: {
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    targetDate: v.number(),
    linkedSprints: v.optional(v.array(v.id("sprints"))),
  },
  handler: async (ctx, args) => {
    const trimmed = args.name.trim();
    if (!trimmed) throw new Error("Milestone name cannot be empty.");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found.");

    const user = await ctx.db.get(args.userId);
    const creatorName = user?.name || "A team member";

    const milestoneId = await ctx.db.insert("project_milestones", {
      projectId: args.projectId,
      workspaceId: args.workspaceId,
      name: trimmed,
      description: args.description?.trim(),
      targetDate: args.targetDate,
      status: "planned",
      linkedSprints: args.linkedSprints || [],
      createdAt: Date.now(),
      createdBy: args.userId,
    });

    await logActivityHelper(ctx, {
      workspaceId: args.workspaceId,
      userId: args.userId,
      action: "milestone_created",
      resourceType: "project",
      resourceId: args.projectId,
      resourceName: project.name,
      description: `${creatorName} created milestone "${trimmed}" in project "${project.name}"`,
      changes: { milestoneId, name: trimmed, targetDate: args.targetDate },
    });

    return { milestoneId, name: trimmed };
  },
});

/**
 * 2. updateMilestone(...)
 * Updates milestone fields and logs activity if status changed.
 */
export const updateMilestone = mutation({
  args: {
    milestoneId: v.id("project_milestones"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    targetDate: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("planned"),
        v.literal("on_track"),
        v.literal("at_risk"),
        v.literal("completed")
      )
    ),
    linkedSprints: v.optional(v.array(v.id("sprints"))),
  },
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) throw new Error("Milestone not found.");

    const patch: any = {};
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.description !== undefined) patch.description = args.description?.trim();
    if (args.targetDate !== undefined) patch.targetDate = args.targetDate;
    if (args.linkedSprints !== undefined) patch.linkedSprints = args.linkedSprints;

    if (args.status !== undefined) {
      patch.status = args.status;
      if (args.status === "completed" && !milestone.completedDate) {
        patch.completedDate = Date.now();
      }
    }

    await ctx.db.patch(args.milestoneId, patch);

    return { success: true, milestoneId: args.milestoneId };
  },
});

/**
 * 3. linkSprintToMilestone(milestoneId, sprintId)
 * Connects an agile sprint to a milestone.
 */
export const linkSprintToMilestone = mutation({
  args: {
    milestoneId: v.id("project_milestones"),
    sprintId: v.id("sprints"),
  },
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) throw new Error("Milestone not found.");

    const currentSprints = milestone.linkedSprints || [];
    if (!currentSprints.includes(args.sprintId)) {
      const updated = [...currentSprints, args.sprintId];
      await ctx.db.patch(args.milestoneId, {
        linkedSprints: updated,
      });
    }

    return { success: true, milestoneId: args.milestoneId };
  },
});

/**
 * 4. unlinkSprintFromMilestone(milestoneId, sprintId)
 * Removes a sprint association from a milestone.
 */
export const unlinkSprintFromMilestone = mutation({
  args: {
    milestoneId: v.id("project_milestones"),
    sprintId: v.id("sprints"),
  },
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) throw new Error("Milestone not found.");

    const currentSprints = milestone.linkedSprints || [];
    const updated = currentSprints.filter((id) => id !== args.sprintId);

    await ctx.db.patch(args.milestoneId, {
      linkedSprints: updated,
    });

    return { success: true, milestoneId: args.milestoneId };
  },
});

/**
 * 5. completeMilestone(milestoneId)
 * Sets milestone status to completed and records completion timestamp.
 */
export const completeMilestone = mutation({
  args: {
    milestoneId: v.id("project_milestones"),
  },
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) throw new Error("Milestone not found.");

    const now = Date.now();
    await ctx.db.patch(args.milestoneId, {
      status: "completed",
      completedDate: now,
    });

    return { success: true, milestoneId: args.milestoneId, completedDate: now };
  },
});

/**
 * 6. deleteMilestone(milestoneId)
 * Deletes a project milestone.
 */
export const deleteMilestone = mutation({
  args: {
    milestoneId: v.id("project_milestones"),
  },
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) throw new Error("Milestone not found.");

    await ctx.db.delete(args.milestoneId);
    return { success: true };
  },
});
