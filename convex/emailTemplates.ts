/**
 * Productflow Transactional Email Templates
 * Responsive, modern HTML email templates for transactional and notification emails.
 */

// Helper to escape HTML characters in dynamic data
function escapeHtml(str: string | undefined | null): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 1. Workspace Invitation Email Template
export const workspaceInvitationEmail = (data: {
  inviterName: string;
  workspaceName: string;
  roleNamereadable: string;
  acceptLink: string;
  declineLink: string;
}) => {
  const inviter = escapeHtml(data.inviterName);
  const workspace = escapeHtml(data.workspaceName);
  const role = escapeHtml(data.roleNamereadable);
  const acceptLink = data.acceptLink;
  const declineLink = data.declineLink;

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>You're invited to ${workspace}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; line-height: 1.6;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 15px;">
      <tr>
        <td align="center">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);">
            <!-- Header with Productflow Brand -->
            <tr>
              <td style="padding: 32px 36px 20px 36px; text-align: left; background: linear-gradient(135deg, #1e1b4b 0%, #1e293b 100%); border-bottom: 1px solid #334155;">
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                  <span style="font-size: 24px; font-weight: 800; background: linear-gradient(135deg, #6366f1, #a855f7); -webkit-background-clip: text; color: #a855f7; letter-spacing: -0.5px;">
                    Productflow
                  </span>
                </div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #f8fafc; line-height: 1.3;">
                  You're invited to join <span style="color: #818cf8;">${workspace}</span> 🎉
                </h1>
              </td>
            </tr>

            <!-- Body Content -->
            <tr>
              <td style="padding: 32px 36px;">
                <p style="margin-top: 0; margin-bottom: 18px; font-size: 15px; color: #cbd5e1;">
                  Hi there,
                </p>
                <p style="margin-top: 0; margin-bottom: 24px; font-size: 15px; color: #cbd5e1;">
                  <strong style="color: #f1f5f9;">${inviter}</strong> has invited you to collaborate in the workspace <strong style="color: #f1f5f9;">${workspace}</strong> as a <span style="display: inline-block; background-color: #312e81; color: #c7d2fe; font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 9999px; border: 1px solid #4338ca;">${role}</span>.
                </p>

                <!-- Primary CTA -->
                <table border="0" cellspacing="0" cellpadding="0" style="margin: 30px 0 24px 0;">
                  <tr>
                    <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);">
                      <a href="${acceptLink}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 10px; letter-spacing: 0.2px;">
                        Accept Invitation &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Secondary Link -->
                <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 14px; margin-bottom: 24px;">
                  <p style="margin: 0 0 6px 0; font-size: 12px; color: #94a3b8; font-weight: 500;">
                    Or copy and paste this URL into your browser:
                  </p>
                  <p style="margin: 0; font-size: 12px; word-break: break-all; color: #818cf8; font-family: monospace;">
                    <a href="${acceptLink}" style="color: #818cf8; text-decoration: none;">${acceptLink}</a>
                  </p>
                </div>

                <!-- Expiration notice & Decline link -->
                <p style="margin: 20px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                  ⏱ This invitation will expire in <strong>24 hours</strong>.
                  <br />
                  Not interested? <a href="${declineLink}" style="color: #94a3b8; text-decoration: underline;">Decline invitation</a>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 24px 36px; background-color: #111827; border-top: 1px solid #1f2937; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
                  Productflow &bull; Modern Project Management &amp; Collaboration
                </p>
                <p style="margin: 0; font-size: 11px; color: #475569;">
                  &copy; ${new Date().getFullYear()} Productflow. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
};

