import { User } from '../entities/user.entity';

export interface IAuthService {
  /**
   * Verifies the authentication token and returns the user.
   * @param token - The ID token or session token
   */
  verifyToken(token: string): Promise<User>;

  /**
   * Generates a session cookie from an ID token.
   * @param idToken - The ID token from client-side Firebase
   */
  createSessionCookie(idToken: string, expiresIn: number): Promise<string>;

  /**
   * Verifies a session cookie and returns the user.
   * @param sessionCookie - The session cookie string
   */
  verifySessionCookie(sessionCookie: string): Promise<User>;
}
