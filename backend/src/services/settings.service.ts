import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const SMTP_SETTINGS_FILE = path.join(DATA_DIR, 'smtp-settings.json');

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

export function getSmtpSettings(): SmtpSettings | null {
  try {
    if (!fs.existsSync(SMTP_SETTINGS_FILE)) return null;
    const raw = fs.readFileSync(SMTP_SETTINGS_FILE, 'utf-8');
    const data = JSON.parse(raw) as SmtpSettings;
    if (!data.host || !data.port) return null;
    return data;
  } catch (err) {
    logger.error({ err }, 'Failed to read SMTP settings file');
    return null;
  }
}

export function saveSmtpSettings(settings: SmtpSettings): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(SMTP_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

export function getMaskedSmtpSettings(): (Omit<SmtpSettings, 'password'> & { password: string }) | null {
  const settings = getSmtpSettings();
  if (!settings) return null;
  return {
    ...settings,
    password: settings.password ? '********' : '',
  };
}
