import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ReviewOrchestratorService } from './review-orchestrator.service';
import { ReviewProcessor } from './review.processor';
import { DatabaseModule } from '../database/database.module';
import { GitHubModule } from '../github/github.module';
import { AnalyzersModule } from '../analyzers/analyzers.module';
import { AiModule } from '../ai/ai.module';
import { ArbitrationModule } from '../arbitration/arbitration.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => GitHubModule),
    AnalyzersModule,
    AiModule,
    ArbitrationModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: 'pr-review',
    }),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewOrchestratorService, ReviewProcessor],
  exports: [ReviewsService, ReviewOrchestratorService],
})
export class ReviewsModule {}
