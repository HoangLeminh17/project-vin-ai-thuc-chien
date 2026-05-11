import { FirebaseAuthAdapter } from '../adapters/firebase-auth.adapter';
import { VerifySessionUseCase } from '@/core/use-cases/auth/verify-session.usecase';
import { CreateSessionUseCase } from '@/core/use-cases/auth/create-session.usecase';
import { getFirebaseAdminAuth } from '@/lib/firebase-admin';
import { withUseCaseLogging } from '@/core/utils/use-case-logger';
import { logger, monitoring } from './logger.di';

export const authAdapter = new FirebaseAuthAdapter(getFirebaseAdminAuth());

const rawVerifySessionUseCase = new VerifySessionUseCase(authAdapter);
export const verifySessionUseCase = withUseCaseLogging(
  rawVerifySessionUseCase, 
  'VerifySessionUseCase', 
  logger, 
  monitoring
);

const rawCreateSessionUseCase = new CreateSessionUseCase(authAdapter);
export const createSessionUseCase = withUseCaseLogging(
  rawCreateSessionUseCase, 
  'CreateSessionUseCase', 
  logger, 
  monitoring
);
