import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logActivityHelper } from "./notifications";

declare const process: {
  env: Record<string, string | undefined>;
};

// Generate upload configuration for client-side direct upload
export const generateUploadSignature = mutation({
  args: {
    uploadPreset: v.string(),
    folder: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    // Valid preset candidates (with environment or default values)
    const validPresets = [
      process.env.CLOUDINARY_PRESET_ATTACHMENTS || "omniflow_attachments",
      process.env.CLOUDINARY_PRESET_AVATARS || "omniflow_avatars",
      process.env.CLOUDINARY_PRESET_LOGOS || "omniflow_workspace_logos",
      "omniflow_attachments",
      "omniflow_avatars",
      "omniflow_workspace_logos",
    ];

    if (!validPresets.includes(args.uploadPreset)) {
      throw new Error(`Invalid upload preset: ${args.uploadPreset}`);
    }

    const cloudName =
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.VITE_CLOUDINARY_CLOUD_NAME ||
      "";

    // For unsigned uploads, return cloud name, preset and target folder
    return {
      cloudName,
      uploadPreset: args.uploadPreset,
      folder: args.folder || "",
    };
  },
});

// Process upload response and save metadata to database
export const saveAttachmentMetadata = mutation({
  args: {
    taskId: v.id("tasks"),
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    fileName: v.string(),
    cloudinaryPublicId: v.string(),
    cloudinaryUrl: v.string(),
    cloudinarySecureUrl: v.string(),
    cloudinaryFormat: v.string(),
    cloudinaryResourceType: v.string(),
    cloudinaryBytes: v.number(),
    cloudinaryVersion: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Verify user has workspace access
    const isOwner = workspace.ownerId === args.userId;
    const workspaceMember = await ctx.db
      .query("workspace_members")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .first();

    if (!isOwner && !workspaceMember) {
      throw new Error("User does not have access to this workspace");
    }

    // Verify task belongs to workspace
    const task = await ctx.db.get(args.taskId);
    if (!task || task.workspaceId !== args.workspaceId) {
      throw new Error("Task not found in workspace");
    }

    const now = Date.now();

    // Save attachment metadata
    const attachmentId = await ctx.db.insert("task_attachments", {
      taskId: args.taskId,
      workspaceId: args.workspaceId,
      uploadedBy: args.userId,
      fileName: args.fileName,
      fileType: args.cloudinaryFormat,
      fileSize: args.cloudinaryBytes,
      storageKey: args.cloudinaryPublicId,
      url: args.cloudinarySecureUrl,
      cloudinaryPublicId: args.cloudinaryPublicId,
      cloudinaryUrl: args.cloudinaryUrl,
      cloudinarySecureUrl: args.cloudinarySecureUrl,
      cloudinaryFormat: args.cloudinaryFormat,
      cloudinaryResourceType: args.cloudinaryResourceType,
      cloudinaryBytes: args.cloudinaryBytes,
      cloudinaryVersion: args.cloudinaryVersion,
      description: args.description || "",
      uploadedAt: now,
      isDeleted: false,
    });

    const user = await ctx.db.get(args.userId);
    const uploaderName = user?.name || "A team member";

    // Log activity feed
    await logActivityHelper(ctx, {
      workspaceId: args.workspaceId,
      userId: args.userId,
      action: "file_uploaded",
      resourceType: "task",
      resourceId: args.taskId,
      resourceName: task.title,
      description: `${uploaderName} uploaded "${args.fileName}" to task "${task.title}"`,
      changes: {
        attachmentId,
        fileName: args.fileName,
        fileSize: args.cloudinaryBytes,
        cloudinaryPublicId: args.cloudinaryPublicId,
      },
    });

    return attachmentId;
  },
});

