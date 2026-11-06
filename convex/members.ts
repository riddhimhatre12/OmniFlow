import { query, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { createNotificationHelper, logActivityHelper } from "./notifications";

/* =========================================================================
 * HELPER AUTHORIZATION FUNCTIONS
 * ========================================================================= */

async function assertCallerCanManageMembers(
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

  const canManage =
    role.name === "Owner" ||
    role.name === "Admin" ||
    role.permissions.includes("member:manage") ||
    role.permissions.includes("workspace:manage");

  if (!canManage) {
    throw new Error("Access denied: Only Workspace Owners or Admins can perform this action.");
  }

  return { membership, role };
}

async function assertCallerCanInvite(
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

  const canInvite =
    role.name === "Owner" ||
    role.name === "Admin" ||
    role.name === "Manager" ||
    role.permissions.includes("member:invite") ||
    role.permissions.includes("workspace:manage");

  if (!canInvite) {
    throw new Error("Access denied: You do not have permission to invite members.");
  }

  return { membership, role };
}

/* =========================================================================
 * QUERIES (read-only)
 * ========================================================================= */

/**
 * 1. getWorkspaceMembers(workspaceId)
 * Return all members with roles
 * Include: userId, name, email, avatar, roleId, roleName, joinedAt
 */
export const getWorkspaceMembers = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("workspace_members")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const members = [];
    for (const m of memberships) {
      const user = await ctx.db.get(m.userId);
      const role = await ctx.db.get(m.roleId);
      if (!user) continue;

      members.push({
        memberId: m._id,
        userId: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        title: user.title,
        department: user.department,
        roleId: m.roleId,
        roleName: role?.name ?? "Member",
        isDefaultRole: role?.isDefault ?? false,
        joinedAt: m.joinedAt,
        invitedAt: m.invitedAt,
      });
    }

    // Sort by role hierarchy (Owner first, then Admin, Manager, etc.)
    const hierarchy: Record<string, number> = {
      Owner: 1,
      Admin: 2,
      Manager: 3,
      Member: 4,
      Viewer: 5,
    };

    return members.sort((a, b) => {
      const rA = hierarchy[a.roleName] ?? 10;
      const rB = hierarchy[b.roleName] ?? 10;
      if (rA !== rB) return rA - rB;
      return a.name.localeCompare(b.name);
    });
  },
});

/**
 * 2. getUserRole(workspaceId, userId)
 * Get specific user's role in workspace
 */
export const getUserRole = query({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.optional(v.union(v.id("users"), v.string())),
  },
  handler: async (ctx, args) => {
    if (!args.userId) return null;

    let validUserId: Id<"users">;
    try {
      const user = await ctx.db.get(args.userId as Id<"users">);
      if (!user) return null;
      validUserId = user._id;
    } catch {
      return null;
    }

    const membership = await ctx.db
      .query("workspace_members")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", validUserId)
      )
      .first();

    if (!membership) return null;

    const role = await ctx.db.get(membership.roleId);
    if (!role) return null;

    return {
      roleId: role._id,
      roleName: role.name,
      isDefault: role.isDefault,
      permissions: role.permissions,
      joinedAt: membership.joinedAt,
    };
  },
});

/**
 * 3. getWorkspaceInvitations(workspaceId)
 * Returns all active pending invitations for the workspace
 */
export const getWorkspaceInvitations = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const results = [];
    const now = Date.now();

    for (const inv of invitations) {
      const role = await ctx.db.get(inv.roleId);
      const inviter = await ctx.db.get(inv.invitedBy);

      results.push({
        invitationId: inv._id,
        invitedEmail: inv.invitedEmail,
        roleId: inv.roleId,
        roleName: role?.name ?? "Member",
        invitedByName: inviter?.name ?? "Workspace Admin",
        token: inv.token,
        status: inv.status,
        expiresAt: inv.expiresAt,
        isExpired: now > inv.expiresAt,
        hoursLeft: Math.max(1, Math.round((inv.expiresAt - now) / (1000 * 60 * 60))),
        createdAt: inv.createdAt,
      });
    }

    return results;
  },
});

