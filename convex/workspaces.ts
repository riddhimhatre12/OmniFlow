import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Predefined permission catalog matching RBAC specification
export const DEFAULT_PERMISSIONS = {
  OWNER: [
    "workspace:manage",
    "workspace:delete",
    "project:create",
    "project:read",
    "project:update",
    "project:delete",
    "task:create",
    "task:read",
    "task:update",
    "task:delete",
    "member:invite",
    "member:remove",
    "member:update_role",
    "role:manage",
    "report:view",
  ],
  ADMIN: [
    "workspace:manage",
    "project:create",
    "project:read",
    "project:update",
    "project:delete",
    "task:create",
    "task:read",
    "task:update",
    "task:delete",
    "member:invite",
    "member:remove",
    "member:update_role",
    "report:view",
  ],
  MANAGER: [
    "project:create",
    "project:read",
    "project:update",
    "task:create",
    "task:read",
    "task:update",
    "task:delete",
    "member:invite",
    "report:view",
  ],
  MEMBER: [
    "project:read",
    "task:create",
    "task:read",
    "task:update",
    "report:view",
  ],
  VIEWER: [
    "project:read",
    "task:read",
    "report:view",
  ],
};

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "workspace";
}

/* =========================================================================
 * QUERIES (read-only)
 * ========================================================================= */

/**
 * 1. listUserWorkspaces(userId)
 * Returns array of workspaces where user is a member
 * Includes: workspaceId, name, slug, avatar, ownerId, member role, memberCount
 * Sorted by updatedAt descending
 */
export const listUserWorkspaces = query({
  args: { userId: v.optional(v.union(v.id("users"), v.string())) },
  handler: async (ctx, args) => {
    if (!args.userId) {
      return [];
    }

    let validUserId: Id<"users">;
    try {
      const user = await ctx.db.get(args.userId as Id<"users">);
      if (!user) return [];
      validUserId = user._id;
    } catch {
      return [];
    }

    // 1. Fetch user memberships
    const memberships = await ctx.db
      .query("workspace_members")
      .withIndex("by_userId", (q) => q.eq("userId", validUserId))
      .collect();

    if (memberships.length === 0) {
      return [];
    }

    const results = [];

    for (const membership of memberships) {
      const workspace = await ctx.db.get(membership.workspaceId);
      if (!workspace) continue;

      const role = await ctx.db.get(membership.roleId);

      // Count all members in this workspace
      const allMembers = await ctx.db
        .query("workspace_members")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspace._id))
        .collect();

      results.push({
        workspaceId: workspace._id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        avatar: workspace.avatar,
        ownerId: workspace.ownerId,
        memberRole: role?.name ?? "Member",
        roleId: membership.roleId,
        memberCount: allMembers.length,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      });
    }

    // Sort by updatedAt descending
    results.sort((a, b) => b.updatedAt - a.updatedAt);
    return results;
  },
});

/**
 * 2. getWorkspaceDetails(workspaceId, userId)
 * Full workspace object with owner info, member count, role list, project count
 * Verifies caller is workspace member (Access denied if not)
 */
export const getWorkspaceDetails = query({
  args: {
    workspaceId: v.union(v.id("workspaces"), v.string()),
    userId: v.optional(v.union(v.id("users"), v.string())),
  },
  handler: async (ctx, args) => {
    let workspace = null;
    try {
      workspace = await ctx.db.get(args.workspaceId as Id<"workspaces">);
    } catch {
      return null;
    }
    if (!workspace) {
      return null;
    }

    // Verify caller is a member if userId provided
    if (args.userId) {
      let validUserId: Id<"users"> | null = null;
      try {
        const u = await ctx.db.get(args.userId as Id<"users">);
        if (u) validUserId = u._id;
      } catch {
        // invalid user id format
      }

      if (validUserId) {
        const membership = await ctx.db
          .query("workspace_members")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", workspace._id).eq("userId", validUserId!)
          )
          .first();

        if (!membership) {
          return null;
        }
      }
    }

    // Fetch owner information
    const owner = await ctx.db.get(workspace.ownerId);

    // Fetch member count
    const members = await ctx.db
      .query("workspace_members")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspace._id))
      .collect();

    // Fetch roles list
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspace._id))
      .collect();

    return {
      workspaceId: workspace._id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      avatar: workspace.avatar,
      ownerId: workspace.ownerId,
      owner: owner
        ? {
          id: owner._id,
          name: owner.name,
          email: owner.email,
          avatar: owner.avatar,
        }
        : null,
      memberCount: members.length,
      roles: roles.map((r) => ({
        id: r._id,
        name: r.name,
        description: r.description,
        isDefault: r.isDefault,
        permissions: r.permissions,
      })),
      projectCount: 0, // Placeholder until projects collection is mounted
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  },
});

