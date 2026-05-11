export interface AlertContext {
  userId?: string;
  action?: string;
  latencyMs?: number;
  [key: string]: any;
}

export interface IAlertPort {
  sendAlert(message: string, context?: AlertContext): Promise<void>;
  sendErrorAlert(error: Error, context?: AlertContext): Promise<void>;
}
