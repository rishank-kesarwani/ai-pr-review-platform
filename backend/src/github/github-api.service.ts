import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { GitHubAppService } from './github-app.service';
import { parseDiffPatch, ParsedDiffFile } from '../common/utils/diff-parser.util';

export interface PullRequestDetails {
  id: number;
  number: number;
  title: string;
  description: string;
  author: string;
  baseBranch: string;
  headBranch: string;
  headSha: string;
  htmlUrl: string;
  isPrivate: boolean;
  additions: number;
  deletions: number;
  changedFilesCount: number;
}

export interface PrFileChange extends ParsedDiffFile {
  rawUrl?: string;
  contentsUrl?: string;
}

@Injectable()
export class GitHubApiService {
  private readonly logger = new Logger(GitHubApiService.name);

  constructor(private readonly githubAppService: GitHubAppService) {}

  private async getClient(installationId?: number): Promise<Octokit> {
    if (installationId) {
      return this.githubAppService.getInstallationOctokit(installationId);
    }
    return this.githubAppService.getAppOctokit();
  }

  async getPullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    installationId?: number,
  ): Promise<PullRequestDetails> {
    try {
      const octokit = await this.getClient(installationId);
      const { data } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      });

      return {
        id: data.id,
        number: data.number,
        title: data.title || '',
        description: data.body || '',
        author: data.user?.login || 'unknown',
        baseBranch: data.base.ref,
        headBranch: data.head.ref,
        headSha: data.head.sha,
        htmlUrl: data.html_url,
        isPrivate: data.base.repo?.private || false,
        additions: data.additions,
        deletions: data.deletions,
        changedFilesCount: data.changed_files,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch PR ${owner}/${repo}#${pullNumber}: ${error.message}`,
      );
      if (error.status === 404) {
        throw new HttpException(
          `Pull request ${owner}/${repo}#${pullNumber} not found or is private`,
          HttpStatus.NOT_FOUND,
        );
      }
      if (error.status === 403) {
        throw new HttpException(
          `GitHub API rate limit exceeded or access forbidden`,
          HttpStatus.FORBIDDEN,
        );
      }
      throw new HttpException(
        `GitHub API error: ${error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getPullRequestFiles(
    owner: string,
    repo: string,
    pullNumber: number,
    maxFiles: number = 50,
    installationId?: number,
  ): Promise<PrFileChange[]> {
    try {
      const octokit = await this.getClient(installationId);
      const { data } = await octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
        per_page: Math.min(maxFiles, 100),
      });

      return data.map((file) => {
        const { validLines } = parseDiffPatch(file.patch);
        return {
          filename: file.filename,
          previousFilename: file.previous_filename,
          status: file.status as 'added' | 'modified' | 'deleted' | 'renamed',
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          patch: file.patch,
          validLines,
          rawUrl: file.raw_url,
          contentsUrl: file.contents_url,
        };
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to list files for PR ${owner}/${repo}#${pullNumber}: ${error.message}`,
      );
      throw new HttpException(
        `Failed to fetch PR files from GitHub: ${error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async createCheckRun(
    owner: string,
    repo: string,
    headSha: string,
    installationId?: number,
  ): Promise<number | undefined> {
    if (!this.githubAppService.isConfigured() || !installationId) {
      return undefined;
    }
    try {
      const octokit = await this.getClient(installationId);
      const { data } = await octokit.rest.checks.create({
        owner,
        repo,
        name: 'AI Code Review',
        head_sha: headSha,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        output: {
          title: 'AI PR Review in Progress',
          summary: 'Analyzing code changes, running static analysis and AI inspection...',
        },
      });
      return data.id;
    } catch (error: any) {
      this.logger.warn(`Could not create GitHub Check Run: ${error.message}`);
      return undefined;
    }
  }

  async updateCheckRun(
    owner: string,
    repo: string,
    checkRunId: number,
    conclusion: 'success' | 'failure' | 'neutral',
    summary: string,
    annotations: Array<{
      path: string;
      start_line: number;
      end_line: number;
      annotation_level: 'notice' | 'warning' | 'failure';
      message: string;
      title?: string;
    }> = [],
    installationId?: number,
  ): Promise<void> {
    if (!checkRunId || !installationId) return;
    try {
      const octokit = await this.getClient(installationId);
      await octokit.rest.checks.update({
        owner,
        repo,
        check_run_id: checkRunId,
        status: 'completed',
        conclusion,
        completed_at: new Date().toISOString(),
        output: {
          title: conclusion === 'success' ? 'AI Review Passed' : 'AI Review Findings Detected',
          summary,
          annotations: annotations.slice(0, 50), // GitHub allows max 50 annotations per check run request
        },
      });
    } catch (error: any) {
      this.logger.warn(`Could not update GitHub Check Run #${checkRunId}: ${error.message}`);
    }
  }

  async postPullRequestComment(
    owner: string,
    repo: string,
    pullNumber: number,
    body: string,
    installationId?: number,
  ): Promise<void> {
    if (!installationId) return;
    try {
      const octokit = await this.getClient(installationId);
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body,
      });
    } catch (error: any) {
      this.logger.warn(`Could not post PR comment: ${error.message}`);
    }
  }
}