/**
 * 3. getWorkspaceMembersByRole(workspaceId, roleId)
 * Get all members with a specific role
 * Returns: userId, email, name, avatar, roleId, joinedAt
 */
export const getWorkspaceMembersByRole = query({
  args: {
    workspaceId: v.union(v.id("workspaces"), v.string()),
    roleId: v.union(v.id("roles"), v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const members = await ctx.db
        .query("workspace_members")
        .withIndex("by_roleId", (q) => q.eq("roleId", args.roleId as Id<"roles">))
        .filter((q) => q.eq(q.field("workspaceId"), args.workspaceId as Id<"workspaces">))
        .collect();

      const results = [];
      for (const member of members) {
        const user = await ctx.db.get(member.userId);
        if (!user) continue;

        results.push({
          userId: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          roleId: member.roleId,
          joinedAt: member.joinedAt,
        });
      }

      return results;
    } catch {
      return [];
    }
  },
});

/**
 * 4. getWorkspacePermissions(workspaceId, userId)
 * Get user's role and all permissions for that workspace
 * Returns: { roleId, roleName, permissions: [] }
 */
export const getWorkspacePermissions = query({
  args: {
    workspaceId: v.union(v.id("workspaces"), v.string()),
    userId: v.optional(v.union(v.id("users"), v.string())),
  },
  handler: async (ctx, args) => {
    if (!args.userId || !args.workspaceId) return null;

    let validUserId: Id<"users">;
    try {
      const user = await ctx.db.get(args.userId as Id<"users">);
      if (!user) return null;
      validUserId = user._id;
    } catch {
      return null;
    }

    let validWsId: Id<"workspaces">;
    try {
      const ws = await ctx.db.get(args.workspaceId as Id<"workspaces">);
      if (!ws) return null;
      validWsId = ws._id;
    } catch {
      return null;
    }

    const membership = await ctx.db
      .query("workspace_members")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", validWsId).eq("userId", validUserId)
      )
      .first();

    if (!membership) {
      return null;
    }

    const role = await ctx.db.get(membership.roleId);
    if (!role) {
      return null;
    }

    return {
      roleId: role._id,
      roleName: role.name,
      permissions: role.permissions,
    };
  },
});

/**
 * 5. getWorkspaceStats(workspaceId, userId)
 * Returns workspace-scoped KPI metrics for dashboard
 */
export const getWorkspaceStats = query({
  args: {
    workspaceId: v.union(v.id("workspaces"), v.string()),
    userId: v.optional(v.union(v.id("users"), v.string())),
  },
  handler: async (ctx, args) => {
    let wsDoc = null;
    try {
      wsDoc = await ctx.db.get(args.workspaceId as Id<"workspaces">);
    } catch {
      return null;
    }
    if (!wsDoc) return null;
    const wsId = wsDoc._id;

    // 1. Team members count from workspace_members
    const members = await ctx.db
      .query("workspace_members")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", wsId))
      .collect();

    // 2. Real projects count from projects table
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", wsId))
      .collect();

    const unstartedProjects = projects.filter((p) => p.status === "planning").length;

    // 3. Real tasks metrics from tasks table
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", wsId))
      .collect();

    const now = Date.now();
    const activeTasks = tasks.filter((t) => t.status !== "done").length;
    const completedTasks = tasks.filter((t) => t.status === "done").length;
    const overdueTasks = tasks.filter(
      (t) => t.status !== "done" && Boolean(t.dueDate && t.dueDate < now)
    ).length;

    return {
      totalProjects: projects.length,
      activeTasks,
      completedTasksThisMonth: completedTasks,
      teamMembers: members.length,
      overdueTasks,
      unstartedProjects,
    };
  },
});

/**
 * 6. getWorkspaceActivities(workspaceId)
 * Returns recent workspace-scoped activity logs (max 5)
 */
