import crypto from 'node:crypto';
import { prisma } from '../prisma/client.js';
import { generateAccessToken } from '../utils/token.js';
import { env } from '../config/index.js';
import { ApiError } from '../utils/api-error.js';
import type { AuthProvider } from '@prisma/client';

function computeRefreshExpiry(): Date {
  const raw = env.JWT_REFRESH_EXPIRES_IN;
  const match = raw.match(/^(\d+)([smhd])$/);
  if (!match) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return new Date(Date.now() + value * multipliers[unit]);
}

function getCallbackBaseUrl(): string {
  return env.OAUTH_CALLBACK_BASE_URL || `http://localhost:${env.PORT}`;
}

interface OAuthUserInfo {
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface TokenResult {
  accessToken: string;
  refreshToken: string;
}

// In-memory state store with TTL (5 minute expiry)
const oauthStates = new Map<string, number>();

function generateOAuthState(): string {
  const state = crypto.randomBytes(32).toString('hex');
  oauthStates.set(state, Date.now() + 5 * 60 * 1000);
  // Prune expired states
  for (const [key, expiry] of oauthStates) {
    if (Date.now() > expiry) oauthStates.delete(key);
  }
  return state;
}

function validateOAuthState(state: string | undefined): void {
  if (!state || !oauthStates.has(state)) {
    throw ApiError.badRequest('Invalid or expired OAuth state parameter');
  }
  const expiry = oauthStates.get(state)!;
  oauthStates.delete(state);
  if (Date.now() > expiry) {
    throw ApiError.badRequest('OAuth state parameter has expired');
  }
}

export class SsoService {
  async getProviderConfig(provider: AuthProvider) {
    const config = await prisma.oAuthProvider.findUnique({ where: { provider } });
    if (!config || !config.enabled) {
      throw ApiError.badRequest(`${provider} SSO is not configured or not enabled`);
    }
    return config;
  }

  async getEnabledProviders() {
    return prisma.oAuthProvider.findMany({
      where: { enabled: true },
      select: { provider: true, enabled: true },
    });
  }

  // ─── Google OAuth2 ───────────────────────────────────────────────

