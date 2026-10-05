import { IsNotEmpty, IsOptional, IsString, IsUrl, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewStatus, Severity, FindingCategory } from '../../common/enums';

export class CreateReviewDto {
  @ApiProperty({
    example: 'https://github.com/facebook/react/pull/12345',
    description: 'Public or repository GitHub Pull Request URL',
  })
  @IsString()
  @IsNotEmpty()
  prUrl: string;

  @ApiPropertyOptional({ example: 'custom review instructions' })
  @IsOptional()
  @IsString()
  customInstructions?: string;
}

export class ReviewQueryDto {
  @ApiPropertyOptional({ enum: ReviewStatus })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @ApiPropertyOptional({ example: 'facebook/react' })
  @IsOptional()
  @IsString()
  repoFullName?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}

export class FindingQueryDto {
  @ApiPropertyOptional({ enum: Severity })
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

  @ApiPropertyOptional({ enum: FindingCategory })
  @IsOptional()
  @IsEnum(FindingCategory)
  category?: FindingCategory;

  @ApiPropertyOptional({ example: 'src/index.ts' })
  @IsOptional()
  @IsString()
  file?: string;
}
