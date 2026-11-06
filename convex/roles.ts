import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { PERMISSIONS } from "./schema";

/* =========================================================================
 * HELPER AUTHORIZATION FUNCTIONS
 * ========================================================================= */

async function assertCallerIsAdminOrOwner(
  ctx: any,
  workspaceId: Id<"workspaces">,
  callerUserId: Id<"users">
) {
  const membership = await ctx.db
    .query("workspace_members")
    .withIndex("by_workspace_and_user", (q: any) =>
      q.eq("workspaceId", workspaceId).eq("userId", callerUserId)
    )
    .first();

  if (!membership) {
    throw new Error("Access denied: You are not a member of this workspace.");
  }

  const role = await ctx.db.get(membership.roleId);
  if (!role) {
    throw new Error("Access denied: Caller role not found.");
  }

  const isOwnerOrAdmin =
    role.name === "Owner" ||
    role.name === "Admin" ||
    role.permissions.includes("role:manage") ||
    role.permissions.includes("workspace:manage");

  if (!isOwnerOrAdmin) {
    throw new Error("Access denied: Only Workspace Owners or Admins can perform this action.");
  }

  return { membership, role };
}

/* =========================================================================
 * QUERIES (read-only)
 * ========================================================================= */

/**
 * 1. getWorkspaceRoles(workspaceId)
 * Return all roles with their permissions
 * Mark default roles with isDefault flag
 * Sorted with default roles first, then custom roles alphabetically
 */
export const getWorkspaceRoles = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Query members to count active users with each role
    const members = await ctx.db
      .query("workspace_members")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const countsByRoleId: Record<string, number> = {};
    for (const m of members) {
      countsByRoleId[m.roleId] = (countsByRoleId[m.roleId] || 0) + 1;
    }

    // Custom sort: Owner, Admin, Manager, Member, Viewer first, then custom roles
    const priorityOrder: Record<string, number> = {
      Owner: 1,
      Admin: 2,
      Manager: 3,
      Member: 4,
      Viewer: 5,
    };

    const enriched = roles.map((r) => ({
      ...r,
      memberCount: countsByRoleId[r._id] || 0,
    }));

    return enriched.sort((a, b) => {
      const pA = priorityOrder[a.name] ?? (a.isDefault ? 10 : 20);
      const pB = priorityOrder[b.name] ?? (b.isDefault ? 10 : 20);
      if (pA !== pB) return pA - pB;
      return a.name.localeCompare(b.name);
    });
  },
});

/**
 * 2. getRolePermissions(roleId)
 * Get detailed permission list for a role
 */
export const getRolePermissions = query({
  args: { roleId: v.id("roles") },
  handler: async (ctx, args) => {
    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found.");
    }

    return {
      roleId: role._id,
      workspaceId: role.workspaceId,
      name: role.name,
      description: role.description,
      isDefault: role.isDefault,
      permissions: role.permissions,
      createdAt: role.createdAt,
    };
  },
});

/* =========================================================================
 * MUTATIONS (write)
 * ========================================================================= */

/**
 * 1. createCustomRole(workspaceId, callerUserId, name, description?, permissions)
 * - Only Admin/Owner can create
 * - Validate permission names against allowed list
 * - Return role object
 */
export const createCustomRole = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    callerUserId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Authorization check
    await assertCallerIsAdminOrOwner(ctx, args.workspaceId, args.callerUserId);

    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Role name cannot be empty.");
    }

    // 2. Validate permission names against allowed list
    const allowed = new Set(PERMISSIONS as readonly string[]);
    const invalidPermissions = args.permissions.filter((p) => !allowed.has(p));
    if (invalidPermissions.length > 0) {
      throw new Error(`Invalid permission(s) provided: ${invalidPermissions.join(", ")}`);
    }

    // 3. Prevent duplicate role names in the same workspace
    const existing = await ctx.db
      .query("roles")
      .withIndex("by_workspace_and_name", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("name", trimmedName)
      )
      .first();

    if (existing) {
      throw new Error(`A role named "${trimmedName}" already exists in this workspace.`);
    }

    // 4. Create role
    const now = Date.now();
    const roleId = await ctx.db.insert("roles", {
      workspaceId: args.workspaceId,
      name: trimmedName,
      description: args.description?.trim(),
      isDefault: false,
      permissions: Array.from(new Set(args.permissions)),
      createdAt: now,
    });

    console.log(
      `[AUDIT] Admin ${args.callerUserId} created custom role "${trimmedName}" in workspace ${args.workspaceId}`
    );

    return await ctx.db.get(roleId);
  },
});

