/**
 * Base class for all domain-specific errors.
 * Ensures that our Core does not leak implementation details from Infrastructure.
 */
export abstract class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a required resource is not found.
 */
export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message, 'NOT_FOUND');
  }
}

/**
 * Thrown when an external service (AI, Storage, Parser) fails.
 */
export class InfrastructureError extends DomainError {
  constructor(message: string, public readonly originalError?: any) {
    super(message, 'INFRASTRUCTURE_FAILURE');
  }
}

/**
 * Thrown when a business rule is violated.
 */
export class BusinessRuleError extends DomainError {
  constructor(message: string) {
    super(message, 'BUSINESS_RULE_VIOLATION');
  }
}

/**
 * Thrown when input data is invalid.
 */
export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}
