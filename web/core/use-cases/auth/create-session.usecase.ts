import { IAuthService } from '../../ports/auth.port';

export class CreateSessionUseCase {
  constructor(private readonly authService: IAuthService) {}

  async execute(idToken: string): Promise<string> {
    if (!idToken) throw new Error("ID Token is required");
    
    // Default expiration: 5 days
    const expiresIn = 60 * 60 * 24 * 5 * 1000; 
    return await this.authService.createSessionCookie(idToken, expiresIn);
  }
}
