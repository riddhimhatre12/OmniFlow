import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { createNotificationHelper, logActivityHelper } from "./notifications";

function generateProjectSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "project";
}

/**
 * Helper to verify user has required permission in workspace
 */
async function verifyUserPermission(
  ctx: any,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  requiredPermission: string
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
  if (!role) throw new Error("Role definition not found.");

  if (role.name === "Owner" || role.name === "Admin") return true;

  return (
    role.permissions.includes("*") ||
    role.permissions.includes(requiredPermission) ||
    role.permissions.includes(requiredPermission.replace(":", "_"))
  );
}

/**
 * 1. createProject
 * Gated with permission 'project:create'
 */
export const createProject = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("planning"),
        v.literal("in_progress"),
        v.literal("on_hold"),
        v.literal("completed")
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
    startDate: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    leadId: v.optional(v.id("users")),
    color: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Project name is required.");
    }

    const hasPermission = await verifyUserPermission(
      ctx,
      args.workspaceId,
      args.userId,
      "project:create"
    );
    if (!hasPermission) {
      throw new Error("Permission denied: You do not have permission to create projects in this workspace.");
    }

    // Slug generation unique within workspace
    const baseSlug = generateProjectSlug(trimmedName);
    let finalSlug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await ctx.db
        .query("projects")
        .withIndex("by_workspace_and_slug", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("slug", finalSlug)
        )
        .first();

      if (!existing) break;
      finalSlug = `${baseSlug}-${counter++}`;
    }

    const now = Date.now();

    const projectId = await ctx.db.insert("projects", {
      workspaceId: args.workspaceId,
      name: trimmedName,
      slug: finalSlug,
      description: args.description?.trim(),
      status: args.status ?? "planning",
      priority: args.priority ?? "medium",
      startDate: args.startDate,
      dueDate: args.dueDate,
      leadId: args.leadId ?? args.userId,
      color: args.color ?? "#6366f1",
      createdAt: now,
      updatedAt: now,
    });

    // Touch workspace updatedAt
    await ctx.db.patch(args.workspaceId, {
      updatedAt: now,
    });

    const creator = await ctx.db.get(args.userId);
    const creatorName = creator?.name || creator?.email || "A team member";

    // Activity feed log
    await logActivityHelper(ctx, {
      workspaceId: args.workspaceId,
      userId: args.userId,
      action: "project_created",
      resourceType: "project",
      resourceId: projectId,
      resourceName: trimmedName,
      description: `${creatorName} created project "${trimmedName}"`,
    });

    // Notify project lead if assigned and not creator
    if (args.leadId && args.leadId !== args.userId) {
      await createNotificationHelper(ctx, {
        userId: args.leadId,
        workspaceId: args.workspaceId,
        type: "project_created",
        title: "Assigned as Project Lead",
        message: `${creatorName} designated you as the lead for project "${trimmedName}"`,
        actionBy: args.userId,
        relatedResourceId: projectId,
        relatedResourceType: "project",
        link: `/projects`,
        metadata: { projectId },
      });
    }

    return {
      projectId,
      name: trimmedName,
      slug: finalSlug,
      createdAt: now,
    };
  },
});

/**
 * 2. getWorkspaceProjects
 * Query all projects for a workspace with lead details
 */
export const getWorkspaceProjects = query({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.optional(v.union(v.id("users"), v.string())),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rawProjects = await ctx.db
      .query("projects")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    let filtered = rawProjects;

    // Filter by status if provided
    if (args.status && args.status !== "all") {
      filtered = filtered.filter((p) => p.status === args.status);
    }

    // Filter by search keyword
    if (args.search && args.search.trim()) {
      const q = args.search.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Enrich with lead user info
    const enriched = [];
    for (const project of filtered) {
      let lead = null;
      if (project.leadId) {
        const leadUser = await ctx.db.get(project.leadId);
        if (leadUser) {
          lead = {
            id: leadUser._id,
            name: leadUser.name,
            email: leadUser.email,
            avatar: leadUser.avatar,
          };
        }
      }

      enriched.push({
        id: project._id,
        workspaceId: project.workspaceId,
        name: project.name,
        slug: project.slug,
        description: project.description,
        status: project.status,
        priority: project.priority,
        startDate: project.startDate,
        dueDate: project.dueDate,
        color: project.color ?? "#6366f1",
        lead,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      });
    }

    // Sort by updatedAt descending
    enriched.sort((a, b) => b.updatedAt - a.updatedAt);
    return enriched;
  },
});

/**
 * 3. getProjectDetails
 */
export const getProjectDetails = query({
  args: {
    projectId: v.id("projects"),
    userId: v.optional(v.union(v.id("users"), v.string())),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    let lead = null;
    if (project.leadId) {
      const leadUser = await ctx.db.get(project.leadId);
      if (leadUser) {
        lead = {
          id: leadUser._id,
          name: leadUser.name,
          email: leadUser.email,
          avatar: leadUser.avatar,
        };
      }
    }

    return {
      id: project._id,
      workspaceId: project.workspaceId,
      name: project.name,
      slug: project.slug,
      description: project.description,
      status: project.status,
      priority: project.priority,
      startDate: project.startDate,
      dueDate: project.dueDate,
      color: project.color ?? "#6366f1",
      lead,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  },
});

/**
 * 4. updateProject
 * Gated with permission 'project:update'
 */
export const updateProject = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("planning"),
        v.literal("in_progress"),
        v.literal("on_hold"),
        v.literal("completed")
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
    startDate: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    leadId: v.optional(v.id("users")),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found.");

    const hasPermission = await verifyUserPermission(
      ctx,
      project.workspaceId,
      args.userId,
      "project:update"
    );
    if (!hasPermission) {
      throw new Error("Permission denied: You do not have permission to edit this project.");
    }

    const updates: Partial<typeof project> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      const trimmed = args.name.trim();
      if (!trimmed) throw new Error("Project name cannot be empty.");
      updates.name = trimmed;
    }

    if (args.description !== undefined) {
      updates.description = args.description.trim() || undefined;
    }

    if (args.status !== undefined) updates.status = args.status;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.leadId !== undefined) updates.leadId = args.leadId;
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.projectId, updates);
    return { success: true };
  },
});

/**
 * 5. deleteProject
 * Gated with permission 'project:delete'
 */
export const deleteProject = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found.");

    const hasPermission = await verifyUserPermission(
      ctx,
      project.workspaceId,
      args.userId,
      "project:delete"
    );
    if (!hasPermission) {
      throw new Error("Permission denied: You do not have permission to delete this project.");
    }

    await ctx.db.delete(args.projectId);
    return { success: true };
  },
});