/**
 * 2. updateRolePermissions(roleId, callerUserId, permissions)
 * - Update permissions for a role
 * - Can't modify default roles
 */
export const updateRolePermissions = mutation({
  args: {
    roleId: v.id("roles"),
    callerUserId: v.id("users"),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found.");
    }

    // 1. Authorization check
    await assertCallerIsAdminOrOwner(ctx, role.workspaceId, args.callerUserId);

    // 2. Can't modify default roles
    if (role.isDefault) {
      throw new Error(`Cannot modify permissions of default system role "${role.name}". Create a custom role instead.`);
    }

    // 3. Validate permissions against allowed list
    const allowed = new Set(PERMISSIONS as readonly string[]);
    const invalid = args.permissions.filter((p) => !allowed.has(p));
    if (invalid.length > 0) {
      throw new Error(`Invalid permission(s): ${invalid.join(", ")}`);
    }

    const uniquePermissions = Array.from(new Set(args.permissions));

    await ctx.db.patch(role._id, {
      permissions: uniquePermissions,
    });

    // Backend audit logging: "Admin changed role permissions"
    console.log(
      `[AUDIT] Admin ${args.callerUserId} changed role permissions for role "${role.name}" (${role._id}) in workspace ${role.workspaceId}. New permissions: [${uniquePermissions.join(", ")}]`
    );

    return await ctx.db.get(role._id);
  },
});

/**
 * 3. deleteCustomRole(roleId, callerUserId, reassignToRoleId)
 * - Only Admin/Owner can delete
 * - Reassign all members from old role to new role
 * - Can't delete default roles
 */
export const deleteCustomRole = mutation({
  args: {
    roleId: v.id("roles"),
    callerUserId: v.id("users"),
    reassignToRoleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role to delete not found.");
    }

    // 1. Authorization check
    await assertCallerIsAdminOrOwner(ctx, role.workspaceId, args.callerUserId);

    // 2. Can't delete default roles
    if (role.isDefault) {
      throw new Error(`Cannot delete default system role "${role.name}".`);
    }

    if (args.roleId === args.reassignToRoleId) {
      throw new Error("Cannot reassign members to the role being deleted.");
    }

    // 3. Validate reassignment target role belongs to same workspace
    const targetRole = await ctx.db.get(args.reassignToRoleId);
    if (!targetRole || targetRole.workspaceId !== role.workspaceId) {
      throw new Error("Reassignment target role does not exist in this workspace.");
    }

    // 4. Reassign all members from old role to new role
    const membersWithRole = await ctx.db
      .query("workspace_members")
      .withIndex("by_roleId", (q) => q.eq("roleId", args.roleId))
      .filter((q) => q.eq(q.field("workspaceId"), role.workspaceId))
      .collect();

    for (const member of membersWithRole) {
      await ctx.db.patch(member._id, {
        roleId: args.reassignToRoleId,
      });
    }

    // 5. Delete the custom role
    await ctx.db.delete(role._id);

    console.log(
      `[AUDIT] Admin ${args.callerUserId} deleted role "${role.name}" (${role._id}) in workspace ${role.workspaceId} and reassigned ${membersWithRole.length} members to "${targetRole.name}" (${targetRole._id})`
    );

    return {
      success: true,
      deletedRoleName: role.name,
      reassignedToRoleName: targetRole.name,
      reassignedCount: membersWithRole.length,
    };
  },
});
