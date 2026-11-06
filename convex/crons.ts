import { cronJobs } from "convex/server";
import { mutation, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";

/**
 * Format timestamp into human-readable date string
 */
function formatDate(timestamp?: number): string {
  if (!timestamp) return "No due date";
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Core daily digest aggregation and dispatch logic
 */
async function processDailyDigests(ctx: any, targetUserEmail?: string) {
  // Query users
  let users = await ctx.db.query("users").collect();

  if (targetUserEmail) {
    users = users.filter((u: any) => u.email === targetUserEmail);
  }

  const results = {
    processedUsers: 0,
    digestsScheduled: 0,
    skippedPreferences: 0,
    skippedNoContent: 0,
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(today);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const twoWeeksFromNow = Date.now() + 14 * 24 * 60 * 60 * 1000;

  // Pre-fetch active sprints
  const activeSprints = await ctx.db
    .query("sprints")
    .withIndex("by_status", (q: any) => q.eq("status", "active"))
    .collect();

  const sprintDeadlines = activeSprints
    .filter(
      (sprint: any) =>
        sprint.endDate &&
        sprint.endDate >= Date.now() &&
        sprint.endDate < twoWeeksFromNow
    )
    .map((sprint: any) => ({
      sprintName: sprint.name,
      daysUntilEnd: Math.max(
        1,
        Math.ceil((sprint.endDate - Date.now()) / (24 * 60 * 60 * 1000))
      ),
    }));

  // Pre-fetch recent comments for mention matching
  const recentComments = await ctx.db
    .query("task_comments")
    .filter((q: any) => q.gte(q.field("createdAt"), oneDayAgo))
    .collect();

  for (const user of users) {
    results.processedUsers++;

    // 1. Check user notification preferences
    const prefs = await ctx.db
      .query("notification_preferences")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .first();

    // If preferences exist and user explicitly disabled email notifications, skip
    if (prefs && prefs.emailNotifications === false) {
      results.skippedPreferences++;
      continue;
    }

    // 2. Query tasks assigned to user
    const tasksAssigned = await ctx.db
      .query("tasks")
      .withIndex("by_assigneeId", (q: any) => q.eq("assigneeId", user._id))
      .collect();

    // Only consider non-completed tasks
    const activeTasks = tasksAssigned.filter((t: any) => t.status !== "done");

    // 3. Tasks due today
    const dueTodayTasks = activeTasks.filter(
      (task: any) =>
        task.dueDate &&
        task.dueDate >= today.getTime() &&
        task.dueDate < tomorrowStart.getTime()
    );

    // 4. Mentions in comments in the last 24h
    const mentions = recentComments.filter(
      (c: any) =>
        !c.isDeleted &&
        c.mentions &&
        Array.isArray(c.mentions) &&
        c.mentions.some((m: any) => m.userId === user._id)
    );

    // 5. Only send if there is relevant activity to report
    if (
      activeTasks.length === 0 &&
      dueTodayTasks.length === 0 &&
      mentions.length === 0
    ) {
      results.skippedNoContent++;
      continue;
    }

    // 6. Format top 5 tasks with project names
    const taskList = [];
    for (const task of activeTasks.slice(0, 5)) {
      const project = await ctx.db.get(task.projectId);
      taskList.push({
        title: task.title,
        projectName: project?.name || "Productflow Project",
        dueDate: formatDate(task.dueDate),
      });
    }

    // 7. Schedule email action asynchronously
    ctx.scheduler.runAfter(0, api.mailer.sendDailyDigestEmail, {
      userEmail: user.email,
      userName: user.name || user.email.split("@")[0],
      tasksAssigned: taskList,
      dueTodayCount: dueTodayTasks.length,
      upcomingDeadlines: sprintDeadlines,
      mentionCount: mentions.length,
    });

    results.digestsScheduled++;
  }

  console.log("[DailyDigestCron] Run complete:", results);
  return results;
}

/**
 * Internal mutation called by the scheduled cron job
 */
export const sendDailyDigestsInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await processDailyDigests(ctx);
  },
});

/**
 * Public mutation to manually trigger daily digests (useful for testing or immediate dispatch)
 */
export const triggerDailyDigests = mutation({
  args: {
    testUserEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await processDailyDigests(ctx, args.testUserEmail);
  },
});

// ============================================================================
// CONVEX CRON JOB REGISTRATION
// Runs daily at 9:00 AM UTC
// ============================================================================
const crons = cronJobs();

crons.cron(
  "Productflow Daily Digest Emails",
  "0 9 * * *",
  internal.crons.sendDailyDigestsInternal
);

export default crons;
