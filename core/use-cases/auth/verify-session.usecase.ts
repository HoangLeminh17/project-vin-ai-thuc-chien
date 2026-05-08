import { IAuthService } from '../../ports/auth.port';
import { User } from '../../entities/user.entity';

const TTL_MS = 5 * 60 * 1000;

interface CacheEntry { user: User; expiresAt: number }
const sessionCache = new Map<string, CacheEntry>();

export class VerifySessionUseCase {
  constructor(private readonly authService: IAuthService) {}

  async execute(sessionCookie: string | undefined): Promise<User | null> {
    if (!sessionCookie) return null;
    const cached = sessionCache.get(sessionCookie);
    if (cached && cached.expiresAt > Date.now()) return cached.user;
    try {
      const user = await this.authService.verifySessionCookie(sessionCookie);
      sessionCache.set(sessionCookie, { user, expiresAt: Date.now() + TTL_MS });
      return user;
    } catch {
      sessionCache.delete(sessionCookie);
      return null;
    }
  }
}
