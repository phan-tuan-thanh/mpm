import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { ProjectModule } from './project/project.module';
import { AuditModule } from './audit/audit.module';
import { AdminModule } from './admin/admin.module';
import { TaskModule } from './task/task.module';
import { SprintModule } from './sprint/sprint.module';

@Module({
  imports: [
    // Environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    // PostgreSQL via TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('POSTGRES_HOST', 'localhost'),
        port: config.get<number>('POSTGRES_PORT', 5432),
        username: config.get<string>('POSTGRES_USER', 'mpm'),
        password: config.get<string>('POSTGRES_PASSWORD'),
        database: config.get<string>('POSTGRES_DB', 'mpm'),
        autoLoadEntities: true,
        synchronize: false, // Sử dụng migrations
      }),
    }),

    // Redis via ioredis
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single' as const,
        url: `redis://:${config.get('REDIS_PASSWORD')}@${config.get('REDIS_HOST', 'localhost')}:${config.get('REDIS_PORT', 6379)}/0`,
      }),
    }),

    // Feature modules
    AuthModule,
    ProfileModule,
    ProjectModule,
    AuditModule,
    AdminModule,
    TaskModule,
    SprintModule,
  ],
})
export class AppModule {}
