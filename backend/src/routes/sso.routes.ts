import { Router } from 'express';
import { SsoController } from '../controllers/sso.controller.js';

const router = Router();
const controller = new SsoController();

// Public: list enabled SSO providers (frontend uses this to show/hide buttons)
router.get('/providers', controller.getEnabledProviders);

// Google OAuth2
router.get('/google', controller.googleRedirect);
router.get('/google/callback', controller.googleCallback);

// Microsoft OAuth2
router.get('/microsoft', controller.microsoftRedirect);
router.get('/microsoft/callback', controller.microsoftCallback);

// Generic OIDC (Okta, Auth0, etc.)
router.get('/oidc', controller.oidcRedirect);
router.get('/oidc/callback', controller.oidcCallback);

export { router as ssoRoutes };