// 2. Task Assignment Email Template
export const taskAssignmentEmail = (data: {
  assigneeName: string;
  assignerName: string;
  taskTitle: string;
  projectName: string;
  taskDescription?: string;
  priority: string;
  dueDate: string;
  taskLink: string;
  appUrl?: string;
}) => {
  const assignee = escapeHtml(data.assigneeName);
  const assigner = escapeHtml(data.assignerName);
  const title = escapeHtml(data.taskTitle);
  const project = escapeHtml(data.projectName);
  const description = escapeHtml(data.taskDescription || "No description provided");
  const priority = escapeHtml(data.priority);
  const dueDate = escapeHtml(data.dueDate);
  const taskLink = data.taskLink;

  // Priority badge styling
  let priorityBg = "#1e293b";
  let priorityColor = "#94a3b8";
  let priorityBorder = "#334155";
  const pLower = (data.priority || "").toLowerCase();
  if (pLower === "urgent") {
    priorityBg = "#450a0a";
    priorityColor = "#f87171";
    priorityBorder = "#7f1d1d";
  } else if (pLower === "high") {
    priorityBg = "#431407";
    priorityColor = "#fb923c";
    priorityBorder = "#7c2d12";
  } else if (pLower === "medium") {
    priorityBg = "#1e1b4b";
    priorityColor = "#818cf8";
    priorityBorder = "#3730a3";
  } else {
    priorityBg = "#064e3b";
    priorityColor = "#34d399";
    priorityBorder = "#065f46";
  }

  const appUrl = data.appUrl || "http://localhost:5173";

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Task Assigned: ${title}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; line-height: 1.6;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 15px;">
      <tr>
        <td align="center">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);">
            <!-- Header -->
            <tr>
              <td style="padding: 32px 36px 20px 36px; text-align: left; background: linear-gradient(135deg, #1e1b4b 0%, #1e293b 100%); border-bottom: 1px solid #334155;">
                <div style="font-size: 13px; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                  New Task Assignment
                </div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #f8fafc; line-height: 1.3;">
                  You have been assigned a task 📝
                </h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 32px 36px;">
                <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #cbd5e1;">
                  Hi <strong style="color: #f8fafc;">${assignee}</strong>,
                </p>
                <p style="margin-top: 0; margin-bottom: 24px; font-size: 15px; color: #cbd5e1;">
                  <strong style="color: #f8fafc;">${assigner}</strong> assigned the following task to you:
                </p>

                <!-- Task Details Card -->
                <div style="background-color: #0f172a; border-left: 4px solid #6366f1; border-top: 1px solid #334155; border-right: 1px solid #334155; border-bottom: 1px solid #334155; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #ffffff; font-weight: 700;">
                    ${title}
                  </h3>
                  
                  <table border="0" cellspacing="0" cellpadding="0" width="100%" style="margin-bottom: 16px;">
                    <tr>
                      <td style="padding: 4px 0; font-size: 13px; color: #94a3b8; width: 90px;">Project:</td>
                      <td style="padding: 4px 0; font-size: 14px; color: #f1f5f9; font-weight: 600;">${project}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-size: 13px; color: #94a3b8;">Priority:</td>
                      <td style="padding: 4px 0;">
                        <span style="display: inline-block; background-color: ${priorityBg}; color: ${priorityColor}; border: 1px solid ${priorityBorder}; font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 9999px; text-transform: capitalize;">
                          ${priority}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-size: 13px; color: #94a3b8;">Due Date:</td>
                      <td style="padding: 4px 0; font-size: 14px; color: #f1f5f9;">${dueDate || "No deadline"}</td>
                    </tr>
                  </table>

                  <div style="border-top: 1px solid #1e293b; padding-top: 12px;">
                    <div style="font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">
                      Description
                    </div>
                    <div style="font-size: 14px; color: #cbd5e1; line-height: 1.5; white-space: pre-wrap;">
                      ${description}
                    </div>
                  </div>
                </div>

                <!-- CTA Button -->
                <table border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 20px 0;">
                  <tr>
                    <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);">
                      <a href="${taskLink}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 10px;">
                        View Task Details &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 24px 36px; background-color: #111827; border-top: 1px solid #1f2937; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
                  Manage email alerts in your <a href="${appUrl}/preferences" style="color: #818cf8; text-decoration: none;">Notification Preferences</a>
                </p>
                <p style="margin: 0; font-size: 11px; color: #475569;">
                  &copy; ${new Date().getFullYear()} Productflow. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
};

