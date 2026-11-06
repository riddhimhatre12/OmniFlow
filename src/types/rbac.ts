import type { Doc, Id } from "../../convex/_generated/dataModel";

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

export type InvitationStatus = "pending" | "accepted" | "declined";

export const DEFAULT_ROLE_NAMES = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  MEMBER: "Member",
  VIEWER: "Viewer",
} as const;

export type DefaultRoleName = (typeof DEFAULT_ROLE_NAMES)[keyof typeof DEFAULT_ROLE_NAMES];

export const PERMISSIONS = {
  WORKSPACE: {
    VIEW: "view_workspace",
    EDIT: "edit_workspace",
    DELETE: "delete_workspace",
    INVITE_MEMBERS: "invite_members",
    MANAGE_ROLES: "manage_roles",
    MANAGE_MEMBERS: "manage_members",
  },
  PROJECT: {
    VIEW: "view_projects",
    CREATE: "create_project",
    EDIT: "edit_project",
    DELETE: "delete_project",
  },
  TASK: {
    VIEW: "view_tasks",
    CREATE: "create_task",
    EDIT: "edit_task",
    DELETE: "delete_task",
    ASSIGN: "assign_task",
  },
} as const;

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  avatar?: string;
  ownerId?: string;
}

export interface UserRoleInfo {
  id: string;
  name: string;
  permissions: string[];
}

export interface WorkspaceListItem {
  workspaceId: string;
  name: string;
  slug: string;
  avatar?: string;
  ownerId?: string;
  memberRole?: string;
  memberCount?: number;
}

export interface WorkspaceAuthContextType {
  workspace: WorkspaceSummary | null;
  workspaces?: WorkspaceListItem[];
  userRole: UserRoleInfo | null;
  canPerform: (permission: string) => boolean;
  canManageMembers: () => boolean;
  canDeleteWorkspace: () => boolean;
  canCreateProject: () => boolean;
  isOwner: boolean;
  isAdmin: boolean;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}


