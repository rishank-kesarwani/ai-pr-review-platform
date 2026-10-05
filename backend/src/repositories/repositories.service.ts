import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Repository, RepositoryDocument } from '../database/schemas/repository.schema';
import { ReviewConfiguration, ReviewConfigurationDocument } from '../database/schemas/review-configuration.schema';
import { UpdateRepoConfigDto } from './dto/update-repo-config.dto';

@Injectable()
export class RepositoriesService {
  private readonly logger = new Logger(RepositoriesService.name);

  constructor(
    @InjectModel(Repository.name) private repoModel: Model<RepositoryDocument>,
    @InjectModel(ReviewConfiguration.name)
    private configModel: Model<ReviewConfigurationDocument>,
  ) {}

  async getRepositories(userId?: string): Promise<any[]> {
    const filter = userId ? { $or: [{ addedBy: new Types.ObjectId(userId) }, { isPrivate: false }] } : { isPrivate: false };
    return this.repoModel.find(filter).sort({ fullName: 1 }).lean();
  }

  async getRepositoryById(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Repository ID format');
    }
    const repo = await this.repoModel.findById(id).lean();
    if (!repo) {
      throw new NotFoundException(`Repository #${id} not found`);
    }

    const config = await this.configModel.findOne({ repositoryId: repo._id }).lean();
    return {
      ...repo,
      configuration: config || {
        autoCommentEnabled: false,
        minCommentSeverity: 'HIGH',
        minCommentConfidence: 0.8,
        enabledAnalyzers: ['ESLINT', 'TYPESCRIPT', 'AI'],
        customRules: [],
        ignoredFiles: ['dist/**', 'node_modules/**', '*.lock'],
        maxFilesPerReview: 50,
        regressionEnabled: false,
        regressionBlocking: false,
        regressionDataset: 'pr-review-evaluation',
        regressionBaseline: 'pr-review-baseline-v1',
        regressionPolicy: 'manual',
      },
    };
  }

  async updateRepositoryConfig(id: string, dto: UpdateRepoConfigDto, userId?: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Repository ID format');
    }

    const repo = await this.repoModel.findById(id);
    if (!repo) {
      throw new NotFoundException(`Repository #${id} not found`);
    }

    const updatedConfig = await this.configModel.findOneAndUpdate(
      { repositoryId: repo._id },
      {
        repositoryId: repo._id,
        userId: userId ? new Types.ObjectId(userId) : undefined,
        ...dto,
      },
      { upsert: true, new: true },
    );

    return updatedConfig;
  }
}
