import { IAuthService } from '../../ports/auth.port';
import { User } from '../../entities/user.entity';

export class VerifySessionUseCase {
  constructor(private readonly authService: IAuthService) {}

  async execute(sessionCookie: string | undefined): Promise<User | null> {
    if (!sessionCookie) return null;
    try {
      return await this.authService.verifySessionCookie(sessionCookie);
    } catch (error) {
      // In a real app, we might want to log this but gracefully return null if session is invalid
      return null;
    }
  }
}