export const getWorkspaceActivities = query({
  args: {
    workspaceId: v.union(v.id("workspaces"), v.string()),
  },
  handler: async (ctx, args) => {
    let workspace = null;
    try {
      workspace = await ctx.db.get(args.workspaceId as Id<"workspaces">);
    } catch {
      return [];
    }
    if (!workspace) return [];

    const members = await ctx.db
      .query("workspace_members")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspace._id))
      .collect();

    const activities: Array<{
      id: string;
      userName: string;
      userAvatar?: string;
      action: string;
      target: string;
      timestamp: number;
    }> = [];

    // Members joined events
    for (const m of members) {
      const user = await ctx.db.get(m.userId);
      const role = await ctx.db.get(m.roleId);
      if (user) {
        activities.push({
          id: `member-${m._id}`,
          userName: user.name,
          userAvatar: user.avatar,
          action: "joined the workspace as",
          target: role?.name ?? "Member",
          timestamp: m.joinedAt,
        });
      }
    }

    // Projects created events
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspace._id))
      .collect();

    for (const p of projects) {
      let leadUser = null;
      if (p.leadId) {
        leadUser = await ctx.db.get(p.leadId);
      }
      activities.push({
        id: `project-${p._id}`,
        userName: leadUser?.name ?? "Team Member",
        userAvatar: leadUser?.avatar,
        action: "created project",
        target: `'${p.name}'`,
        timestamp: p.createdAt,
      });
    }

    // Workspace creation event
    const owner = await ctx.db.get(workspace.ownerId);
    if (owner) {
      activities.push({
        id: `ws-${workspace._id}`,
        userName: owner.name,
        userAvatar: owner.avatar,
        action: "created workspace",
        target: `'${workspace.name}'`,
        timestamp: workspace.createdAt,
      });
    }

    // Sort descending by timestamp, take max 5
    activities.sort((a, b) => b.timestamp - a.timestamp);
    return activities.slice(0, 5);
  },
});

/* =========================================================================
 * MUTATIONS (write)
 * ========================================================================= */

/**
 * 1. createWorkspace(name, description, userId, avatar?)
 * - Auto-create workspace
 * - Create default roles: Owner (full), Admin (manage all), Manager (projects & tasks), Member (own tasks), Viewer (read-only)
 * - Add creator as Owner member
 * - Returns workspace object with id
 */
export const createWorkspace = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    userId: v.id("users"),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Workspace name cannot be empty.");
    }

    // Check duplicate workspace names for this owner
    const existingForUser = await ctx.db
      .query("workspaces")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.userId))
      .filter((q) => q.eq(q.field("name"), trimmedName))
      .first();

    if (existingForUser) {
      throw new Error("A workspace with this name already exists. Please choose a different name.");
    }

    // Unique slug generation
    let baseSlug = generateSlug(trimmedName);
    let finalSlug = baseSlug;
    let counter = 1;

    while (true) {
      const existingSlug = await ctx.db
        .query("workspaces")
        .withIndex("by_slug", (q) => q.eq("slug", finalSlug))
        .first();

      if (!existingSlug) break;
      finalSlug = `${baseSlug}-${counter++}`;
    }

    const now = Date.now();

    // 1. Insert Workspace document
    const workspaceId = await ctx.db.insert("workspaces", {
      name: trimmedName,
      slug: finalSlug,
      description: args.description?.trim(),
      ownerId: args.userId,
      avatar: args.avatar,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create the 5 Default Roles for this workspace
    const ownerRoleId = await ctx.db.insert("roles", {
      workspaceId,
      name: "Owner",
      description: "Full control over all workspace resources, billing, and settings.",
      isDefault: true,
      permissions: DEFAULT_PERMISSIONS.OWNER,
      createdAt: now,
    });

    await ctx.db.insert("roles", {
      workspaceId,
      name: "Admin",
      description: "Can manage projects, tasks, members, and workspace configurations.",
      isDefault: true,
      permissions: DEFAULT_PERMISSIONS.ADMIN,
      createdAt: now,
    });

    await ctx.db.insert("roles", {
      workspaceId,
      name: "Manager",
      description: "Can create and manage projects, tasks, and invite team members.",
      isDefault: true,
      permissions: DEFAULT_PERMISSIONS.MANAGER,
      createdAt: now,
    });

    await ctx.db.insert("roles", {
      workspaceId,
      name: "Member",
      description: "Standard collaborator who can create and update tasks.",
      isDefault: true,
      permissions: DEFAULT_PERMISSIONS.MEMBER,
      createdAt: now,
    });

    await ctx.db.insert("roles", {
      workspaceId,
      name: "Viewer",
      description: "Read-only access across workspace projects and tasks.",
      isDefault: true,
      permissions: DEFAULT_PERMISSIONS.VIEWER,
      createdAt: now,
    });

    // 3. Add creator as the Owner member
    await ctx.db.insert("workspace_members", {
      workspaceId,
      userId: args.userId,
      roleId: ownerRoleId,
      joinedAt: now,
    });

    return {
      workspaceId,
      name: trimmedName,
      slug: finalSlug,
      description: args.description,
      ownerId: args.userId,
      avatar: args.avatar,
      createdAt: now,
      updatedAt: now,
    };
  },
});

