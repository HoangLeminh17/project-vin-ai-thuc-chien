import { IAuthService } from '@/core/ports/auth.port';
import { User } from '@/core/entities/user.entity';
import { getFirebaseAdminAuth } from '@/lib/firebase-admin';

export class FirebaseAuthAdapter implements IAuthService {
  async verifyToken(token: string): Promise<User> {
    const decodedToken = await getFirebaseAdminAuth().verifyIdToken(token);
    return {
      id: decodedToken.uid,
      email: decodedToken.email || null,
      displayName: decodedToken.name || null,
      photoURL: decodedToken.picture || null,
    };
  }

  async createSessionCookie(idToken: string, expiresIn: number): Promise<string> {
    return await getFirebaseAdminAuth().createSessionCookie(idToken, { expiresIn });
  }

  async verifySessionCookie(sessionCookie: string): Promise<User> {
    const decodedClaims = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
    return {
      id: decodedClaims.uid,
      email: decodedClaims.email || null,
      displayName: decodedClaims.name || null,
      photoURL: decodedClaims.picture || null,
    };
  }
}
