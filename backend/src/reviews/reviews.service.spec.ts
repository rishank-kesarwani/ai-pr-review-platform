jest.mock('@octokit/auth-app', () => ({
  createAppAuth: jest.fn().mockReturnValue(jest.fn().mockResolvedValue({ token: 'mock-token' })),
}));

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      pulls: {
        get: jest.fn(),
        listFiles: jest.fn(),
      },
      checks: {
        create: jest.fn(),
        update: jest.fn(),
      },
      issues: {
        createComment: jest.fn(),
      },
    },
  })),
}));

import { ReviewsService } from './reviews.service';
import { BadRequestException } from '@nestjs/common';
import { ReviewStatus } from '../common/enums';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let mockReviewModel: any;
  let mockJobModel: any;
  let mockFindingModel: any;
  let mockRepoModel: any;
  let mockOrchestrator: any;
  let mockQueue: any;

  beforeEach(() => {
    mockReviewModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    mockJobModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      updateMany: jest.fn(),
    };
    mockFindingModel = {
      find: jest.fn(),
    };
    mockRepoModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
    };
    mockOrchestrator = {
      processReview: jest.fn(),
    };
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    };

    service = new ReviewsService(
      mockReviewModel,
      mockJobModel,
      mockFindingModel,
      mockRepoModel,
      mockOrchestrator,
      mockQueue,
    );
  });

  it('should reject invalid GitHub PR URLs', async () => {
    await expect(
      service.enqueueReview({ prUrl: 'https://invalid-url.com' }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.enqueueReview({ prUrl: 'https://github.com/facebook/react/issues/123' }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.enqueueReview({ prUrl: 'https://github.com/facebook/react/pull/-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should enqueue valid public PR review successfully in PUBLIC_PR_URL mode', async () => {
    mockReviewModel.findOne.mockResolvedValue(null);
    mockRepoModel.findOne.mockResolvedValue(null); // No installation connected
    mockReviewModel.create.mockImplementation((doc: any) => Promise.resolve({
      _id: 'review-123',
      ...doc,
    }));

    const result = await service.enqueueReview({
      prUrl: 'https://github.com/karanpratapsingh/system-design/pull/13',
    });

    expect(result.status).toBe(ReviewStatus.QUEUED);
    expect(mockReviewModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        repoFullName: 'karanpratapsingh/system-design',
        pullRequestNumber: 13,
        reviewSource: 'PUBLIC_PR_URL',
        githubWriteAccess: false,
      }),
    );
    expect(mockJobModel.create).toHaveBeenCalled();
    expect(mockQueue.add).toHaveBeenCalled();
  });

  it('should enqueue review in GITHUB_APP mode when installation exists', async () => {
    mockReviewModel.findOne.mockResolvedValue(null);
    mockRepoModel.findOne.mockResolvedValue({ _id: 'repo-app-123', installationId: 9988 });
    mockReviewModel.create.mockImplementation((doc: any) => Promise.resolve({
      _id: 'review-app-123',
      ...doc,
    }));

    const result = await service.enqueueReview({
      prUrl: 'https://github.com/facebook/react/pull/12345',
      installationId: 9988,
    });

    expect(mockReviewModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        repoFullName: 'facebook/react',
        pullRequestNumber: 12345,
        reviewSource: 'GITHUB_APP',
        githubWriteAccess: true,
      }),
    );
  });

  it('should return active review if one is already in progress without starting duplicate', async () => {
    const existingActiveReview = {
      _id: 'active-review-555',
      repoFullName: 'facebook/react',
      pullRequestNumber: 12345,
      status: ReviewStatus.AI_REVIEW,
      prUrl: 'https://github.com/facebook/react/pull/12345',
    };
    mockReviewModel.findOne.mockResolvedValue(existingActiveReview);

    const result = await service.enqueueReview({
      prUrl: 'https://github.com/facebook/react/pull/12345',
    });

    expect(result._id).toBe('active-review-555');
    expect(result.status).toBe(ReviewStatus.AI_REVIEW);
    expect(mockReviewModel.create).not.toHaveBeenCalled();
    expect(mockQueue.add).not.toHaveBeenCalled();
  });
});
