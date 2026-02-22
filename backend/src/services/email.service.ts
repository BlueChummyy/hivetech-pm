import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../config/index.js';
import { logger } from '../utils/logger.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_PORT) return null;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? false,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });

  return transporter;
}

export function isEmailConfigured(): boolean {
  return !!env.SMTP_HOST && !!env.SMTP_PORT;
}

async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;

  try {
    await t.sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL || env.SMTP_USER || 'noreply@localhost'}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    logger.error({ err, to, subject }, 'Failed to send email');
    return false;
  }
}

// ── Email templates ──────────────────────────────────────────────────

export async function sendTaskAssignedEmail(
  to: string,
  data: { taskTitle: string; projectName: string; assignedBy: string },
): Promise<boolean> {
  return sendMail(
    to,
    `Task Assigned: ${data.taskTitle}`,
    `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#6366f1;">Task Assigned to You</h2>
      <p>You have been assigned to <strong>${data.taskTitle}</strong> in project <strong>${data.projectName}</strong> by ${data.assignedBy}.</p>
      <p style="color:#888;font-size:12px;">— Project Management App</p>
    </div>
    `,
  );
}

export async function sendCommentNotificationEmail(
  to: string,
  data: { taskTitle: string; commentBy: string; commentPreview: string },
): Promise<boolean> {
  return sendMail(
    to,
    `New comment on: ${data.taskTitle}`,
    `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#6366f1;">New Comment</h2>
      <p><strong>${data.commentBy}</strong> commented on <strong>${data.taskTitle}</strong>:</p>
      <blockquote style="border-left:3px solid #6366f1;padding-left:12px;color:#555;">${data.commentPreview}</blockquote>
      <p style="color:#888;font-size:12px;">— Project Management App</p>
    </div>
    `,
  );
}

export async function sendStatusChangeEmail(
  to: string,
  data: { taskTitle: string; oldStatus: string; newStatus: string; changedBy: string },
): Promise<boolean> {
  return sendMail(
    to,
    `Status changed: ${data.taskTitle}`,
    `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#6366f1;">Status Updated</h2>
      <p><strong>${data.changedBy}</strong> changed <strong>${data.taskTitle}</strong> from <em>${data.oldStatus}</em> to <em>${data.newStatus}</em>.</p>
      <p style="color:#888;font-size:12px;">— Project Management App</p>
    </div>
    `,
  );
}

export async function sendMentionEmail(
  to: string,
  data: { taskTitle: string; mentionedBy: string; context: string },
): Promise<boolean> {
  return sendMail(
    to,
    `You were mentioned in: ${data.taskTitle}`,
    `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#6366f1;">You Were Mentioned</h2>
      <p><strong>${data.mentionedBy}</strong> mentioned you in <strong>${data.taskTitle}</strong>:</p>
      <blockquote style="border-left:3px solid #6366f1;padding-left:12px;color:#555;">${data.context}</blockquote>
      <p style="color:#888;font-size:12px;">— Project Management App</p>
    </div>
    `,
  );
}
