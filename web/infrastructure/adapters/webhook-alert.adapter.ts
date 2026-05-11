import { IAlertPort, AlertContext } from '@/core/ports/alert.port';

export class WebhookAlertAdapter implements IAlertPort {
  constructor(private readonly webhookUrl: string) {
    if (!webhookUrl) {
      console.warn('[WebhookAlertAdapter] No webhook URL provided. Alerts will only be logged locally.');
    }
  }

  private async postToWebhook(payload: any): Promise<void> {
    if (!this.webhookUrl) {
      console.warn('[WebhookAlertAdapter/Local]', JSON.stringify(payload, null, 2));
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
        console.error(`[WebhookAlertAdapter] Failed to send alert. Status: ${response.status}`);
      }
    } catch (e) {
      console.error('[WebhookAlertAdapter] Error sending alert webhook:', e);
    }
  }

  async sendAlert(message: string, context?: AlertContext): Promise<void> {
    const payload = {
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
    const payload = {
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
    const payload = {
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
