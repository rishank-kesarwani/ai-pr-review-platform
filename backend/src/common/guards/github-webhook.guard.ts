import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Request } from 'express';

@Injectable()
export class GitHubWebhookGuard implements CanActivate {
  private readonly logger = new Logger(GitHubWebhookGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const signature = request.headers['x-hub-signature-256'] as string;
    const webhookSecret = this.configService.get<string>('app.github.webhookSecret');

    if (!webhookSecret) {
      this.logger.warn('GITHUB_WEBHOOK_SECRET is not configured. Webhook rejected for security.');
      throw new UnauthorizedException('Webhook secret not configured on server');
    }

    if (!signature) {
      this.logger.warn('Received GitHub webhook missing X-Hub-Signature-256 header');
      throw new UnauthorizedException('Missing X-Hub-Signature-256 header');
    }

    // Get raw payload buffer/string
    const rawBody = (request as any).rawBody || JSON.stringify(request.body);
    const hmac = crypto.createHmac('sha256', webhookSecret);
    const expectedSignature = `sha256=${hmac.update(rawBody).digest('hex')}`;

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      this.logger.warn('Invalid GitHub webhook signature received');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
