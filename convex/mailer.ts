import { v } from "convex/values";
import { action } from "./_generated/server";
import {
  workspaceInvitationEmail,
  dailyDigestEmail,
  taskAssignmentEmail,
} from "./emailTemplates";

declare const process: {
  env: Record<string, string | undefined>;
};

/**
 * Send an email via Resend API
 */
async function sendEmailResend(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "notifications@omniflow.app";
  const fromName = process.env.RESEND_FROM_NAME || "Productflow Notifications";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Mailer] Resend API error (${response.status}):`, errorText);
    throw new Error(`Resend error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  console.log(`[Mailer] Resend email successfully delivered to ${to}:`, result.id);
  return { success: true, provider: "resend", id: result.id };
}

/**
 * Send an email via SendGrid API
 */
async function sendEmailSendGrid(to: string, subject: string, html: string) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "notifications@omniflow.app";
  const fromName = process.env.SENDGRID_FROM_NAME || "Productflow";

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: fromName },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Mailer] SendGrid API error (${response.status}):`, errorText);
    throw new Error(`SendGrid error (${response.status}): ${errorText}`);
  }

  console.log(`[Mailer] SendGrid email successfully accepted for ${to}`);
  return { success: true, provider: "sendgrid" };
}

/**
 * Send an email via Vercel Gmail SMTP endpoint
 */
async function sendEmailGmailSMTP(to: string, subject: string, html: string) {
  const endpoint =
    process.env.GMAIL_SMTP_ENDPOINT ||
    `${process.env.VITE_APP_URL || "http://localhost:5173"}/api/send-email`;
  const mailerSecret = process.env.MAILER_SECRET;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (mailerSecret) {
    headers["Authorization"] = `Bearer ${mailerSecret}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ to, subject, html }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Mailer] Gmail SMTP endpoint error (${response.status}):`, errorText);
    throw new Error(`Gmail SMTP error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  console.log(`[Mailer] Gmail email successfully sent to ${to}:`, result);
  return { success: true, provider: "gmail", messageId: result.messageId };
}

/**
 * Unified email dispatcher with automatic fallback
 */
export async function dispatchEmail(to: string, subject: string, html: string) {
  if (process.env.GMAIL_SMTP_ENDPOINT || process.env.USE_GMAIL_SMTP === "true") {
    return await sendEmailGmailSMTP(to, subject, html);
  } else if (process.env.RESEND_API_KEY) {
    return await sendEmailResend(to, subject, html);
  } else if (process.env.SENDGRID_API_KEY) {
    return await sendEmailSendGrid(to, subject, html);
  } else {
    // Development / mock fallback when no key is configured
    console.warn(
      `[Mailer:Mock] No email provider configured (missing GMAIL_SMTP_ENDPOINT, RESEND_API_KEY, or SENDGRID_API_KEY). Mocking email delivery to "${to}" with subject: "${subject}".`
    );
    return {
      success: true,
      provider: "mock",
      mocked: true,
      deliveredTo: to,
      subject,
      timestamp: Date.now(),
    };
  }
}

/**
 * 1. sendInvitationEmail action
 */
export const sendInvitationEmail = action({
  args: {
    inviteeEmail: v.string(),
    inviteeName: v.string(),
    inviterName: v.string(),
    workspaceName: v.string(),
    roleName: v.string(),
    invitationToken: v.string(),
  },
  handler: async (_ctx, args) => {
    const appUrl = process.env.VITE_APP_URL || "http://localhost:5173";
    const acceptLink = `${appUrl}/join?token=${encodeURIComponent(args.invitationToken)}`;
    const declineLink = `${appUrl}/join?token=${encodeURIComponent(args.invitationToken)}&decline=true`;

    const htmlContent = workspaceInvitationEmail({
      inviterName: args.inviterName,
      workspaceName: args.workspaceName,
      roleNamereadable: args.roleName,
      acceptLink,
      declineLink,
    });

    return await dispatchEmail(
      args.inviteeEmail,
      `You're invited to ${args.workspaceName} on Productflow`,
      htmlContent
    );
  },
});

/**
 * 2. sendTaskAssignmentEmail action
 */
export const sendTaskAssignmentEmail = action({
  args: {
    assigneeEmail: v.string(),
    assigneeName: v.string(),
    assignerName: v.string(),
    taskTitle: v.string(),
    projectName: v.string(),
    taskDescription: v.optional(v.string()),
    priority: v.string(),
    dueDate: v.string(),
    taskId: v.string(),
    projectId: v.string(),
  },
  handler: async (_ctx, args) => {
    const appUrl = process.env.VITE_APP_URL || "http://localhost:5173";
    const taskLink = `${appUrl}/projects/${args.projectId}/tasks?id=${args.taskId}`;

    const htmlContent = taskAssignmentEmail({
      assigneeName: args.assigneeName,
      assignerName: args.assignerName,
      taskTitle: args.taskTitle,
      projectName: args.projectName,
      taskDescription: args.taskDescription || "",
      priority: args.priority,
      dueDate: args.dueDate,
      taskLink,
    });

    return await dispatchEmail(
      args.assigneeEmail,
      `Task assigned: ${args.taskTitle}`,
      htmlContent
    );
  },
});

/**
 * 3. sendDailyDigestEmail action
 */
export const sendDailyDigestEmail = action({
  args: {
    userEmail: v.string(),
    userName: v.string(),
    tasksAssigned: v.array(
      v.object({
        title: v.string(),
        projectName: v.string(),
        dueDate: v.string(),
      })
    ),
    dueTodayCount: v.number(),
    upcomingDeadlines: v.array(
      v.object({
        sprintName: v.string(),
        daysUntilEnd: v.number(),
      })
    ),
    mentionCount: v.number(),
  },
  handler: async (_ctx, args) => {
    const appUrl = process.env.VITE_APP_URL || "http://localhost:5173";
    const dashboardLink = `${appUrl}/dashboard`;

    const htmlContent = dailyDigestEmail({
      userName: args.userName,
      tasksAssigned: args.tasksAssigned,
      dueTodayCount: args.dueTodayCount,
      upcomingDeadlines: args.upcomingDeadlines,
      mentionCount: args.mentionCount,
      dashboardLink,
    });

    return await dispatchEmail(
      args.userEmail,
      `Your Daily Productflow Digest ✨`,
      htmlContent
    );
  },
});

/**
 * 4. sendGenericEmail action (for system alerts or test verification)
 */
export const sendGenericEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (_ctx, args) => {
    return await dispatchEmail(args.to, args.subject, args.html);
  },
});
