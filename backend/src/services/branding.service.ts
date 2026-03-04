import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { env } from '../config/index.js';

export class BrandingService {
  async get(workspaceId: string) {
    const branding = await prisma.branding.findUnique({
      where: { workspaceId },
    });
    return branding;
  }

  async upsert(
    workspaceId: string,
    data: { orgName?: string; primaryColor?: string; logoUrl?: string; faviconUrl?: string },
  ) {
    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw ApiError.notFound('Workspace not found');

    const branding = await prisma.branding.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        orgName: data.orgName,
        primaryColor: data.primaryColor,
        logoUrl: data.logoUrl,
        faviconUrl: data.faviconUrl,
      },
      update: {
        ...(data.orgName !== undefined && { orgName: data.orgName }),
        ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.faviconUrl !== undefined && { faviconUrl: data.faviconUrl }),
      },
    });

    return branding;
  }

  async uploadFile(workspaceId: string, type: 'logo' | 'favicon', file: Express.Multer.File) {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw ApiError.notFound('Workspace not found');

    // Create storage path: uploads/branding/{workspaceId}/{filename}
    const dir = path.join(env.UPLOAD_DIR, 'branding', workspaceId);
    fs.mkdirSync(dir, { recursive: true });

    const storagePath = path.join(dir, file.filename);

    // Move file from temp upload location
    if (file.path !== storagePath) {
      fs.copyFileSync(file.path, storagePath);
      fs.unlinkSync(file.path);
    }

    // Build the URL path for the file
    const fileUrl = `/uploads/branding/${workspaceId}/${file.filename}`;

    // Update branding record
    const updateData = type === 'logo' ? { logoUrl: fileUrl } : { faviconUrl: fileUrl };

    // Delete old file if exists
    const existing = await prisma.branding.findUnique({ where: { workspaceId } });
    if (existing) {
      const oldUrl = type === 'logo' ? existing.logoUrl : existing.faviconUrl;
      if (oldUrl) {
        const oldPath = path.join(env.UPLOAD_DIR, oldUrl.replace('/uploads/', ''));
        try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
      }
    }

    const branding = await prisma.branding.upsert({
      where: { workspaceId },
      create: { workspaceId, ...updateData },
      update: updateData,
    });

    return branding;
  }
}
