import { Module } from '@nestjs/common';
import { PromptService } from './prompt.service';
import { AiPlatformService } from './ai-platform.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [PromptService, AiPlatformService],
  exports: [PromptService, AiPlatformService],
})
export class AiModule {}
