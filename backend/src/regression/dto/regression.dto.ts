import { IsString, IsOptional, IsArray, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegressionStatus } from '../../common/enums';

export class RegressionCheckRequestDto {
  @ApiPropertyOptional({ example: 'ai-pr-review-platform' })
  @IsOptional()
  @IsString()
  project?: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ example: 'pr-review-evaluation' })
  @IsOptional()
  @IsString()
  datasetId?: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  datasetVersion?: string;

  @ApiPropertyOptional({ example: 'gemini-1.5-pro' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 'v1.0.0' })
  @IsOptional()
  @IsString()
  promptVersion?: string;

  @ApiPropertyOptional({ example: 'pr-review-baseline-v1' })
  @IsOptional()
  @IsString()
  baselineId?: string;

  @ApiPropertyOptional({
    example: ['quality', 'latency', 'cost', 'structured_output_validity', 'finding_precision'],
  })
  @IsOptional()
  @IsArray()
  metrics?: string[];
}

export class RegressionItemDto {
  @IsString()
  metric: string;

  @IsString()
  severity: string;

  @IsString()
  message: string;
}

export class RegressionCheckResponseDto {
  @IsEnum(RegressionStatus)
  status: RegressionStatus;

  @IsOptional()
  @IsString()
  runId?: string;

  @IsOptional()
  summary?: {
    passed: number;
    warnings: number;
    failed: number;
  };

  @IsOptional()
  metrics?: Record<string, any>;

  @IsOptional()
  @IsArray()
  regressions?: RegressionItemDto[];

  @IsOptional()
  @IsString()
  error?: string;
}