/**
 * 4. getInvitationByToken(token)
 * Validates an invitation link token
 */
export const getInvitationByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) return null;

    const workspace = await ctx.db.get(invitation.workspaceId);
    const role = await ctx.db.get(invitation.roleId);
    const inviter = await ctx.db.get(invitation.invitedBy);
    const isExpired = Date.now() > invitation.expiresAt;

    return {
      token: invitation.token,
      workspaceId: invitation.workspaceId,
      workspaceName: workspace?.name ?? "Workspace",
      workspaceSlug: workspace?.slug ?? "workspace",
      invitedEmail: invitation.invitedEmail,
      roleName: role?.name ?? "Member",
      inviterName: inviter?.name ?? "Team Admin",
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      isExpired,
      createdAt: invitation.createdAt,
    };
  },
});

/* =========================================================================
 * MUTATIONS (write)
 * ========================================================================= */

/**
 * 1. changeUserRole(workspaceId, callerUserId, userId, newRoleId)
 * - Only Owner/Admin can change roles
 * - Can't demote Owner (only Owner can change own role)
 * - Returns updated member
 */
export const changeUserRole = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    callerUserId: v.id("users"),
    userId: v.id("users"),
    newRoleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    // 1. Authorization check
    const { role: callerRole } = await assertCallerCanManageMembers(
      ctx,
      args.workspaceId,
      args.callerUserId
    );

    // 2. Validate target member exists in workspace
    const targetMembership = await ctx.db
      .query("workspace_members")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .first();

    if (!targetMembership) {
      throw new Error("Target user is not a member of this workspace.");
    }

    const currentRole = await ctx.db.get(targetMembership.roleId);

    // 3. Rule: "Can't demote Owner (only Owner can change own role)"
    if (currentRole?.name === "Owner") {
      if (args.callerUserId !== args.userId) {
        throw new Error("Access denied: Only the Owner can change their own role.");
      }

      // Check if this is the only Owner in the workspace
      const allMembers = await ctx.db
        .query("workspace_members")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
        .collect();

      let ownerCount = 0;
      for (const m of allMembers) {
        const r = await ctx.db.get(m.roleId);
        if (r?.name === "Owner") ownerCount++;
      }

      if (ownerCount <= 1) {
        throw new Error("Cannot demote the last Owner. Assign another Owner first.");
      }
    }

    // 4. Verify new role exists and belongs to this workspace
    const newRole = await ctx.db.get(args.newRoleId);
    if (!newRole || newRole.workspaceId !== args.workspaceId) {
      throw new Error("Target role does not exist in this workspace.");
    }

    // 5. Update role
    await ctx.db.patch(targetMembership._id, {
      roleId: args.newRoleId,
    });

    const targetUser = await ctx.db.get(args.userId);
    const caller = await ctx.db.get(args.callerUserId);
    const callerName = caller?.name || caller?.email || "Admin";

    // Notify affected user
    if (args.userId !== args.callerUserId) {
      await createNotificationHelper(ctx, {
        userId: args.userId,
        workspaceId: args.workspaceId,
        type: "role_changed",
        title: "Your role was updated",
        message: `${callerName} changed your role from ${currentRole?.name || "Member"} to ${newRole.name}`,
        actionBy: args.callerUserId,
        relatedResourceId: args.workspaceId,
        relatedResourceType: "member",
        link: `/teams`,
        metadata: { workspaceId: args.workspaceId, oldRole: currentRole?.name, newRole: newRole.name },
      });
    }

    // Activity feed
    await logActivityHelper(ctx, {
      workspaceId: args.workspaceId,
      userId: args.callerUserId,
      action: "role_updated",
      resourceType: "member",
      resourceId: args.userId,
      resourceName: targetUser?.name || targetUser?.email || "Member",
      description: `${callerName} changed role of ${targetUser?.name || "Member"} to ${newRole.name}`,
      changes: { from: currentRole?.name, to: newRole.name },
    });

    return {
      success: true,
      userId: args.userId,
      userName: targetUser?.name,
      previousRole: currentRole?.name,
      newRole: newRole.name,
      changedBy: callerRole.name,
    };
  },
});

