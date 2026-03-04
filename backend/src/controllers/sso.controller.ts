import type { Request, Response, NextFunction } from 'express';
import { SsoService } from '../services/sso.service.js';
import { env } from '../config/index.js';

const ssoService = new SsoService();

function getFrontendUrl(): string {
  return env.FRONTEND_URL;
}

function redirectWithTokens(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  const params = new URLSearchParams({
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
  res.redirect(`${getFrontendUrl()}/auth/callback?${params.toString()}`);
}

function redirectWithError(res: Response, message: string) {
  const params = new URLSearchParams({ error: message });
  res.redirect(`${getFrontendUrl()}/login?${params.toString()}`);
}

export class SsoController {
  // ─── Google ─────────────────────────────────────────────────────

  async googleRedirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = await ssoService.getProviderConfig('GOOGLE');
      const url = ssoService.getGoogleAuthUrl({ clientId: config.clientId });
      res.redirect(url);
    } catch (err) {
      redirectWithError(res, 'Google SSO is not configured');
    }
  }

  async googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.query.code as string;
      if (!code) {
        redirectWithError(res, 'Missing authorization code');
        return;
      }
      const tokens = await ssoService.handleGoogleCallback(code);
      redirectWithTokens(res, tokens);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      redirectWithError(res, message);
    }
  }

  // ─── Microsoft ──────────────────────────────────────────────────

  async microsoftRedirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = await ssoService.getProviderConfig('MICROSOFT');
      const url = ssoService.getMicrosoftAuthUrl({ clientId: config.clientId, tenantId: config.tenantId });
      res.redirect(url);
    } catch (err) {
      redirectWithError(res, 'Microsoft SSO is not configured');
    }
  }

  async microsoftCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.query.code as string;
      if (!code) {
        redirectWithError(res, 'Missing authorization code');
        return;
      }
      const tokens = await ssoService.handleMicrosoftCallback(code);
      redirectWithTokens(res, tokens);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Microsoft sign-in failed';
      redirectWithError(res, message);
    }
  }

  // ─── Generic OIDC ──────────────────────────────────────────────

  async oidcRedirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = await ssoService.getOidcAuthUrl();
      res.redirect(url);
    } catch (err) {
      redirectWithError(res, 'OIDC SSO is not configured');
    }
  }

  async oidcCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.query.code as string;
      if (!code) {
        redirectWithError(res, 'Missing authorization code');
        return;
      }
      const tokens = await ssoService.handleOidcCallback(code);
      redirectWithTokens(res, tokens);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OIDC sign-in failed';
      redirectWithError(res, message);
    }
  }

  // ─── Get enabled providers (public) ─────────────────────────────

  async getEnabledProviders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const providers = await ssoService.getEnabledProviders();
      res.json({
        success: true,
        data: providers.map((p: { provider: string }) => p.provider),
      });
    } catch (err) {
      next(err);
    }
  }
}
