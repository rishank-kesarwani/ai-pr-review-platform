import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { GitHubModule } from './github/github.module';
import { AnalyzersModule } from './analyzers/analyzers.module';
import { AiModule } from './ai/ai.module';
import { ArbitrationModule } from './arbitration/arbitration.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReviewsModule } from './reviews/reviews.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('app.database.uri'),
        autoIndex: true,
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('app.redis.url');
        if (redisUrl) {
          const parsed = new URL(redisUrl);
          return {
            connection: {
              host: parsed.hostname,
              port: parseInt(parsed.port || '6379', 10),
              username: parsed.username || undefined,
              password: parsed.password || undefined,
              tls: parsed.protocol === 'rediss:' ? {} : undefined,
              maxRetriesPerRequest: null,
            },
          };
        }
        return {
          connection: {
            host: configService.get<string>('app.redis.host') || '127.0.0.1',
            port: configService.get<number>('app.redis.port') || 6379,
            password: configService.get<string>('app.redis.password') || undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('app.rateLimit.ttl') || 60,
          limit: configService.get<number>('app.rateLimit.max') || 30,
        },
      ],
      inject: [ConfigService],
    }),
    DatabaseModule,
    AuthModule,
    GitHubModule,
    AnalyzersModule,
    AiModule,
    ArbitrationModule,
    NotificationsModule,
    ReviewsModule,
    RepositoriesModule,
    HealthModule,
  ],
})
export class AppModule {}