// Save avatar metadata
export const saveAvatarMetadata = mutation({
  args: {
    userId: v.id("users"),
    cloudinaryPublicId: v.string(),
    cloudinaryUrl: v.string(),
    cloudinarySecureUrl: v.string(),
    cloudinaryFormat: v.string(),
    cloudinaryBytes: v.number(),
  },
  handler: async (ctx, args) => {
    // Delete old avatar record if exists
    const oldAvatar = await ctx.db
      .query("user_avatars")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (oldAvatar) {
      await ctx.db.delete(oldAvatar._id);
    }

    // Save new avatar
    await ctx.db.insert("user_avatars", {
      userId: args.userId,
      cloudinaryPublicId: args.cloudinaryPublicId,
      cloudinaryUrl: args.cloudinaryUrl,
      cloudinarySecureUrl: args.cloudinarySecureUrl,
      format: args.cloudinaryFormat,
      bytes: args.cloudinaryBytes,
      uploadedAt: Date.now(),
    });

    // Update user profile with avatar URL
    await ctx.db.patch(args.userId, {
      avatar: args.cloudinarySecureUrl,
    });

    return { success: true, avatarUrl: args.cloudinarySecureUrl };
  },
});

// Save workspace logo metadata
export const saveWorkspaceLogoMetadata = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    cloudinaryPublicId: v.string(),
    cloudinaryUrl: v.string(),
    cloudinarySecureUrl: v.string(),
    cloudinaryFormat: v.string(),
    cloudinaryBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const isOwner = workspace.ownerId === args.userId;

    if (!isOwner) {
      // Verify user is workspace owner/admin via roles
      const member = await ctx.db
        .query("workspace_members")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
        )
        .first();

      if (!member) {
        throw new Error("User not in workspace");
      }

      const role = await ctx.db.get(member.roleId);
      if (role?.name !== "Owner" && role?.name !== "Admin") {
        throw new Error("Only Owner/Admin can change workspace logo");
      }
    }

    // Delete old logo if exists
    const oldLogo = await ctx.db
      .query("workspace_logos")
      .withIndex("by_workspaceId", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .first();

    if (oldLogo) {
      await ctx.db.delete(oldLogo._id);
    }

    // Save new logo
    await ctx.db.insert("workspace_logos", {
      workspaceId: args.workspaceId,
      cloudinaryPublicId: args.cloudinaryPublicId,
      cloudinaryUrl: args.cloudinaryUrl,
      cloudinarySecureUrl: args.cloudinarySecureUrl,
      format: args.cloudinaryFormat,
      bytes: args.cloudinaryBytes,
      uploadedAt: Date.now(),
      uploadedBy: args.userId,
    });

    // Update workspace with logo URL
    await ctx.db.patch(args.workspaceId, {
      avatar: args.cloudinarySecureUrl,
      updatedAt: Date.now(),
    });

    return { success: true, logoUrl: args.cloudinarySecureUrl };
  },
});

// Get signed delete token (if using signed deletes)
export const generateDeleteSignature = mutation({
  args: {
    publicId: v.string(),
  },
  handler: async (_ctx, _args) => {
    // In production, verify user has permission to delete this resource
    throw new Error("Use task detail modal's delete button instead");
  },
});

// Query to get attachment download URL with transformations
export const getAttachmentUrl = query({
  args: {
    attachmentId: v.id("task_attachments"),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    format: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId);

    if (!attachment || attachment.isDeleted) {
      throw new Error("Attachment not found");
    }

    // Build Cloudinary URL with optional transformations
    let url = attachment.cloudinarySecureUrl || attachment.url || "";

    if (url && (args.width || args.height || args.format) && url.includes("/upload/")) {
      const transformations: string[] = [];

      if (args.width && args.height) {
        transformations.push(`w_${args.width},h_${args.height},c_fill`);
      } else if (args.width) {
        transformations.push(`w_${args.width},c_scale`);
      } else if (args.height) {
        transformations.push(`h_${args.height},c_scale`);
      }

      if (args.format) {
        transformations.push(`f_${args.format}`);
      }

      if (transformations.length > 0) {
        url = url.replace("/upload/", `/upload/${transformations.join(",")}/`);
      }
    }

    return url;
  },
});
