import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../prisma/client.js';
import { env } from '../config/index.js';

const GLOBAL_DIR = 'global';

export class BrandingService {
  async get() {
    // Return the first (and only) branding record
    const branding = await prisma.branding.findFirst();
    return branding;
  }

  async upsert(
    data: { orgName?: string; primaryColor?: string; logoUrl?: string; faviconUrl?: string },
  ) {
    const existing = await prisma.branding.findFirst();

    if (existing) {
      return prisma.branding.update({
        where: { id: existing.id },
        data: {
          ...(data.orgName !== undefined && { orgName: data.orgName }),
          ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
          ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
          ...(data.faviconUrl !== undefined && { faviconUrl: data.faviconUrl }),
        },
      });
    }

    // Create new - need a workspaceId for the FK; use the first workspace
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) {
      // Fallback: create without workspace by using the first available
      throw new Error('No workspace found to attach branding to');
    }

    return prisma.branding.create({
      data: {
        workspaceId: workspace.id,
        orgName: data.orgName,
        primaryColor: data.primaryColor,
        logoUrl: data.logoUrl,
        faviconUrl: data.faviconUrl,
      },
    });
  }

  async uploadFile(type: 'logo' | 'favicon', file: Express.Multer.File) {
    const dir = path.join(env.UPLOAD_DIR, 'branding', GLOBAL_DIR);
    fs.mkdirSync(dir, { recursive: true });

    const storagePath = path.join(dir, file.filename);

    if (file.path !== storagePath) {
      fs.copyFileSync(file.path, storagePath);
      fs.unlinkSync(file.path);
    }

    const fileUrl = `/uploads/branding/${GLOBAL_DIR}/${file.filename}`;
    const updateData = type === 'logo' ? { logoUrl: fileUrl } : { faviconUrl: fileUrl };

    // Delete old file if exists
    const existing = await prisma.branding.findFirst();
    if (existing) {
      const oldUrl = type === 'logo' ? existing.logoUrl : existing.faviconUrl;
      if (oldUrl) {
        const oldPath = path.join(env.UPLOAD_DIR, oldUrl.replace('/uploads/', ''));
        try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
      }

      return prisma.branding.update({
        where: { id: existing.id },
        data: updateData,
      });
    }

    const workspace = await prisma.workspace.findFirst();
    if (!workspace) throw new Error('No workspace found');

    return prisma.branding.create({
      data: { workspaceId: workspace.id, ...updateData },
    });
  }
}