/**
 * 2. removeMemberFromWorkspace(workspaceId, callerUserId, userId)
 * - Only Owner/Admin can remove (or member removing themselves)
 * - Can't remove last Owner
 * - Return success
 */
export const removeMemberFromWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    callerUserId: v.id("users"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Verify target membership
    const targetMembership = await ctx.db
      .query("workspace_members")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .first();

    if (!targetMembership) {
      throw new Error("User is not a member of this workspace.");
    }

    const targetRole = await ctx.db.get(targetMembership.roleId);

    // 2. Authorization check: Either self-removal or Owner/Admin
    const isSelfRemoval = args.callerUserId === args.userId;
    if (!isSelfRemoval) {
      await assertCallerCanManageMembers(ctx, args.workspaceId, args.callerUserId);
    }

    // 3. Rule: "Can't remove last Owner"
    if (targetRole?.name === "Owner") {
      const allMembers = await ctx.db
        .query("workspace_members")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
        .collect();

      let ownerCount = 0;
      for (const m of allMembers) {
        const r = await ctx.db.get(m.roleId);
        if (r?.name === "Owner") ownerCount++;
      }

      if (ownerCount <= 1) {
        throw new Error("Cannot remove the only Owner from the workspace.");
      }
    }

    // 4. Delete membership
    await ctx.db.delete(targetMembership._id);

    return {
      success: true,
      removedUserId: args.userId,
    };
  },
});

/**
 * 3. inviteMemberByEmail(workspaceId, callerUserId, invitedEmail, roleId)
 * - Check if email already in workspace
 * - If user exists on platform: add directly to workspace_members
 * - If new user: create invitation with unique token & 24hr expiry
 * - Return: { success, message, requiresEmailVerification?, token?, inviteLink? }
 */