// 3. Daily Digest Email Template
export const dailyDigestEmail = (data: {
  userName: string;
  tasksAssigned: Array<{ title: string; projectName: string; dueDate: string }>;
  dueTodayCount: number;
  upcomingDeadlines: Array<{ sprintName: string; daysUntilEnd: number }>;
  mentionCount: number;
  dashboardLink: string;
  appUrl?: string;
}) => {
  const userName = escapeHtml(data.userName);
  const tasks = data.tasksAssigned || [];
  const dueToday = data.dueTodayCount || 0;
  const deadlines = data.upcomingDeadlines || [];
  const mentions = data.mentionCount || 0;
  const dashboardLink = data.dashboardLink;

  const appUrl = data.appUrl || "http://localhost:5173";

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your Daily Productflow Digest</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; line-height: 1.6;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 15px;">
      <tr>
        <td align="center">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);">
            <!-- Header -->
            <tr>
              <td style="padding: 32px 36px 24px 36px; text-align: left; background: linear-gradient(135deg, #1e1b4b 0%, #1e293b 100%); border-bottom: 1px solid #334155;">
                <div style="font-size: 13px; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                  Productflow Daily Briefing
                </div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #f8fafc; line-height: 1.3;">
                  Good morning, ${userName} ✨
                </h1>
                <p style="margin: 6px 0 0 0; font-size: 14px; color: #94a3b8;">
                  Here is a snapshot of your schedule, priorities, and sprint updates today.
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 32px 36px;">
                <!-- Due Today Metric Card -->
                ${
                  dueToday > 0
                    ? `
                  <div style="background: linear-gradient(135deg, #450a0a 0%, #1e293b 100%); border: 1px solid #991b1b; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
                    <div style="display: flex; align-items: center;">
                      <span style="font-size: 24px; margin-right: 12px;">⏰</span>
                      <div>
                        <div style="font-size: 16px; font-weight: 700; color: #fecaca;">
                          ${dueToday} task${dueToday === 1 ? "" : "s"} due today
                        </div>
                        <div style="font-size: 13px; color: #fca5a5;">
                          Prioritize these work items to keep milestones on track! 💪
                        </div>
                      </div>
                    </div>
                  </div>
                `
                    : ""
                }

                <!-- Tasks Assigned Section -->
                <div style="margin-bottom: 28px;">
                  <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #f8fafc; display: flex; align-items: center;">
                    📋 Active Tasks (${tasks.length})
                  </h3>
                  ${
                    tasks.length === 0
                      ? `<p style="margin: 0; font-size: 14px; color: #94a3b8;">No tasks pending right now. Great job!</p>`
                      : `
                    <div style="border: 1px solid #334155; border-radius: 10px; overflow: hidden; background-color: #0f172a;">
                      ${tasks
                        .map(
                          (t, i) => `
                        <div style="padding: 12px 16px; ${i > 0 ? "border-top: 1px solid #1e293b;" : ""} display: flex; justify-content: space-between; align-items: center;">
                          <div>
                            <div style="font-size: 14px; font-weight: 600; color: #f1f5f9;">${escapeHtml(t.title)}</div>
                            <div style="font-size: 12px; color: #94a3b8;">${escapeHtml(t.projectName)}</div>
                          </div>
                          <div style="font-size: 12px; color: #cbd5e1; background-color: #1e293b; padding: 2px 8px; border-radius: 4px; font-family: monospace;">
                            ${escapeHtml(t.dueDate)}
                          </div>
                        </div>
                      `
                        )
                        .join("")}
                    </div>
                  `
                  }
                </div>

                <!-- Upcoming Deadlines -->
                ${
                  deadlines.length > 0
                    ? `
                  <div style="margin-bottom: 28px;">
                    <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #f8fafc;">
                      📅 Upcoming Sprint Deadlines
                    </h3>
                    <div style="border: 1px solid #334155; border-radius: 10px; overflow: hidden; background-color: #0f172a;">
                      ${deadlines
                        .map(
                          (s, i) => `
                        <div style="padding: 12px 16px; ${i > 0 ? "border-top: 1px solid #1e293b;" : ""}">
                          <div style="font-size: 14px; font-weight: 600; color: #f1f5f9;">${escapeHtml(s.sprintName)}</div>
                          <div style="font-size: 12px; color: #818cf8; font-weight: 500;">
                            Ends in ${s.daysUntilEnd} day${s.daysUntilEnd === 1 ? "" : "s"}
                          </div>
                        </div>
                      `
                        )
                        .join("")}
                    </div>
                  </div>
                `
                    : ""
                }

                <!-- Mentions -->
                ${
                  mentions > 0
                    ? `
                  <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px;">
                    <div style="font-size: 14px; color: #e2e8f0;">
                      💬 You were mentioned <strong>${mentions} time${mentions === 1 ? "" : "s"}</strong> in discussions in the last 24 hours.
                    </div>
                  </div>
                `
                    : ""
                }

                <!-- Primary CTA -->
                <table border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0 16px 0;">
                  <tr>
                    <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);">
                      <a href="${dashboardLink}" target="_blank" style="display: inline-block; padding: 14px 34px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 10px;">
                        Open Dashboard &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 24px 36px; background-color: #111827; border-top: 1px solid #1f2937; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
                  You received this email because you are subscribed to daily digests.
                  <br />
                  Update your preferences or unsubscribe in <a href="${appUrl}/preferences" style="color: #818cf8; text-decoration: none;">Settings</a>.
                </p>
                <p style="margin: 0; font-size: 11px; color: #475569;">
                  &copy; ${new Date().getFullYear()} Productflow. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
};
