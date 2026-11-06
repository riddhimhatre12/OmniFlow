import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { logActivityHelper } from "./notifications";

/**
 * Sign in with email and password
 */
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) {
      throw new Error("No account found with this email address.");
    }

    if (user.passwordHash !== args.password) {
      throw new Error("Invalid password. Please check your credentials.");
    }

    // Update last login timestamp
    await ctx.db.patch(user._id, {
      lastLoginAt: Date.now(),
    });

    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role ?? "Member",
      avatar: user.avatar,
    };
  },
});

/**
 * Register a new user account
 */
export const signUp = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existingUser) {
      throw new Error("An account with this email already exists. Please log in.");
    }

    const userId = await ctx.db.insert("users", {
      name: args.name.trim(),
      email: normalizedEmail,
      passwordHash: args.password,
      role: args.role ?? "Admin",
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    });

    return {
      userId,
      name: args.name.trim(),
      email: normalizedEmail,
      role: args.role ?? "Admin",
    };
  },
});

/**
 * Sign in or sign up with Google SSO
 */
export const loginWithGoogle = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    let userId = existingUser?._id;

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        lastLoginAt: Date.now(),
        ...(args.avatar ? { avatar: args.avatar } : {}),
      });
    } else {
      userId = await ctx.db.insert("users", {
        name: args.name.trim(),
        email: normalizedEmail,
        passwordHash: "oauth_google_verified",
        role: "Member",
        avatar: args.avatar,
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      });
    }

    if (userId) {
      const userMembership = await ctx.db
        .query("workspace_members")
        .withIndex("by_userId", (q) => q.eq("userId", userId!))
        .first();

      if (userMembership) {
        await logActivityHelper(ctx, {
          workspaceId: userMembership.workspaceId,
          userId,
          action: "user_login",
          resourceType: "user",
          resourceId: userId,
          resourceName: args.name.trim(),
          description: `${args.name.trim()} signed in`,
        });
      }
    }

    return {
      userId,
      name: args.name.trim(),
      email: normalizedEmail,
      role: existingUser ? existingUser.role ?? "Member" : "Member",
      avatar: args.avatar ?? existingUser?.avatar,
    };
  },
});

/**
 * Get user profile by ID
 */
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role ?? "Member",
      avatar: user.avatar,
      title: user.title,
      department: user.department,
      bio: user.bio,
      timezone: user.timezone,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  },
});

/**
 * Get user profile by email
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) return null;

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role ?? "Member",
      avatar: user.avatar,
      title: user.title,
      department: user.department,
      bio: user.bio,
      timezone: user.timezone,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  },
});

/**
 * Update user profile details
 */
export const updateProfile = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    title: v.optional(v.string()),
    department: v.optional(v.string()),
    bio: v.optional(v.string()),
    timezone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) {
      throw new Error("User account not found.");
    }

    await ctx.db.patch(user._id, {
      name: args.name.trim(),
      title: args.title?.trim(),
      department: args.department?.trim(),
      bio: args.bio?.trim(),
      timezone: args.timezone?.trim(),
      avatar: args.avatar,
      ...(args.role ? { role: args.role } : {}),
    });

    return {
      userId: user._id,
      name: args.name.trim(),
      email: user.email,
      role: args.role ?? user.role ?? "Member",
      avatar: args.avatar ?? user.avatar,
      title: args.title?.trim(),
      department: args.department?.trim(),
    };
  },
});

/**
 * Change account password
 */
export const changePassword = mutation({
  args: {
    email: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) {
      throw new Error("User account not found.");
    }

    if (user.passwordHash !== args.currentPassword) {
      throw new Error("Current password is incorrect.");
    }

    if (args.newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long.");
    }

    await ctx.db.patch(user._id, {
      passwordHash: args.newPassword,
    });

    return { success: true };
  },
});

