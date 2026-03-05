import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { getSmtpSettings } from './settings.service.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  // Check file-based settings first, then fall back to env vars
  const fileSettings = getSmtpSettings();

  if (fileSettings) {
    // Port 465 = implicit TLS (secure: true)
    // Port 587 = STARTTLS (secure: false, nodemailer upgrades automatically)
    // Port 25  = plaintext (secure: false, no TLS required)
    const useImplicitTLS = fileSettings.secure && fileSettings.port === 465;

    transporter = nodemailer.createTransport({
      host: fileSettings.host,
      port: fileSettings.port,
      secure: useImplicitTLS,
      auth:
        fileSettings.username && fileSettings.password
          ? { user: fileSettings.username, pass: fileSettings.password }
          : undefined,
      tls: { rejectUnauthorized: false },
      // If user wants TLS on a non-465 port, STARTTLS will be used automatically
      // If user disabled TLS (port 25), don't require STARTTLS
      ...(!fileSettings.secure && { requireTLS: false }),
    });
    return transporter;
  }

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

export function resetTransporter(): void {
  transporter = null;
}

export function isEmailConfigured(): boolean {
  const fileSettings = getSmtpSettings();
  if (fileSettings) return true;
  return !!env.SMTP_HOST && !!env.SMTP_PORT;
}

export async function verifyConnection(): Promise<{ ok: boolean; error?: string }> {
  const t = getTransporter();
  if (!t) return { ok: false, error: 'SMTP transporter not configured' };
  try {
    await t.verify();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, 'SMTP verification failed');
    return { ok: false, error: message };
  }
}

async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;

  const fileSettings = getSmtpSettings();
  const fromName = fileSettings?.fromName || env.SMTP_FROM_NAME;
  const fromEmail = fileSettings?.fromEmail || env.SMTP_FROM_EMAIL || env.SMTP_USER || 'noreply@localhost';

  try {
    await t.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
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

/** Like sendMail but throws on failure so the caller gets the actual error message. */
export async function sendMailOrThrow(to: string, subject: string, html: string): Promise<void> {
  const t = getTransporter();
  if (!t) throw new Error('SMTP transporter not configured');

  const fileSettings = getSmtpSettings();
  const fromName = fileSettings?.fromName || env.SMTP_FROM_NAME;
  const fromEmail = fileSettings?.fromEmail || env.SMTP_FROM_EMAIL || env.SMTP_USER || 'noreply@localhost';

  await t.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
  });
}

export { sendMail };

// ── Email template helpers ──────────────────────────────────────────

