import { IsBoolean, IsEnum, IsNumber, IsOptional, IsArray, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Severity } from '../../common/enums';

export class UpdateRepoConfigDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  autoCommentEnabled?: boolean;

  @ApiPropertyOptional({ enum: Severity, example: Severity.HIGH })
  @IsOptional()
  @IsEnum(Severity)
  minCommentSeverity?: Severity;

  @ApiPropertyOptional({ example: 0.85 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minCommentConfidence?: number;

  @ApiPropertyOptional({ example: ['ESLINT', 'TYPESCRIPT', 'AI'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledAnalyzers?: string[];

  @ApiPropertyOptional({ example: ['Ensure all database calls use transactions'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customRules?: string[];

  @ApiPropertyOptional({ example: ['dist/**', '*.min.js'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ignoredFiles?: string[];

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  maxFilesPerReview?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  regressionEnabled?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  regressionBlocking?: boolean;

  @ApiPropertyOptional({ example: 'pr-review-evaluation' })
  @IsOptional()
  @IsString()
  regressionDataset?: string;

  @ApiPropertyOptional({ example: 'pr-review-baseline-v1' })
  @IsOptional()
  @IsString()
  regressionBaseline?: string;

  @ApiPropertyOptional({ example: 'manual' })
  @IsOptional()
  @IsString()
  regressionPolicy?: string;
}
