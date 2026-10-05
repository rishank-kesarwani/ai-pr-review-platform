import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface NotificationPayload {
  eventType: 'review.completed' | 'review.failed' | 'finding.critical_detected';
  repoFullName: string;
  pullRequestNumber: number;
  prTitle: string;
  prUrl: string;
  status: string;
  criticalFindingsCount: number;
  totalFindingsCount: number;
  summary?: string;
  recipientEmail?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    const serviceUrl = this.configService.get<string>('app.notificationService.url');
    const apiKey = this.configService.get<string>('app.notificationService.apiKey');
    const timeoutMs = this.configService.get<number>('app.notificationService.timeoutMs') || 10000;

    if (!serviceUrl) {
      this.logger.debug('Notification service URL not configured; skipping notification');
      return false;
    }

    try {
      this.logger.log(`Sending notification [${payload.eventType}] for PR ${payload.repoFullName}#${payload.pullRequestNumber}`);
      await axios.post(
        `${serviceUrl.replace(/\/+$/, '')}/notifications/events`,
        {
          source: 'ai-pr-review-platform',
          timestamp: new Date().toISOString(),
          ...payload,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          timeout: timeoutMs,
        },
      );
      return true;
    } catch (err: any) {
      this.logger.warn(`Failed to dispatch notification to Notification Service: ${err.message}`);
      return false;
    }
  }
}
