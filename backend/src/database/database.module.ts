import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { GitHubInstallation, GitHubInstallationSchema } from './schemas/github-installation.schema';
import { Repository, RepositorySchema } from './schemas/repository.schema';
import { PullRequestReview, PullRequestReviewSchema } from './schemas/pull-request-review.schema';
import { ReviewJob, ReviewJobSchema } from './schemas/review-job.schema';
import { ReviewFinding, ReviewFindingSchema } from './schemas/review-finding.schema';
import { ReviewConfiguration, ReviewConfigurationSchema } from './schemas/review-configuration.schema';
import { NotificationPreference, NotificationPreferenceSchema } from './schemas/notification-preference.schema';
import { PromptVersion, PromptVersionSchema } from './schemas/prompt-version.schema';
import { UsageRecord, UsageRecordSchema } from './schemas/usage-record.schema';
import { WebhookEvent, WebhookEventSchema } from './schemas/webhook-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: GitHubInstallation.name, schema: GitHubInstallationSchema },
      { name: Repository.name, schema: RepositorySchema },
      { name: PullRequestReview.name, schema: PullRequestReviewSchema },
      { name: ReviewJob.name, schema: ReviewJobSchema },
      { name: ReviewFinding.name, schema: ReviewFindingSchema },
      { name: ReviewConfiguration.name, schema: ReviewConfigurationSchema },
      { name: NotificationPreference.name, schema: NotificationPreferenceSchema },
      { name: PromptVersion.name, schema: PromptVersionSchema },
      { name: UsageRecord.name, schema: UsageRecordSchema },
      { name: WebhookEvent.name, schema: WebhookEventSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