export const inviteMemberByEmail = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    callerUserId: v.id("users"),
    invitedEmail: v.string(),
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    // 1. Authorization check
    await assertCallerCanInvite(ctx, args.workspaceId, args.callerUserId);

    const normalizedEmail = args.invitedEmail.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }

    // 2. Validate role belongs to workspace
    const role = await ctx.db.get(args.roleId);
    if (!role || role.workspaceId !== args.workspaceId) {
      throw new Error("Selected role does not exist in this workspace.");
    }

    // Pre-fetch workspace and inviter details for notifications and email
    const workspace = await ctx.db.get(args.workspaceId);
    const inviter = await ctx.db.get(args.callerUserId);
    const inviterName = inviter?.name || inviter?.email || "A team member";
    const workspaceName = workspace?.name || "Productflow Workspace";

    // 3. Check if user with this email already exists on platform
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existingUser) {
      // Check if already a member in this workspace
      const existingMembership = await ctx.db
        .query("workspace_members")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("userId", existingUser._id)
        )
        .first();

      if (existingMembership) {
        throw new Error(`User with email "${normalizedEmail}" is already a member of this workspace.`);
      }

      // Add directly to workspace_members
      const now = Date.now();
      const memberId = await ctx.db.insert("workspace_members", {
        workspaceId: args.workspaceId,
        userId: existingUser._id,
        roleId: args.roleId,
        joinedAt: now,
        invitedAt: now,
        invitedBy: args.callerUserId,
      });

      // Notify invited user in-app
      await createNotificationHelper(ctx, {
        userId: existingUser._id,
        workspaceId: args.workspaceId,
        type: "invite_received",
        title: "You were added to a workspace",
        message: `${inviterName} added you to "${workspaceName}" as ${role.name}`,
        actionBy: args.callerUserId,
        relatedResourceId: args.workspaceId,
        relatedResourceType: "workspace",
        link: `/dashboard`,
        metadata: { workspaceId: args.workspaceId, roleId: args.roleId },
      });

      // Log activity
      await logActivityHelper(ctx, {
        workspaceId: args.workspaceId,
        userId: args.callerUserId,
        action: "member_invited",
        resourceType: "member",
        resourceId: existingUser._id,
        resourceName: existingUser.name || normalizedEmail,
        description: `${inviterName} added ${existingUser.name || normalizedEmail} as ${role.name}`,
      });

      // Check notification preferences for existing user email
      const prefs = await ctx.db
        .query("notification_preferences")
        .withIndex("by_userId_workspace", (q: any) =>
          q.eq("userId", existingUser._id).eq("workspaceId", args.workspaceId)
        )
        .first();

      const emailAllowed = !prefs || (prefs.emailNotifications !== false && prefs.memberInvitedEnabled !== false);
      if (emailAllowed && existingUser.email) {
        ctx.scheduler.runAfter(0, api.mailer.sendInvitationEmail, {
          inviteeEmail: existingUser.email,
          inviteeName: existingUser.name || existingUser.email.split("@")[0],
          inviterName,
          workspaceName,
          roleName: role.name,
          invitationToken: "direct-access",
        });
      }

      return {
        success: true,
        message: `${existingUser.name} (${normalizedEmail}) was added directly to the workspace as ${role.name}.`,
        addedDirectly: true,
        memberId,
      };
    }

    // 4. New user: check if pending invitation already exists
    const existingInvitation = await ctx.db
      .query("invitations")
      .withIndex("by_workspace_and_email", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("invitedEmail", normalizedEmail)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours expiry
    const token = `${Math.random().toString(36).substring(2)}${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`;

    if (existingInvitation) {
      // Refresh token and expiry for pending invite
      await ctx.db.patch(existingInvitation._id, {
        token,
        roleId: args.roleId,
        expiresAt,
        createdAt: now,
      });

      // Send/resend invitation email to invitee
      ctx.scheduler.runAfter(0, api.mailer.sendInvitationEmail, {
        inviteeEmail: normalizedEmail,
        inviteeName: normalizedEmail.split("@")[0],
        inviterName,
        workspaceName,
        roleName: role.name,
        invitationToken: token,
      });

      return {
        success: true,
        message: `Existing pending invitation for "${normalizedEmail}" was refreshed.`,
        token,
        inviteLink: `/join?token=${token}`,
        requiresEmailVerification: true,
        expiresAt,
      };
    }

    // 5. Create new invitation record
    await ctx.db.insert("invitations", {
      workspaceId: args.workspaceId,
      invitedEmail: normalizedEmail,
      invitedBy: args.callerUserId,
      roleId: args.roleId,
      token,
      status: "pending",
      expiresAt,
      createdAt: now,
    });

    // Send invitation email asynchronously
    ctx.scheduler.runAfter(0, api.mailer.sendInvitationEmail, {
      inviteeEmail: normalizedEmail,
      inviteeName: normalizedEmail.split("@")[0],
      inviterName,
      workspaceName,
      roleName: role.name,
      invitationToken: token,
    });

    return {
      success: true,
      message: `Invitation created for "${normalizedEmail}" as ${role.name}.`,
      token,
      inviteLink: `/join?token=${token}`,
      requiresEmailVerification: true,
      expiresAt,
    };
  },
});

/**
 * 4. acceptInvitation(token, userId)
 * - Verify token exists and not expired
 * - Add user to workspace_members with role from invitation
 * - Mark invitation as "accepted"
 * - Returns workspace object
 */
