import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call authService.register, return tokens
    res.status(501).json({ message: 'Not implemented' });
  }

  async login(req: Request, res: Response): Promise<void> {
    // TODO: Validate credentials, call authService.login, return tokens
    res.status(501).json({ message: 'Not implemented' });
  }

  async refresh(req: Request, res: Response): Promise<void> {
    // TODO: Validate refresh token, call authService.refresh, return new tokens
    res.status(501).json({ message: 'Not implemented' });
  }

  async logout(req: Request, res: Response): Promise<void> {
    // TODO: Invalidate refresh token
    res.status(501).json({ message: 'Not implemented' });
  }

  async me(req: Request, res: Response): Promise<void> {
    // TODO: Return current user profile from req.user
    res.status(501).json({ message: 'Not implemented' });
  }
}
