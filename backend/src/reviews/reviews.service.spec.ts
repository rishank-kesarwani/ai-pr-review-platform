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
  });

  it('should enqueue valid public PR review successfully', async () => {
    mockReviewModel.findOne.mockResolvedValue(null);
    mockRepoModel.findOne.mockResolvedValue({ _id: 'repo-123' });
    mockReviewModel.create.mockResolvedValue({
      _id: 'review-123',
      prUrl: 'https://github.com/facebook/react/pull/12345',
      repoFullName: 'facebook/react',
      pullRequestNumber: 12345,
      status: ReviewStatus.QUEUED,
    });

    const result = await service.enqueueReview({
      prUrl: 'https://github.com/facebook/react/pull/12345',
    });

    expect(result.status).toBe(ReviewStatus.QUEUED);
    expect(mockJobModel.create).toHaveBeenCalled();
    expect(mockQueue.add).toHaveBeenCalled();
  });
});
