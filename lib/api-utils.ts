import { NextResponse } from 'next/server';
import { DomainError, InfrastructureError, NotFoundError, ValidationError, BusinessRuleError } from '@/core/errors/domain-error';
import { logger, monitoring } from '@/infrastructure/registry';

export function handleApiError(error: any, routeName: string) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  
  // Log and monitor everything first
  logger.error(`[API] Error in ${routeName}`, { 
    error: message, 
    stack: error instanceof Error ? error.stack : undefined 
  });
  monitoring.captureException(error, { route: routeName });

  // Map Domain Errors to HTTP Status Codes
  if (error instanceof ValidationError) {
    return NextResponse.json({ success: false, error: message, code: error.code }, { status: 400 });
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json({ success: false, error: message, code: error.code }, { status: 404 });
  }

  if (error instanceof BusinessRuleError) {
    return NextResponse.json({ success: false, error: message, code: error.code }, { status: 422 });
  }

  if (error instanceof InfrastructureError) {
    return NextResponse.json({ 
      success: false, 
      error: 'An internal service failure occurred.', 
      code: error.code 
    }, { status: 502 });
  }

  if (error instanceof DomainError) {
    return NextResponse.json({ success: false, error: message, code: error.code }, { status: 500 });
  }

  return NextResponse.json({ 
    success: false, 
    error: 'An unexpected error occurred.' 
  }, { status: 500 });
}
