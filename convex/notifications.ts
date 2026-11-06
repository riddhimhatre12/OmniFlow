import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const NOTIFICATION_TYPES = [
  "task_assigned",
  "sprint_started",
  "sprint_closed",
  "invite_received",
  "role_changed",
  "member_joined",
  "project_created",
  "task_commented",
  "task_status_changed",
  "mention",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const DEFAULT_PREFERENCES = {
  taskAssignedEnabled: true,
  taskCommentedEnabled: true,
  sprintStartedEnabled: true,
  sprintClosedEnabled: true,
  memberInvitedEnabled: true,
  memberJoinedEnabled: true,
  roleChangedEnabled: true,
  mentionEnabled: true,
  emailNotifications: false,
  deliveryMethod: "in_app",
  notificationFrequency: "instant",
};

/**
 * Internal helper to check user preferences before emitting a notification
 */
export async function checkNotificationPreference(
  ctx: any,
  userId: Id<"users">,
  workspaceId: Id<"workspaces">,
  type: NotificationType
): Promise<boolean> {
  const prefs = await ctx.db
    .query("notification_preferences")
    .withIndex("by_userId_workspace", (q: any) =>
      q.eq("userId", userId).eq("workspaceId", workspaceId)
    )
    .first();

  if (!prefs) return true; // Default to enabled

  switch (type) {
    case "task_assigned":
    case "task_status_changed":
      return prefs.taskAssignedEnabled !== false;
    case "task_commented":
      return prefs.taskCommentedEnabled !== false;
    case "sprint_started":
      return prefs.sprintStartedEnabled !== false;
    case "sprint_closed":
      return prefs.sprintClosedEnabled !== false;
    case "invite_received":
      return prefs.memberInvitedEnabled !== false;
    case "member_joined":
      return prefs.memberJoinedEnabled !== false;
    case "role_changed":
      return prefs.roleChangedEnabled !== false;
    case "mention":
      return prefs.mentionEnabled !== false;
    default:
      return true;
  }
}

/**
 * Direct DB helper to create a notification within another Convex mutation transaction
 */
export async function createNotificationHelper(
  ctx: any,
  args: {
    userId: Id<"users">;
    workspaceId: Id<"workspaces">;
    type: NotificationType;
    title: string;
    message: string;
    actionBy: Id<"users">;
    relatedResourceId: string;
    relatedResourceType: string;
    link: string;
    metadata?: any;
  }
) {
  // Prevent notifying oneself for actions triggered by oneself
  if (args.userId === args.actionBy) {
    return null;
  }

  // Check preference
  const isEnabled = await checkNotificationPreference(
    ctx,
    args.userId,
    args.workspaceId,
    args.type
  );
  if (!isEnabled) {
    return null;
  }

  // Deduplication check: avoid duplicate notifications sent within 15 seconds
  const fifteenSecondsAgo = Date.now() - 15000;
  const recent = await ctx.db
    .query("notifications")
    .withIndex("by_user_workspace_created", (q: any) =>
      q
        .eq("userId", args.userId)
        .eq("workspaceId", args.workspaceId)
        .gt("createdAt", fifteenSecondsAgo)
    )
    .collect();

  const isDuplicate = recent.some(
    (n: any) =>
      n.type === args.type &&
      n.relatedResourceId === args.relatedResourceId &&
      n.actionBy === args.actionBy
  );

  if (isDuplicate) {
    return null;
  }

  const now = Date.now();
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days retention

  return await ctx.db.insert("notifications", {
    userId: args.userId,
    workspaceId: args.workspaceId,
    type: args.type,
    title: args.title,
    message: args.message,
    read: false,
    actionBy: args.actionBy,
    relatedResourceId: args.relatedResourceId,
    relatedResourceType: args.relatedResourceType,
    link: args.link,
    metadata: args.metadata,
    createdAt: now,
    expiresAt,
  });
}

/**
 * Direct DB helper to record an activity in the workspace activity feed
 */
export async function logActivityHelper(
  ctx: any,
  args: {
    workspaceId: Id<"workspaces">;
    userId: Id<"users">;
    action: string;
    resourceType: string;
    resourceId: string;
    resourceName: string;
    description: string;
    changes?: any;
  }
) {
  return await ctx.db.insert("activity_feed", {
    workspaceId: args.workspaceId,
    userId: args.userId,
    action: args.action,
    resourceType: args.resourceType,
    resourceId: args.resourceId,
    resourceName: args.resourceName,
    description: args.description,
    changes: args.changes,
    createdAt: Date.now(),
  });
}

/* =========================================================================
 * QUERIES
 * ========================================================================= */

/**
 * 1. getUserNotifications(userId, workspaceId, limit = 20)
 * Real-time subscription returning notifications sorted unread-first, then createdAt desc.
 */
export const getUserNotifications = query({
  args: {
    userId: v.optional(v.id("users")),
    workspaceId: v.optional(v.id("workspaces")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.userId || !args.workspaceId) return [];

    const maxItems = args.limit || 20;

    // Fetch user notifications in this workspace
    const rawNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId!).eq("userId", args.userId!)
      )
      .collect();

    // Sort: Unread first, then newer createdAt first
    rawNotifications.sort((a, b) => {
      if (a.read !== b.read) {
        return a.read ? 1 : -1; // unread (false) before read (true)
      }
      return b.createdAt - a.createdAt;
    });

    const paginated = rawNotifications.slice(0, maxItems);

    // Enrich with actionBy user profile details
    const enriched = await Promise.all(
      paginated.map(async (n) => {
        let actionByUser: any = null;
        if (n.actionBy) {
          const userDoc = await ctx.db.get(n.actionBy);
          if (userDoc) {
            actionByUser = {
              _id: userDoc._id,
              name: userDoc.name || userDoc.email || "Unknown User",
              email: userDoc.email,
              avatar: userDoc.avatar,
            };
          }
        }

        return {
          notificationId: n._id,
          _id: n._id,
          type: n.type,
          title: n.title,
          message: n.message,
          read: n.read,
          readAt: n.readAt,
          actionBy: actionByUser,
          actionById: n.actionBy,
          relatedResourceId: n.relatedResourceId,
          relatedResourceType: n.relatedResourceType,
          link: n.link,
          metadata: n.metadata,
          createdAt: n.createdAt,
        };
      })
    );

    return enriched;
  },
});

