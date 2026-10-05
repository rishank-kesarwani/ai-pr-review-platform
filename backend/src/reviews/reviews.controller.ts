import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ReviewQueryDto, FindingQueryDto } from './dto/review.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Pull Request Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a GitHub PR URL for automated AI review' })
  @ApiResponse({ status: 201, description: 'Review successfully queued' })
  async createReview(
    @Body() dto: CreateReviewDto,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.reviewsService.enqueueReview({
      prUrl: dto.prUrl,
      userId,
      triggeredBy: userId ? 'MANUAL' : 'EXTENSION_OR_GUEST',
    });
  }

  @Public()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get list of reviews with optional filters' })
  async getReviews(
    @Query() query: ReviewQueryDto,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.reviewsService.getReviews(query, userId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get review metadata and summary by ID' })
  async getReviewById(@Param('id') id: string) {
    return this.reviewsService.getReviewById(id);
  }

  @Public()
  @Get(':id/findings')
  @ApiOperation({ summary: 'Get detailed code findings for a review' })
  async getReviewFindings(
    @Param('id') id: string,
    @Query() query: FindingQueryDto,
  ) {
    return this.reviewsService.getReviewFindings(id, query);
  }

  @Public()
  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an active or queued review' })
  async cancelReview(@Param('id') id: string) {
    return this.reviewsService.cancelReview(id);
  }

  @Public()
  @UseGuards(JwtAuthGuard)
  @Post(':id/retry')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Retry a failed or partial review' })
  async retryReview(
    @Param('id') id: string,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.reviewsService.retryReview(id, userId);
  }

  @Public()
  @Get(':id/regression')
  @ApiOperation({ summary: 'Get model regression evaluation results for a review' })
  async getReviewRegression(@Param('id') id: string) {
    return this.reviewsService.getReviewRegression(id);
  }

  @Public()
  @UseGuards(JwtAuthGuard)
  @Post(':id/regression/trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger on-demand model regression check for a review' })
  async triggerReviewRegression(@Param('id') id: string) {
    return this.reviewsService.triggerReviewRegression(id);
  }
}