  getGoogleAuthUrl(config: { clientId: string }): string {
    const redirectUri = `${getCallbackBaseUrl()}/api/v1/auth/google/callback`;
    const state = generateOAuthState();
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGoogleCallback(code: string, state?: string): Promise<TokenResult> {
    validateOAuthState(state);
    const config = await this.getProviderConfig('GOOGLE');
    const redirectUri = `${getCallbackBaseUrl()}/api/v1/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw ApiError.badRequest(`Google token exchange failed: ${err}`);
    }

    const tokenData = await tokenRes.json() as { access_token: string };

    // Fetch user info
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      throw ApiError.badRequest('Failed to fetch Google user info');
    }

    const userInfo = await userInfoRes.json() as {
      id: string;
      email: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
    };

    return this.findOrCreateUser({
      providerId: userInfo.id,
      email: userInfo.email,
      firstName: userInfo.given_name || userInfo.email.split('@')[0],
      lastName: userInfo.family_name || '',
      avatarUrl: userInfo.picture,
    }, 'GOOGLE');
  }

  // ─── Microsoft OAuth2 ───────────────────────────────────────────

  getMicrosoftAuthUrl(config: { clientId: string; tenantId: string | null }): string {
    const tenant = config.tenantId || 'common';
    const redirectUri = `${getCallbackBaseUrl()}/api/v1/auth/microsoft/callback`;
    const state = generateOAuthState();
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile User.Read',
      response_mode: 'query',
      prompt: 'select_account',
      state,
    });
    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async handleMicrosoftCallback(code: string, state?: string): Promise<TokenResult> {
    validateOAuthState(state);
    const config = await this.getProviderConfig('MICROSOFT');
    const tenant = config.tenantId || 'common';
    const redirectUri = `${getCallbackBaseUrl()}/api/v1/auth/microsoft/callback`;

    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid email profile User.Read',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw ApiError.badRequest(`Microsoft token exchange failed: ${err}`);
    }

    const tokenData = await tokenRes.json() as { access_token: string };

    // Fetch user info from Microsoft Graph
    const userInfoRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      throw ApiError.badRequest('Failed to fetch Microsoft user info');
    }

    const userInfo = await userInfoRes.json() as {
      id: string;
      mail?: string;
      userPrincipalName: string;
      givenName?: string;
      surname?: string;
    };

    const email = userInfo.mail || userInfo.userPrincipalName;

    return this.findOrCreateUser({
      providerId: userInfo.id,
      email,
      firstName: userInfo.givenName || email.split('@')[0],
      lastName: userInfo.surname || '',
    }, 'MICROSOFT');
  }

  // ─── Generic OIDC ──────────────────────────────────────────────

  async getOidcAuthUrl(): Promise<string> {
    const config = await this.getProviderConfig('OIDC');
    if (!config.issuerUrl) {
      throw ApiError.badRequest('OIDC issuer URL is not configured');
    }

    const discovery = await this.discoverOidc(config.issuerUrl);
    const redirectUri = `${getCallbackBaseUrl()}/api/v1/auth/oidc/callback`;
    const state = generateOAuthState();
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'login',
      state,
    });
    return `${discovery.authorization_endpoint}?${params.toString()}`;
  }

  async handleOidcCallback(code: string, state?: string): Promise<TokenResult> {
    validateOAuthState(state);
    const config = await this.getProviderConfig('OIDC');
    if (!config.issuerUrl) {
      throw ApiError.badRequest('OIDC issuer URL is not configured');
    }

    const discovery = await this.discoverOidc(config.issuerUrl);
    const redirectUri = `${getCallbackBaseUrl()}/api/v1/auth/oidc/callback`;

    const tokenRes = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw ApiError.badRequest(`OIDC token exchange failed: ${err}`);
    }

    const tokenData = await tokenRes.json() as { access_token: string };

    const userInfoRes = await fetch(discovery.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      throw ApiError.badRequest('Failed to fetch OIDC user info');
    }

    const userInfo = await userInfoRes.json() as {
      sub: string;
      email?: string;
      given_name?: string;
      family_name?: string;
      name?: string;
      picture?: string;
    };

    if (!userInfo.email) {
      throw ApiError.badRequest('OIDC provider did not return an email address');
    }

    return this.findOrCreateUser({
      providerId: userInfo.sub,
      email: userInfo.email,
      firstName: userInfo.given_name || userInfo.name?.split(' ')[0] || userInfo.email.split('@')[0],
      lastName: userInfo.family_name || userInfo.name?.split(' ').slice(1).join(' ') || '',
      avatarUrl: userInfo.picture,
    }, 'OIDC');
  }

  private async discoverOidc(issuerUrl: string): Promise<{
    authorization_endpoint: string;
    token_endpoint: string;
    userinfo_endpoint: string;
  }> {
    const wellKnown = issuerUrl.replace(/\/+$/, '') + '/.well-known/openid-configuration';
    const res = await fetch(wellKnown);
    if (!res.ok) {
      throw ApiError.badRequest(`Failed to discover OIDC configuration at ${wellKnown}`);
    }
    return res.json() as Promise<{
      authorization_endpoint: string;
      token_endpoint: string;
      userinfo_endpoint: string;
    }>;
  }

  // ─── Shared: find or create user, issue tokens ──────────────────

  private async findOrCreateUser(info: OAuthUserInfo, provider: AuthProvider): Promise<TokenResult> {
    // Try to find by provider ID first
    let user = await prisma.user.findFirst({
      where: { providerId: info.providerId, authProvider: provider, deletedAt: null },
    });

    // If not found by provider ID, try by email
    if (!user) {
      user = await prisma.user.findFirst({
        where: { email: { equals: info.email, mode: 'insensitive' }, deletedAt: null },
      });

      if (user) {
        // Only auto-link if the account was already using this SSO provider
        // or has no password (pure SSO account). Never auto-link a local
        // password account — that would allow account takeover.
        if (user.authProvider === provider) {
          // Same provider, just update the provider ID (e.g. re-linked)
          await prisma.user.update({
            where: { id: user.id },
            data: {
              providerId: info.providerId,
              providerEmail: info.email,
              avatarUrl: user.avatarUrl || info.avatarUrl || null,
            },
          });
        } else if (user.authProvider === 'LOCAL') {
          // Local account — auto-link to SSO provider so users can sign in with either method
          await prisma.user.update({
            where: { id: user.id },
            data: {
              authProvider: provider,
              providerId: info.providerId,
              providerEmail: info.email,
              avatarUrl: user.avatarUrl || info.avatarUrl || null,
            },
          });
        } else {
          // SSO account from a different provider with no password — allow linking
          await prisma.user.update({
            where: { id: user.id },
            data: {
              authProvider: provider,
              providerId: info.providerId,
              providerEmail: info.email,
              avatarUrl: user.avatarUrl || info.avatarUrl || null,
            },
          });
        }
      }
    }

    if (user && (!user.isActive || user.deletedAt)) {
      throw ApiError.unauthorized('Your account has been deactivated');
    }

    // Create new user if not found
    if (!user) {
      user = await prisma.$transaction(async (tx: any) => {
        const created = await tx.user.create({
          data: {
            email: info.email,
            passwordHash: null,
            firstName: info.firstName,
            lastName: info.lastName,
            avatarUrl: info.avatarUrl || null,
            authProvider: provider,
            providerId: info.providerId,
            providerEmail: info.email,
          },
        });

        // Add to default workspace
        const defaultWorkspace = await tx.workspace.findFirst({
          orderBy: { createdAt: 'asc' },
        });
        if (defaultWorkspace) {
          await tx.workspaceMember.create({
            data: {
              workspaceId: defaultWorkspace.id,
              userId: created.id,
              role: 'MEMBER',
            },
          });
        }

        return created;
      });
    }

    // Issue tokens
    const accessToken = generateAccessToken({ sub: user!.id, email: user!.email });
    const refreshTokenValue = crypto.randomUUID();

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user!.id,
        expiresAt: computeRefreshExpiry(),
      },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }
}
