import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

export const PERMISSIONS = [
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
  "task:comment",
  "member:invite",
  "member:remove",
  "member:update_role",
  "role:manage",
  "report:view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const INVITATION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
} as const;

export type InvitationStatus = (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS];

export const SPRINT_STATUS = {
  PLANNING: "planning",
  ACTIVE: "active",
  CLOSED: "closed",
} as const;

export type SprintStatus = (typeof SPRINT_STATUS)[keyof typeof SPRINT_STATUS];

export const TASK_STATUS = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  IN_REVIEW: "in_review",
  DONE: "done",
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const TASK_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export type TaskPriority = (typeof TASK_PRIORITY)[keyof typeof TASK_PRIORITY];

export default defineSchema({
  // Users collection with authentication & profile attributes
  users: defineTable({
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(),
    role: v.optional(v.string()),
    avatar: v.optional(v.string()),
    title: v.optional(v.string()),
    department: v.optional(v.string()),
    bio: v.optional(v.string()),
    timezone: v.optional(v.string()),
    createdAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  // 1. Workspaces table
  workspaces: defineTable({
    name: v.string(),
    slug: v.string(), // unique URL-friendly slug
    description: v.optional(v.string()),
    ownerId: v.id("users"), // Foreign key ref to users
    avatar: v.optional(v.string()), // Image URL or color token
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_slug", ["slug"]),

  // 2. Roles table (per-workspace role definitions)
  roles: defineTable({
    workspaceId: v.id("workspaces"), // Foreign key ref to workspaces
    name: v.string(), // e.g. "Owner", "Admin", "Manager", "Member", "Viewer"
    description: v.optional(v.string()),
    isDefault: v.boolean(), // true for predefined / template roles
    permissions: v.array(v.string()), // e.g. ["project:create", "task:delete", "member:invite"]
    createdAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspace_and_name", ["workspaceId", "name"]),

  // 3. Workspace Members table (junction between workspaces, users, and roles)
  workspace_members: defineTable({
    workspaceId: v.id("workspaces"), // Foreign key ref to workspaces
    userId: v.id("users"), // Foreign key ref to users
    roleId: v.id("roles"), // Foreign key ref to roles
    joinedAt: v.number(),
    invitedAt: v.optional(v.number()),
    invitedBy: v.optional(v.id("users")), // Foreign key ref to users
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_userId", ["userId"])
    // Compound index to query & enforce UNIQUE constraint: (workspaceId, userId)
    .index("by_workspace_and_user", ["workspaceId", "userId"])
    .index("by_roleId", ["roleId"]),

  // 4. Invitations table
  invitations: defineTable({
    workspaceId: v.id("workspaces"), // Foreign key ref to workspaces
    invitedEmail: v.string(),
    invitedBy: v.id("users"), // Foreign key ref to users
    roleId: v.id("roles"), // Foreign key ref to roles
    token: v.string(), // Unique link token for invitation acceptance
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined")
    ),
    expiresAt: v.number(), // Timestamp (24 hours from creation)
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_workspaceId", ["workspaceId"])
    .index("by_invitedEmail", ["invitedEmail"])
    // Compound index for checking existing pending invitations for an email in a workspace
    .index("by_workspace_and_email", ["workspaceId", "invitedEmail"]),

  // 5. Projects table
  projects: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("planning"),
      v.literal("in_progress"),
      v.literal("on_hold"),
      v.literal("completed")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    startDate: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    leadId: v.optional(v.id("users")), // Project lead / owner
    color: v.optional(v.string()), // Theme color for project card
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspace_and_slug", ["workspaceId", "slug"])
    .index("by_workspace_and_status", ["workspaceId", "status"])
    .index("by_leadId", ["leadId"]),

  // 6. Sprints table
  // Design Note: Enables agile sprint iterations within a project. Sprints have a lifecycle
  // (planning -> active -> closed) and track velocity via capacity and completed story points.
  sprints: defineTable({
    workspaceId: v.id("workspaces"), // Workspace scope for multi-tenant isolation
    projectId: v.id("projects"), // Parent project containing this sprint
    name: v.string(), // e.g., "Sprint 1", "Q4 2024 - Sprint 2"
    description: v.optional(v.string()), // Optional sprint planning context
    status: v.union(
      v.literal("planning"),
      v.literal("active"),
      v.literal("closed")
    ), // Sprint state machine
    goal: v.optional(v.string()), // High-level sprint milestone or target deliverable
    startDate: v.optional(v.number()), // Planned start epoch timestamp
    endDate: v.optional(v.number()), // Target completion epoch timestamp
    capacity: v.optional(v.number()), // Total story point capacity committed by team
    completedPoints: v.number(), // Aggregated story points completed upon task done (default 0)
    order: v.number(), // Sequential order for sprint roadmaps and backlogs
    createdAt: v.number(), // Audit timestamp
    updatedAt: v.number(), // Last modified timestamp
    createdBy: v.id("users"), // Scrum master or team member who initiated sprint
  })
    .index("by_projectId", ["projectId"])
    .index("by_workspaceId", ["workspaceId"])
    .index("by_status", ["status"])
    .index("by_project_and_status", ["projectId", "status"]),

  // 7. Tasks table
  // Design Note: Work units executable across sprints or remaining in product backlog (sprintId == undefined).
  // Includes story points for Agile planning, priority, assignee assignment, and order for Kanban drag-drop.
  tasks: defineTable({
    workspaceId: v.id("workspaces"), // Tenant isolation boundary
    projectId: v.id("projects"), // Associated project
    sprintId: v.optional(v.id("sprints")), // Sprint assignment (null/omitted = in product backlog)
    title: v.string(), // Task title / summary
    description: v.optional(v.string()), // Acceptance criteria, details, or markdown
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("in_review"),
      v.literal("done")
    ), // Kanban column state
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ), // Urgency classification
    storyPoints: v.optional(v.number()), // Fibonacci estimation: 1, 2, 3, 5, 8, 13
    assigneeId: v.optional(v.id("users")), // Designated owner / assignee
    dueDate: v.optional(v.number()), // Delivery target deadline
    order: v.number(), // Fractional or integer rank for drag-and-drop within column/sprint
    createdAt: v.number(), // Audit trail
    createdBy: v.id("users"), // Author of work item
    updatedAt: v.number(), // Last updated timestamp
  })
    .index("by_projectId", ["projectId"])
    .index("by_sprintId", ["sprintId"])
    .index("by_workspaceId", ["workspaceId"])
    .index("by_assigneeId", ["assigneeId"])
    .index("by_sprint_and_status", ["sprintId", "status"])
    .index("by_project_and_sprint", ["projectId", "sprintId"])
    .index("by_project_and_status", ["projectId", "status"]),

  // 8. Sprint Activities table
  // Design Note: Audit log tracking sprint state transitions, scope changes (adding/removing tasks),
  // and sprint completion retrospectives.
  sprint_activities: defineTable({
    sprintId: v.id("sprints"), // Target sprint reference
    workspaceId: v.id("workspaces"), // Workspace boundary
    action: v.string(), // e.g., "sprint_created", "sprint_started", "task_added_to_sprint", "sprint_completed"
    userId: v.id("users"), // Actor who triggered the action
    details: v.optional(v.string()), // JSON metadata or contextual remarks
    createdAt: v.number(), // Audit timestamp
  })
    .index("by_sprintId", ["sprintId"])
    .index("by_workspaceId", ["workspaceId"]),

  // 9. Notifications table (Prompt 1.1)
  notifications: defineTable({
    userId: v.id("users"), // Recipient
    workspaceId: v.id("workspaces"), // Workspace boundary
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
    read: v.boolean(),
    readAt: v.optional(v.number()),
    actionBy: v.id("users"), // Triggering actor
    relatedResourceId: v.string(),
    relatedResourceType: v.string(),
    link: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_workspaceId", ["workspaceId"])
    .index("by_userId_and_read", ["userId", "read"])
    .index("by_createdAt", ["createdAt"])
    .index("by_workspace_and_user", ["workspaceId", "userId"])
    .index("by_user_workspace_created", ["userId", "workspaceId", "createdAt"]),

  // 10. Activity Feed table (Prompt 1.1)
  activity_feed: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    action: v.string(), // e.g. "task_created", "sprint_started", "member_invited", "role_updated"
    resourceType: v.string(), // task, project, sprint, member, workspace
    resourceId: v.string(),
    resourceName: v.string(),
    changes: v.optional(v.any()),
    description: v.string(),
    createdAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_userId", ["userId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_resourceType", ["resourceType"])
    .index("by_workspace_and_created", ["workspaceId", "createdAt"]),

  // 11. Notification Preferences table (Prompt 1.1)
  notification_preferences: defineTable({
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    taskAssignedEnabled: v.boolean(),
    taskCommentedEnabled: v.boolean(),
    sprintStartedEnabled: v.boolean(),
    sprintClosedEnabled: v.boolean(),
    memberInvitedEnabled: v.boolean(),
    memberJoinedEnabled: v.boolean(),
    roleChangedEnabled: v.boolean(),
    mentionEnabled: v.boolean(),
    emailNotifications: v.boolean(),
    deliveryMethod: v.optional(v.string()), // "in_app" | "email_and_in_app"
    notificationFrequency: v.optional(v.string()), // "instant" | "daily" | "weekly"
    updatedAt: v.optional(v.number()),
  })
    .index("by_userId_workspace", ["userId", "workspaceId"])
    .index("by_userId", ["userId"]),

  // 12. Task Comments table (Prompt 2.1)
  task_comments: defineTable({
    taskId: v.id("tasks"),
    workspaceId: v.id("workspaces"),
    userId: v.id("users"), // who wrote comment
    content: v.string(), // markdown or plain text
    mentions: v.array(
      v.object({
        userId: v.id("users"),
        userName: v.string(),
      })
    ),
    reactions: v.optional(v.record(v.string(), v.array(v.string()))), // e.g. { "👍": [userId1, userId2] }
    createdAt: v.number(),
    updatedAt: v.number(),
    editedBy: v.optional(v.id("users")),
    isDeleted: v.boolean(), // soft delete for audit
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id("users")),
  })
    .index("by_taskId", ["taskId"])
    .index("by_userId", ["userId"])
    .index("by_workspaceId", ["workspaceId"])
    .index("by_taskId_and_createdAt", ["taskId", "createdAt"]),

  // 13. Task Attachments table (Prompt 2.1 & Cloudinary)
  task_attachments: defineTable({
    taskId: v.id("tasks"),
    workspaceId: v.id("workspaces"),
    uploadedBy: v.id("users"),
    fileName: v.string(),
    fileType: v.string(), // e.g. "image/png", "application/pdf"
    fileSize: v.number(), // bytes
    storageKey: v.optional(v.string()), // Convex file storage key / storageId (optional for Cloudinary)
    url: v.optional(v.string()), // downloadable URL
    description: v.optional(v.string()),
    uploadedAt: v.number(),

    // Cloudinary fields
    cloudinaryPublicId: v.optional(v.string()),    // e.g., "omniflow/attachments/abc123xyz"
    cloudinaryUrl: v.optional(v.string()),          // e.g., "https://res.cloudinary.com/..."
    cloudinarySecureUrl: v.optional(v.string()),    // HTTPS URL
    cloudinaryFormat: v.optional(v.string()),       // e.g., "pdf", "jpg"
    cloudinaryResourceType: v.optional(v.string()), // "image" | "video" | "raw"
    cloudinaryBytes: v.optional(v.number()),        // File size from Cloudinary
    cloudinaryVersion: v.optional(v.number()),      // Version timestamp

    isDeleted: v.boolean(), // soft delete
    deletedAt: v.optional(v.number()),
  })
    .index("by_taskId", ["taskId"])
    .index("by_uploadedBy", ["uploadedBy"])
    .index("by_workspaceId", ["workspaceId"])
    .index("by_taskId_and_uploadedAt", ["taskId", "uploadedAt"]),

  // User Avatars table (Cloudinary)
  user_avatars: defineTable({
    userId: v.id("users"),
    cloudinaryPublicId: v.string(),
    cloudinaryUrl: v.string(),
    cloudinarySecureUrl: v.string(),
    format: v.string(),
    bytes: v.number(),
    uploadedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // Workspace Logos table (Cloudinary)
  workspace_logos: defineTable({
    workspaceId: v.id("workspaces"),
    cloudinaryPublicId: v.string(),
    cloudinaryUrl: v.string(),
    cloudinarySecureUrl: v.string(),
    format: v.string(),
    bytes: v.number(),
    uploadedAt: v.number(),
    uploadedBy: v.id("users"),
  }).index("by_workspaceId", ["workspaceId"]),

  // 14. Task Subscribers table (Prompt 2.1)
  task_subscribers: defineTable({
    taskId: v.id("tasks"),
    userId: v.id("users"),
    subscribedAt: v.number(),
  })
    .index("by_taskId", ["taskId"])
    .index("by_userId", ["userId"])
    .index("by_taskId_and_userId", ["taskId", "userId"]),

  // 15. Project Milestones table (Prompt 3.2)
  project_milestones: defineTable({
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
    name: v.string(), // e.g. "v1.0 Release", "Beta Launch"
    description: v.optional(v.string()),
    targetDate: v.number(), // timestamp
    status: v.union(
      v.literal("planned"),
      v.literal("on_track"),
      v.literal("at_risk"),
      v.literal("completed")
    ),
    completedDate: v.optional(v.number()),
    linkedSprints: v.array(v.id("sprints")),
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_projectId", ["projectId"])
    .index("by_workspaceId", ["workspaceId"])
    .index("by_targetDate", ["targetDate"])
    .index("by_status", ["status"])
    .index("by_project_and_targetDate", ["projectId", "targetDate"]),
});

// Full TypeScript type definitions for application use
export type UserDoc = Doc<"users">;
export type UserId = Id<"users">;

export type WorkspaceDoc = Doc<"workspaces">;
export type WorkspaceId = Id<"workspaces">;

export type RoleDoc = Doc<"roles">;
export type RoleId = Id<"roles">;

export type WorkspaceMemberDoc = Doc<"workspace_members">;
export type WorkspaceMemberId = Id<"workspace_members">;

export type InvitationDoc = Doc<"invitations">;
export type InvitationId = Id<"invitations">;

export type ProjectDoc = Doc<"projects">;
export type ProjectId = Id<"projects">;

export type SprintDoc = Doc<"sprints">;
export type SprintId = Id<"sprints">;

export type TaskDoc = Doc<"tasks">;
export type TaskId = Id<"tasks">;

export type SprintActivityDoc = Doc<"sprint_activities">;
export type SprintActivityId = Id<"sprint_activities">;

export type NotificationDoc = Doc<"notifications">;
export type NotificationId = Id<"notifications">;

export type ActivityFeedDoc = Doc<"activity_feed">;
export type ActivityFeedId = Id<"activity_feed">;

export type NotificationPreferenceDoc = Doc<"notification_preferences">;
export type NotificationPreferenceId = Id<"notification_preferences">;

export type TaskCommentDoc = Doc<"task_comments">;
export type TaskCommentId = Id<"task_comments">;

export type TaskAttachmentDoc = Doc<"task_attachments">;
export type TaskAttachmentId = Id<"task_attachments">;

export type UserAvatarDoc = Doc<"user_avatars">;
export type UserAvatarId = Id<"user_avatars">;

export type WorkspaceLogoDoc = Doc<"workspace_logos">;
export type WorkspaceLogoId = Id<"workspace_logos">;

export type TaskSubscriberDoc = Doc<"task_subscribers">;
export type TaskSubscriberId = Id<"task_subscribers">;

export type CommentMention = {
  userId: Id<"users">;
  userName: string;
};

export type CommentReactions = Record<string, string[]>;

export type ProjectMilestoneDoc = Doc<"project_milestones">;
export type ProjectMilestoneId = Id<"project_milestones">;
export type MilestoneStatus = "planned" | "on_track" | "at_risk" | "completed";
