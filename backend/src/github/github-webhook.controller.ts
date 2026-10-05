import {
  Controller,
  Post,
  Headers,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GitHubWebhookGuard } from '../common/guards/github-webhook.guard';
import { GitHubWebhookService } from './github-webhook.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('GitHub Webhooks')
@Controller('github/webhooks')
export class GitHubWebhookController {
  constructor(private readonly webhookService: GitHubWebhookService) {}

  @Public()
  @UseGuards(GitHubWebhookGuard)
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive GitHub App Webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook acknowledged and processed' })
  async handleWebhook(
    @Headers('x-github-event') event: string,
    @Headers('x-github-delivery') deliveryId: string,
    @Body() payload: any,
  ) {
    return this.webhookService.handleWebhook(event, deliveryId, payload);
  }
}
