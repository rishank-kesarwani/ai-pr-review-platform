import { Module } from '@nestjs/common';
import { ESLintAnalyzer } from './eslint.analyzer';
import { TypeScriptAnalyzer } from './typescript.analyzer';
import { AnalyzersService } from './analyzers.service';

@Module({
  providers: [ESLintAnalyzer, TypeScriptAnalyzer, AnalyzersService],
  exports: [AnalyzersService],
})
export class AnalyzersModule {}
