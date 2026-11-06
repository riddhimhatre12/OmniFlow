/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as attachments from "../attachments.js";
import type * as auth from "../auth.js";
import type * as cloudinary from "../cloudinary.js";
import type * as comments from "../comments.js";
import type * as crons from "../crons.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as mailer from "../mailer.js";
import type * as members from "../members.js";
import type * as milestones from "../milestones.js";
import type * as notifications from "../notifications.js";
import type * as projects from "../projects.js";
import type * as roles from "../roles.js";
import type * as sprints from "../sprints.js";
import type * as tasks from "../tasks.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  attachments: typeof attachments;
  auth: typeof auth;
  cloudinary: typeof cloudinary;
  comments: typeof comments;
  crons: typeof crons;
  emailTemplates: typeof emailTemplates;
  mailer: typeof mailer;
  members: typeof members;
  milestones: typeof milestones;
  notifications: typeof notifications;
  projects: typeof projects;
  roles: typeof roles;
  sprints: typeof sprints;
  tasks: typeof tasks;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
