import { IAlertPort, AlertContext } from '@/core/ports/alert.port';
import { logger } from '@/infrastructure/di/logger.di'

export class WebhookAlertAdapter implements IAlertPort {
  constructor(private readonly webhookUrl: string) {
    if (!webhookUrl) {
      logger.warn('[WebhookAlertAdapter] No webhook URL provided; alerts will only be logged locally')
    }
  }

  private get webhookKind(): 'discord' | 'slack' {
    // Slack incoming webhooks are typically under hooks.slack.com/services/...
    if (/hooks\.slack\.com\/services\//i.test(this.webhookUrl)) return 'slack'
    return 'discord'
  }

  private formatContext(context?: AlertContext): string {
    if (!context) return ''
    const lines = Object.entries(context).map(([k, v]) => `${k}: ${String(v)}`)
    return lines.length ? `\n${lines.join('\n')}` : ''
  }

  private async postToWebhook(payload: any): Promise<void> {
    if (!this.webhookUrl) {
      logger.warn('[WebhookAlertAdapter/Local]', { payload })
      return;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let bodyText = ''
        try {
          bodyText = await response.text()
        } catch {}
        logger.error('[WebhookAlertAdapter] Failed to send alert', { status: response.status, body: bodyText.slice(0, 1000) })
      }
    } catch (e) {
      logger.error('[WebhookAlertAdapter] Error sending alert webhook', { err: e })
    }
  }

  async sendAlert(message: string, context?: AlertContext): Promise<void> {
    const payload = this.webhookKind === 'slack'
      ? { text: `:rotating_light: ALERT: ${message}${this.formatContext(context)}` }
      : {
          content: `🚨 **ALERT:** ${message}`,
          embeds: [
            {
              title: 'Alert Context',
              color: 16753920, // Orange
              fields: context ? Object.entries(context).map(([key, value]) => ({
                name: key,
                value: String(value),
                inline: true
              })) : [],
              timestamp: new Date().toISOString()
            }
          ]
        };

    await this.postToWebhook(payload);
  }

  async sendErrorAlert(error: Error, context?: AlertContext): Promise<void> {
    const payload = this.webhookKind === 'slack'
      ? { text: `:boom: CRITICAL ERROR: ${error.message}${this.formatContext({ ...(context || {}), stack: error.stack || 'No stack trace' })}` }
      : {
          content: `💥 **CRITICAL ERROR:** ${error.message}`,
          embeds: [
            {
              title: 'Error Details',
              description: `\`\`\`\n${error.stack || 'No stack trace'}\n\`\`\``,
              fields: context ? Object.entries(context).map(([key, value]) => ({
                name: key,
                value: String(value),
                inline: true
              })) : [],
              timestamp: new Date().toISOString()
            }
          ]
        };

    await this.postToWebhook(payload);
  }

  async sendSuccessAlert(message: string, context?: AlertContext): Promise<void> {
    const payload = this.webhookKind === 'slack'
      ? { text: `:white_check_mark: SUCCESS: ${message}${this.formatContext(context)}` }
      : {
          content: `✅ **SUCCESS:** ${message}`,
          embeds: [
            {
              title: 'Event Details',
              color: 3066993, // Green
              fields: context ? Object.entries(context).map(([key, value]) => ({
                name: key,
                value: String(value),
                inline: true
              })) : [],
              timestamp: new Date().toISOString()
            }
          ]
        };

    await this.postToWebhook(payload);
  }
}
