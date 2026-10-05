import { Module } from '@nestjs/common';
import { ModelRegressionService } from './model-regression.service';

@Module({
  providers: [ModelRegressionService],
  exports: [ModelRegressionService],
})
export class RegressionModule {}
