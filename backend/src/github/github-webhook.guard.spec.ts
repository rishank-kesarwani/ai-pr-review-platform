import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { GitHubWebhookGuard } from '../common/guards/github-webhook.guard';

describe('GitHubWebhookGuard', () => {
  let guard: GitHubWebhookGuard;
  let configService: ConfigService;
  const secret = 'super-secret-webhook-key-12345';

  beforeEach(() => {
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'app.github.webhookSecret') return secret;
        return null;
      }),
    } as any;

    guard = new GitHubWebhookGuard(configService);
  });

  it('should accept webhook with valid X-Hub-Signature-256', () => {
    const rawBody = JSON.stringify({ action: 'opened', pull_request: { number: 10 } });
    const hmac = crypto.createHmac('sha256', secret);
    const validSignature = `sha256=${hmac.update(rawBody).digest('hex')}`;

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            'x-hub-signature-256': validSignature,
          },
          body: JSON.parse(rawBody),
          rawBody: rawBody,
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should throw UnauthorizedException when signature is invalid', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            'x-hub-signature-256': 'sha256=invalid_signature_hex_code_12345',
          },
          body: { action: 'opened' },
          rawBody: JSON.stringify({ action: 'opened' }),
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when signature header is missing', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
          body: {},
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });
});
