import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Application is healthy' })
  check() {
    const isMongoConnected = this.connection.readyState === 1;

    return {
      status: isMongoConnected ? 'ok' : 'degraded',
      service: 'ai-pr-review-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: isMongoConnected ? 'connected' : 'disconnected',
        readyState: this.connection.readyState,
      },
      memoryUsage: process.memoryUsage(),
      version: '1.0.0',
    };
  }
}