/**
 * 2. getUnreadNotificationCount(userId, workspaceId)
 * Returns count of unread notifications for badge counter.
 */
export const getUnreadNotificationCount = query({
  args: {
    userId: v.optional(v.id("users")),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    if (!args.userId || !args.workspaceId) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_read", (q) =>
        q.eq("userId", args.userId!).eq("read", false)
      )
      .collect();

    // Filter to current workspace
    const workspaceUnread = unread.filter(
      (n) => n.workspaceId === args.workspaceId
    );

    return workspaceUnread.length;
  },
});

/**
 * 3. getNotificationDetails(notificationId)
 * Full notification details with expanded actor and resource metadata
 */
export const getNotificationDetails = query({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) return null;

    let actionByUser: any = null;
    if (notification.actionBy) {
      const userDoc = await ctx.db.get(notification.actionBy);
      if (userDoc) {
        actionByUser = {
          _id: userDoc._id,
          name: userDoc.name || userDoc.email,
          email: userDoc.email,
          avatar: userDoc.avatar,
        };
      }
    }

    return {
      ...notification,
      actionByUser,
    };
  },
});

/**
 * 4. getUserNotificationPreferences(userId, workspaceId)
 * Get user's notification settings for a workspace, fallback to defaults
 */
export const getUserNotificationPreferences = query({
  args: {
    userId: v.optional(v.id("users")),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    if (!args.userId || !args.workspaceId) return DEFAULT_PREFERENCES;

    const prefs = await ctx.db
      .query("notification_preferences")
      .withIndex("by_userId_workspace", (q) =>
        q.eq("userId", args.userId!).eq("workspaceId", args.workspaceId!)
      )
      .first();

    if (!prefs) {
      return {
        ...DEFAULT_PREFERENCES,
        userId: args.userId,
        workspaceId: args.workspaceId,
      };
    }

    return {
      _id: prefs._id,
      userId: prefs.userId,
      workspaceId: prefs.workspaceId,
      taskAssignedEnabled: prefs.taskAssignedEnabled,
      taskCommentedEnabled: prefs.taskCommentedEnabled,
      sprintStartedEnabled: prefs.sprintStartedEnabled,
      sprintClosedEnabled: prefs.sprintClosedEnabled,
      memberInvitedEnabled: prefs.memberInvitedEnabled,
      memberJoinedEnabled: prefs.memberJoinedEnabled,
      roleChangedEnabled: prefs.roleChangedEnabled,
      mentionEnabled: prefs.mentionEnabled,
      emailNotifications: prefs.emailNotifications,
      deliveryMethod: prefs.deliveryMethod || "in_app",
      notificationFrequency: prefs.notificationFrequency || "instant",
      updatedAt: prefs.updatedAt,
    };
  },
});

/**
 * 5. getActivityFeed(workspaceId, limit = 50, resourceType?)
 * Activity log for workspace, sorted by createdAt descending
 */
