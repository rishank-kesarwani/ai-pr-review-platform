import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RepositoriesService } from './repositories.service';
import { UpdateRepoConfigDto } from './dto/update-repo-config.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Repositories')
@Controller('repositories')
export class RepositoriesController {
  constructor(private readonly repoService: RepositoriesService) {}

  @Public()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'List connected repositories' })
  async getRepositories(@CurrentUser('userId') userId?: string): Promise<any[]> {
    return this.repoService.getRepositories(userId);
  }

  @Public()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get repository details and configuration' })
  async getRepositoryById(@Param('id') id: string): Promise<any> {
    return this.repoService.getRepositoryById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/config')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update repository review rules and configuration' })
  async updateConfig(
    @Param('id') id: string,
    @Body() dto: UpdateRepoConfigDto,
    @CurrentUser('userId') userId: string,
  ): Promise<any> {
    return this.repoService.updateRepositoryConfig(id, dto, userId);
  }
}
