import { Module, forwardRef } from '@nestjs/common';
import { GitHubAppService } from './github-app.service';
import { GitHubApiService } from './github-api.service';
import { GitHubWebhookService } from './github-webhook.service';
import { GitHubWebhookController } from './github-webhook.controller';
import { DatabaseModule } from '../database/database.module';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => ReviewsModule)],
  controllers: [GitHubWebhookController],
  providers: [GitHubAppService, GitHubApiService, GitHubWebhookService],
  exports: [GitHubAppService, GitHubApiService, GitHubWebhookService],
})
export class GitHubModule {}
