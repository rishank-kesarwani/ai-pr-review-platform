import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WebhookEvent, WebhookEventDocument } from '../database/schemas/webhook-event.schema';
import { GitHubInstallation, GitHubInstallationDocument } from '../database/schemas/github-installation.schema';
import { Repository, RepositoryDocument } from '../database/schemas/repository.schema';
import { ReviewsService } from '../reviews/reviews.service';

@Injectable()
export class GitHubWebhookService {
  private readonly logger = new Logger(GitHubWebhookService.name);

  constructor(
    @InjectModel(WebhookEvent.name) private webhookEventModel: Model<WebhookEventDocument>,
    @InjectModel(GitHubInstallation.name) private installationModel: Model<GitHubInstallationDocument>,
    @InjectModel(Repository.name) private repoModel: Model<RepositoryDocument>,
    private readonly reviewsService: ReviewsService,
  ) {}

  async handleWebhook(event: string, deliveryId: string, payload: any): Promise<{ status: string; message: string }> {
    this.logger.log(`Received GitHub webhook [${event}] with delivery ID ${deliveryId}`);

    if (event === 'ping') {
      return { status: 'acknowledged', message: 'Pong received' };
    }

    if (event === 'installation' || event === 'installation_repositories') {
      await this.handleInstallationEvent(event, payload);
      return { status: 'acknowledged', message: 'Installation event processed' };
    }

    if (event === 'pull_request') {
      return this.handlePullRequestEvent(deliveryId, payload);
    }

    return { status: 'ignored', message: `Event ${event} not handled` };
  }

  private async handlePullRequestEvent(deliveryId: string, payload: any): Promise<{ status: string; message: string }> {
    const action = payload.action;
    const pr = payload.pull_request;
    const repo = payload.repository;
    const installation = payload.installation;

    // Supported actions
    const supportedActions = ['opened', 'reopened', 'synchronize', 'ready_for_review'];
    if (!supportedActions.includes(action)) {
      return { status: 'ignored', message: `PR action '${action}' is not configured for automatic review` };
    }

    if (pr.draft && action !== 'ready_for_review') {
      return { status: 'ignored', message: 'Draft PRs are skipped until marked ready for review' };
    }

    const repoFullName = repo.full_name;
    const pullNumber = pr.number;
    const commitSha = pr.head.sha;
    const idempotencyKey = `gh:${repoFullName}:${pullNumber}:${commitSha}:${action}`;

    // Idempotency check: prevent duplicate reviews
    const existingEvent = await this.webhookEventModel.findOne({ eventId: idempotencyKey });
    if (existingEvent) {
      this.logger.log(`Duplicate webhook event ignored: ${idempotencyKey}`);
      return { status: 'duplicate_ignored', message: 'Event has already been processed' };
    }

    // Save event record
    await this.webhookEventModel.create({
      eventId: idempotencyKey,
      eventType: 'pull_request',
      eventAction: action,
      repoFullName,
      pullRequestNumber: pullNumber,
      commitSha,
      status: 'PROCESSED',
      metadata: {
        deliveryId,
        sender: payload.sender?.login,
        installationId: installation?.id,
      },
    });

    // Ensure repository document exists
    let repoDoc = await this.repoModel.findOne({ fullName: repoFullName });
    if (!repoDoc) {
      repoDoc = await this.repoModel.create({
        githubRepoId: repo.id,
        owner: repo.owner.login,
        name: repo.name,
        fullName: repoFullName,
        isPrivate: repo.private,
        defaultBranch: repo.default_branch,
        installationId: installation?.id,
      });
    }

    // Trigger asynchronous PR review
    this.logger.log(`Enqueuing review for ${repoFullName}#${pullNumber} (${commitSha})`);
    await this.reviewsService.enqueueReview({
      prUrl: pr.html_url,
      repositoryId: repoDoc._id.toString(),
      triggeredBy: 'WEBHOOK',
      installationId: installation?.id,
      prDetails: {
        id: pr.id,
        number: pullNumber,
        title: pr.title,
        description: pr.body || '',
        author: pr.user?.login || 'unknown',
        baseBranch: pr.base.ref,
        headBranch: pr.head.ref,
        headSha: commitSha,
        htmlUrl: pr.html_url,
        isPrivate: repo.private,
        additions: pr.additions || 0,
        deletions: pr.deletions || 0,
        changedFilesCount: pr.changed_files || 0,
      },
    });

    return { status: 'enqueued', message: `Review enqueued for PR #${pullNumber}` };
  }

  private async handleInstallationEvent(event: string, payload: any) {
    const installation = payload.installation;
    const action = payload.action;

    if (action === 'created') {
      await this.installationModel.findOneAndUpdate(
        { installationId: installation.id },
        {
          installationId: installation.id,
          accountLogin: installation.account.login,
          accountType: installation.account.type,
          accountAvatarUrl: installation.account.avatar_url,
          repositorySelection: installation.repository_selection,
          permissions: installation.permissions,
          isActive: true,
        },
        { upsert: true, new: true },
      );
    } else if (action === 'deleted' || action === 'suspend') {
      await this.installationModel.findOneAndUpdate(
        { installationId: installation.id },
        { isActive: false },
      );
    }
  }
}
