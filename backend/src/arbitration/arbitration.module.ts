import { Module } from '@nestjs/common';
import { DeduplicationService } from './deduplication.service';
import { ArbitrationService } from './arbitration.service';

@Module({
  providers: [DeduplicationService, ArbitrationService],
  exports: [DeduplicationService, ArbitrationService],
})
export class ArbitrationModule {}