export const getActivityFeed = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    limit: v.optional(v.number()),
    resourceType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.workspaceId) return [];

    const limit = args.limit || 50;

    let feedQuery = ctx.db
      .query("activity_feed")
      .withIndex("by_workspaceId", (q) =>
        q.eq("workspaceId", args.workspaceId!)
      );

    const rawActivities = await feedQuery.collect();

    let filtered = rawActivities;
    if (args.resourceType && args.resourceType !== "all") {
      filtered = filtered.filter((a) => a.resourceType === args.resourceType);
    }

    // Sort newest first
    filtered.sort((a, b) => b.createdAt - a.createdAt);

    const sliced = filtered.slice(0, limit);

    // Enrich with user profile info
    const enriched = await Promise.all(
      sliced.map(async (act) => {
        let user: any = null;
        if (act.userId) {
          const userDoc = await ctx.db.get(act.userId);
          if (userDoc) {
            user = {
              _id: userDoc._id,
              name: userDoc.name || userDoc.email || "Unknown User",
              email: userDoc.email,
              avatar: userDoc.avatar,
            };
          }
        }
        return {
          activityId: act._id,
          _id: act._id,
          action: act.action,
          resourceType: act.resourceType,
          resourceId: act.resourceId,
          resourceName: act.resourceName,
          description: act.description,
          changes: act.changes,
          createdAt: act.createdAt,
          user,
        };
      })
    );

    return enriched;
  },
});

/* =========================================================================
 * MUTATIONS
 * ========================================================================= */

/**
 * 1. createNotification
 */
export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    type: v.union(
      v.literal("task_assigned"),
      v.literal("sprint_started"),
      v.literal("sprint_closed"),
      v.literal("invite_received"),
      v.literal("role_changed"),
      v.literal("member_joined"),
      v.literal("project_created"),
      v.literal("task_commented"),
      v.literal("task_status_changed"),
      v.literal("mention")
    ),
    title: v.string(),
    message: v.string(),
    actionBy: v.id("users"),
    relatedResourceId: v.string(),
    relatedResourceType: v.string(),
    link: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await createNotificationHelper(ctx, args);
  },
});

/**
 * 2. markNotificationAsRead(notificationId)
 */
export const markNotificationAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) return null;

    if (!notification.read) {
      await ctx.db.patch(args.notificationId, {
        read: true,
        readAt: Date.now(),
      });
    }

    return await ctx.db.get(args.notificationId);
  },
});

/**
 * 3. markAllNotificationsAsRead(userId, workspaceId)
 */
export const markAllNotificationsAsRead = mutation({
  args: {
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_read", (q) =>
        q.eq("userId", args.userId).eq("read", false)
      )
      .collect();

    const workspaceUnread = unread.filter(
      (n) => n.workspaceId === args.workspaceId
    );

    const now = Date.now();
    for (const item of workspaceUnread) {
      await ctx.db.patch(item._id, {
        read: true,
        readAt: now,
      });
    }

    return { count: workspaceUnread.length };
  },
});

/**
 * 4. deleteNotification(notificationId)
 */
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) return { success: false };

    await ctx.db.delete(args.notificationId);
    return { success: true };
  },
});

/**
 * 5. clearAllNotifications(userId, workspaceId)
 */
export const clearAllNotifications = mutation({
  args: {
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("notifications")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .collect();

    for (const item of all) {
      await ctx.db.delete(item._id);
    }

    return { success: true, count: all.length };
  },
});

/**
 * 6. updateNotificationPreferences(userId, workspaceId, preferences)
 */
export const updateNotificationPreferences = mutation({
  args: {
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    preferences: v.object({
      taskAssignedEnabled: v.boolean(),
      taskCommentedEnabled: v.boolean(),
      sprintStartedEnabled: v.boolean(),
      sprintClosedEnabled: v.boolean(),
      memberInvitedEnabled: v.boolean(),
      memberJoinedEnabled: v.boolean(),
      roleChangedEnabled: v.boolean(),
      mentionEnabled: v.boolean(),
      emailNotifications: v.boolean(),
      deliveryMethod: v.optional(v.string()),
      notificationFrequency: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notification_preferences")
      .withIndex("by_userId_workspace", (q) =>
        q.eq("userId", args.userId).eq("workspaceId", args.workspaceId)
      )
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args.preferences,
        updatedAt: now,
      });
      return await ctx.db.get(existing._id);
    } else {
      const newId = await ctx.db.insert("notification_preferences", {
        userId: args.userId,
        workspaceId: args.workspaceId,
        ...args.preferences,
        updatedAt: now,
      });
      return await ctx.db.get(newId);
    }
  },
});

/**
 * 7. logActivity(workspaceId, userId, action, resourceType, resourceId, resourceName, description, changes?)
 */
export const logActivity = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    resourceName: v.string(),
    description: v.string(),
    changes: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await logActivityHelper(ctx, args);
  },
});
