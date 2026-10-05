import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Severity, FindingCategory } from '../../common/enums';

export class AiFindingDto {
  @IsString()
  file: string;

  @IsOptional()
  @IsNumber()
  line?: number;

  @IsOptional()
  @IsNumber()
  endLine?: number;

  @IsEnum(Severity)
  severity: Severity;

  @IsEnum(FindingCategory)
  category: FindingCategory;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  recommendation: string;

  @IsOptional()
  @IsString()
  evidence?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;
}

export class AiReviewResponseDto {
  @IsString()
  summary: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiFindingDto)
  findings: AiFindingDto[];
}