/**
 * 2. updateWorkspace(workspaceId, userId, { name?, description?, avatar? })
 * - Only Owner can update
 * - Returns updated workspace
 */
export const updateWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found.");
    }

    // Permission check: Only workspace Owner can update workspace
    if (workspace.ownerId !== args.userId) {
      throw new Error("Access denied: Only the workspace owner can update workspace settings.");
    }

    const updates: Partial<typeof workspace> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      const trimmed = args.name.trim();
      if (!trimmed) {
        throw new Error("Workspace name cannot be empty.");
      }

      if (trimmed !== workspace.name) {
        // Check duplicate name for this owner
        const existing = await ctx.db
          .query("workspaces")
          .withIndex("by_ownerId", (q) => q.eq("ownerId", args.userId))
          .filter((q) => q.eq(q.field("name"), trimmed))
          .first();

        if (existing && existing._id !== args.workspaceId) {
          throw new Error("A workspace with this name already exists. Please choose a different name.");
        }

        updates.name = trimmed;
        // Optionally update slug if requested
        let baseSlug = generateSlug(trimmed);
        let finalSlug = baseSlug;
        let counter = 1;
        while (true) {
          const check = await ctx.db
            .query("workspaces")
            .withIndex("by_slug", (q) => q.eq("slug", finalSlug))
            .first();

          if (!check || check._id === args.workspaceId) break;
          finalSlug = `${baseSlug}-${counter++}`;
        }
        updates.slug = finalSlug;
      }
    }

    if (args.description !== undefined) {
      updates.description = args.description?.trim();
    }

    if (args.avatar !== undefined) {
      updates.avatar = args.avatar;
    }

    await ctx.db.patch(args.workspaceId, updates);

    return await ctx.db.get(args.workspaceId);
  },
});

/**
 * 3. deleteWorkspace(workspaceId, userId)
 * - Only Owner can delete
 * - Cascade delete all members, roles, invitations
 * - Returns success boolean
 */
export const deleteWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found.");
    }

    // Permission check: Only Owner can delete workspace
    if (workspace.ownerId !== args.userId) {
      throw new Error("Access denied: Only the workspace owner can delete this workspace.");
    }

    // 1. Cascade delete workspace_members
    const members = await ctx.db
      .query("workspace_members")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const m of members) {
      await ctx.db.delete(m._id);
    }

    // 2. Cascade delete roles
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const r of roles) {
      await ctx.db.delete(r._id);
    }

    // 3. Cascade delete invitations
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const inv of invitations) {
      await ctx.db.delete(inv._id);
    }

    // 4. Delete the workspace document
    await ctx.db.delete(args.workspaceId);

    return { success: true };
  },
});

/**
 * 4. switchActiveWorkspace(workspaceId, userId)
 * - User switches to this workspace
 * - Verify user is member
 * - Returns workspace object
 */
export const switchActiveWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found.");
    }

    // Verify user is a member of this workspace
    const membership = await ctx.db
      .query("workspace_members")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .first();

    if (!membership) {
      throw new Error("Access denied: You are not a member of this workspace.");
    }

    const role = await ctx.db.get(membership.roleId);

    return {
      workspaceId: workspace._id,
      name: workspace.name,
      slug: workspace.slug,
      avatar: workspace.avatar,
      roleName: role?.name ?? "Member",
      permissions: role?.permissions ?? [],
    };
  },
});