export const acceptInvitation = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Fetch invitation by token
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invitation not found. Please check your invitation link.");
    }

    if (invitation.status === "accepted") {
      throw new Error("This invitation has already been accepted.");
    }

    if (invitation.status === "declined") {
      throw new Error("This invitation was previously declined.");
    }

    // 2. Check 24hr expiration
    if (Date.now() > invitation.expiresAt) {
      throw new Error("This invitation link has expired (24-hour limit). Please request a new invite.");
    }

    // 3. Verify user matches email
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User account not found.");
    }

    if (user.email.toLowerCase() !== invitation.invitedEmail.toLowerCase()) {
      throw new Error(
        `This invitation was issued for "${invitation.invitedEmail}", but you are signed in as "${user.email}".`
      );
    }

    // 4. Check if already a member
    const existingMembership = await ctx.db
      .query("workspace_members")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", invitation.workspaceId).eq("userId", args.userId)
      )
      .first();

    if (!existingMembership) {
      // Add to workspace_members
      await ctx.db.insert("workspace_members", {
        workspaceId: invitation.workspaceId,
        userId: args.userId,
        roleId: invitation.roleId,
        joinedAt: Date.now(),
        invitedAt: invitation.createdAt,
        invitedBy: invitation.invitedBy,
      });
    }

    // 5. Mark invitation as accepted
    await ctx.db.patch(invitation._id, {
      status: "accepted",
    });

    const workspace = await ctx.db.get(invitation.workspaceId);
    const role = await ctx.db.get(invitation.roleId);
    const userName = user.name || user.email;

    // Log activity
    await logActivityHelper(ctx, {
      workspaceId: invitation.workspaceId,
      userId: args.userId,
      action: "member_joined",
      resourceType: "member",
      resourceId: args.userId,
      resourceName: userName,
      description: `${userName} joined the workspace as ${role?.name ?? "Member"}`,
    });

    // Notify workspace owner/admins
    if (workspace?.ownerId && workspace.ownerId !== args.userId) {
      await createNotificationHelper(ctx, {
        userId: workspace.ownerId,
        workspaceId: invitation.workspaceId,
        type: "member_joined",
        title: "New member joined",
        message: `${userName} joined ${workspace.name}`,
        actionBy: args.userId,
        relatedResourceId: invitation.workspaceId,
        relatedResourceType: "member",
        link: `/teams`,
        metadata: { workspaceId: invitation.workspaceId, memberId: args.userId },
      });
    }

    return {
      success: true,
      workspaceId: workspace?._id,
      workspaceName: workspace?.name,
      workspaceSlug: workspace?.slug,
      assignedRole: role?.name ?? "Member",
    };
  },
});

/**
 * 5. declineInvitation(token)
 * - Mark invitation as "declined"
 * - Return success
 */
export const declineInvitation = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invitation not found.");
    }

    if (invitation.status !== "pending") {
      throw new Error(`Invitation is already ${invitation.status}.`);
    }

    await ctx.db.patch(invitation._id, {
      status: "declined",
    });

    return { success: true };
  },
});

/**
 * 6. resendInvitation(invitationId, callerUserId)
 * - Resend/refresh invitation token and extend expiry by 24h
 */
export const resendInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
    callerUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found.");
    }

    await assertCallerCanInvite(ctx, invitation.workspaceId, args.callerUserId);

    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000;
    const token = `${Math.random().toString(36).substring(2)}${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`;

    await ctx.db.patch(invitation._id, {
      token,
      expiresAt,
      status: "pending",
      createdAt: now,
    });

    return {
      success: true,
      message: `Invitation for ${invitation.invitedEmail} extended for 24 hours.`,
      expiresAt,
      token,
      inviteLink: `/join?token=${token}`,
    };
  },
});

/**
 * 7. revokeInvitation(invitationId, callerUserId)
 * - Revoke/cancel pending invitation
 */
export const revokeInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
    callerUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found.");
    }

    await assertCallerCanInvite(ctx, invitation.workspaceId, args.callerUserId);

    await ctx.db.delete(invitation._id);

    return {
      success: true,
      message: `Invitation for ${invitation.invitedEmail} has been revoked.`,
    };
  },
});

