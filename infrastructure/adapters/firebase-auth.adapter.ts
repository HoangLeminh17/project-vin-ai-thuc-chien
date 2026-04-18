import { IAuthService } from '@/core/ports/auth.port';
import { User } from '@/core/entities/user.entity';
import type { Auth } from 'firebase-admin/auth';

export class FirebaseAuthAdapter implements IAuthService {
  constructor(private readonly auth: Auth) {}

  async verifyToken(token: string): Promise<User> {
    const decodedToken = await this.auth.verifyIdToken(token);
    return {
      id: decodedToken.uid,
      email: decodedToken.email || null,
      displayName: decodedToken.name || null,
      photoURL: decodedToken.picture || null,
    };
  }

  async createSessionCookie(idToken: string, expiresIn: number): Promise<string> {
    return await this.auth.createSessionCookie(idToken, { expiresIn });
  }

  async verifySessionCookie(sessionCookie: string): Promise<User> {
    const decodedClaims = await this.auth.verifySessionCookie(sessionCookie, true);
    return {
      id: decodedClaims.uid,
      email: decodedClaims.email || null,
      displayName: decodedClaims.name || null,
      photoURL: decodedClaims.picture || null,
    };
  }
}