function emailLayout(opts: { iconEmoji: string; accentColor: string; heading: string; body: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#111827;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#1f2937;border-radius:12px;overflow:hidden;border:1px solid #374151;">
      <!-- Header bar -->
      <tr><td style="background:linear-gradient(135deg,${opts.accentColor},${opts.accentColor}dd);padding:24px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:28px;line-height:1;">${opts.iconEmoji}</td>
            <td style="padding-left:14px;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${opts.heading}</td>
          </tr>
        </table>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:28px 32px 32px;color:#d1d5db;font-size:15px;line-height:1.7;">
        ${opts.body}
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:0 32px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="border-top:1px solid #374151;padding-top:16px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:12px;color:#6b7280;font-weight:600;letter-spacing:0.5px;">HIVETECH PM</td>
              </tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function taskPill(title: string): string {
  return `<span style="display:inline-block;background-color:#374151;color:#e5e7eb;padding:4px 12px;border-radius:6px;font-weight:600;font-size:14px;">${title}</span>`;
}

function projectBadge(name: string): string {
  return `<span style="display:inline-block;background-color:#6366f1;color:#ffffff;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;letter-spacing:0.3px;text-transform:uppercase;">${name}</span>`;
}

function statusBadge(name: string, color: string): string {
  return `<span style="display:inline-block;background-color:${color};color:#ffffff;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;">${name}</span>`;
}

// ── Email templates ──────────────────────────────────────────────────

export async function sendTaskAssignedEmail(
  to: string,
  data: { taskTitle: string; projectName: string; assignedBy: string },
): Promise<boolean> {
  return sendMail(to, `Task Assigned: ${data.taskTitle}`, emailLayout({
    iconEmoji: '&#128203;',
    accentColor: '#6366f1',
    heading: 'Task Assigned',
    body: `
      <p style="margin:0 0 16px;color:#9ca3af;font-size:14px;"><strong style="color:#e5e7eb;">${data.assignedBy}</strong> assigned you a task</p>
      <p style="margin:0 0 12px;">${taskPill(data.taskTitle)}</p>
      <p style="margin:0;">${projectBadge(data.projectName)}</p>
    `,
  }));
}

export async function sendCommentNotificationEmail(
  to: string,
  data: { taskTitle: string; commentBy: string; commentPreview: string },
): Promise<boolean> {
  return sendMail(to, `New comment on: ${data.taskTitle}`, emailLayout({
    iconEmoji: '&#128172;',
    accentColor: '#3b82f6',
    heading: 'New Comment',
    body: `
      <p style="margin:0 0 16px;color:#9ca3af;font-size:14px;"><strong style="color:#e5e7eb;">${data.commentBy}</strong> commented on ${taskPill(data.taskTitle)}</p>
      <div style="background-color:#111827;border-left:3px solid #3b82f6;border-radius:0 8px 8px 0;padding:14px 18px;margin:0;">
        <p style="margin:0;color:#d1d5db;font-size:14px;line-height:1.6;font-style:italic;">${data.commentPreview}</p>
      </div>
    `,
  }));
}

export async function sendStatusChangeEmail(
  to: string,
  data: { taskTitle: string; oldStatus: string; newStatus: string; changedBy: string },
): Promise<boolean> {
  return sendMail(to, `Status changed: ${data.taskTitle}`, emailLayout({
    iconEmoji: '&#128260;',
    accentColor: '#8b5cf6',
    heading: 'Status Changed',
    body: `
      <p style="margin:0 0 16px;color:#9ca3af;font-size:14px;"><strong style="color:#e5e7eb;">${data.changedBy}</strong> updated the status of ${taskPill(data.taskTitle)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0;">
        <tr>
          <td style="padding-right:8px;">${statusBadge(data.oldStatus, '#6b7280')}</td>
          <td style="color:#6b7280;font-size:18px;padding:0 8px;">&#8594;</td>
          <td style="padding-left:8px;">${statusBadge(data.newStatus, '#6366f1')}</td>
        </tr>
      </table>
    `,
  }));
}

export async function sendMentionEmail(
  to: string,
  data: { taskTitle: string; mentionedBy: string; context: string },
): Promise<boolean> {
  return sendMail(to, `You were mentioned in: ${data.taskTitle}`, emailLayout({
    iconEmoji: '&#128227;',
    accentColor: '#ec4899',
    heading: 'You Were Mentioned',
    body: `
      <p style="margin:0 0 16px;color:#9ca3af;font-size:14px;"><strong style="color:#e5e7eb;">${data.mentionedBy}</strong> mentioned you on ${taskPill(data.taskTitle)}</p>
      <div style="background-color:#111827;border-left:3px solid #ec4899;border-radius:0 8px 8px 0;padding:14px 18px;margin:0;">
        <p style="margin:0;color:#d1d5db;font-size:14px;line-height:1.6;font-style:italic;">${data.context}</p>
      </div>
    `,
  }));
}

export async function sendTaskUpdatedEmail(
  to: string,
  data: { taskTitle: string; updatedBy: string; changes: string },
): Promise<boolean> {
  return sendMail(to, `Task updated: ${data.taskTitle}`, emailLayout({
    iconEmoji: '&#9998;',
    accentColor: '#f59e0b',
    heading: 'Task Updated',
    body: `
      <p style="margin:0 0 16px;color:#9ca3af;font-size:14px;"><strong style="color:#e5e7eb;">${data.updatedBy}</strong> made changes to ${taskPill(data.taskTitle)}</p>
      <div style="background-color:#111827;border-radius:8px;padding:14px 18px;margin:0;">
        <p style="margin:0;color:#fbbf24;font-size:13px;font-weight:600;letter-spacing:0.3px;text-transform:uppercase;margin-bottom:6px;">What changed</p>
        <p style="margin:0;color:#d1d5db;font-size:14px;">${data.changes}</p>
      </div>
    `,
  }));
}

export async function sendDueSoonEmail(
  to: string,
  data: { taskTitle: string; projectName: string; dueDate: string },
): Promise<boolean> {
  return sendMail(to, `Task due soon: ${data.taskTitle}`, emailLayout({
    iconEmoji: '&#9200;',
    accentColor: '#f59e0b',
    heading: 'Due Soon',
    body: `
      <p style="margin:0 0 12px;">${taskPill(data.taskTitle)}</p>
      <p style="margin:0 0 16px;">${projectBadge(data.projectName)}</p>
      <div style="background-color:#111827;border-radius:8px;padding:14px 18px;border:1px solid #f59e0b44;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:20px;padding-right:10px;">&#128197;</td>
            <td>
              <p style="margin:0;color:#fbbf24;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;">Due Date</p>
              <p style="margin:4px 0 0;color:#e5e7eb;font-size:16px;font-weight:700;">${data.dueDate}</p>
            </td>
          </tr>
        </table>
      </div>
    `,
  }));
}

export async function sendOverdueEmail(
  to: string,
  data: { taskTitle: string; projectName: string; dueDate: string },
): Promise<boolean> {
  return sendMail(to, `Task overdue: ${data.taskTitle}`, emailLayout({
    iconEmoji: '&#9888;',
    accentColor: '#ef4444',
    heading: 'Task Overdue',
    body: `
      <p style="margin:0 0 12px;">${taskPill(data.taskTitle)}</p>
      <p style="margin:0 0 16px;">${projectBadge(data.projectName)}</p>
      <div style="background-color:#111827;border-radius:8px;padding:14px 18px;border:1px solid #ef444444;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:20px;padding-right:10px;">&#128308;</td>
            <td>
              <p style="margin:0;color:#ef4444;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;">Was due</p>
              <p style="margin:4px 0 0;color:#e5e7eb;font-size:16px;font-weight:700;">${data.dueDate}</p>
            </td>
          </tr>
        </table>
      </div>
    `,
  }));
}

export async function sendTaskDeletedEmail(
  to: string,
  data: { taskTitle: string; deletedBy: string },
): Promise<boolean> {
  return sendMail(to, `Task deleted: ${data.taskTitle}`, emailLayout({
    iconEmoji: '&#128465;',
    accentColor: '#6b7280',
    heading: 'Task Deleted',
    body: `
      <p style="margin:0 0 16px;color:#9ca3af;font-size:14px;"><strong style="color:#e5e7eb;">${data.deletedBy}</strong> deleted a task you were assigned to</p>
      <div style="background-color:#111827;border-radius:8px;padding:14px 18px;border:1px solid #6b728044;">
        <p style="margin:0;color:#9ca3af;font-size:14px;text-decoration:line-through;">${data.taskTitle}</p>
      </div>
    `,
  }));
}
