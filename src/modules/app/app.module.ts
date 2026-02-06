import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { validate } from '../../config/env.validation';
import { getTypeOrmConfig } from '../../config/typeorm.config';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards';
import { CoinModule } from '../coin/coin.module';
import { DailyLogsModule } from '../daily-logs/daily-logs.module';
import { GrowthModule } from '../growth/growth.module';
import { MailModule } from '../mail';
import { NfcModule } from '../nfc/nfc.module';
import { ProductsModule } from '../products/products.module';
import { ReportsModule } from '../reports/reports.module';
import { TraitsModule } from '../traits/traits.module';
import { UsersModule } from '../users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * App Module (Root Module)
 *
 * - ConfigModule.forRoot(): 환경변수 로드 (isGlobal: true로 전역 사용)
 * - TypeOrmModule.forRootAsync(): DB 연결 (ConfigService 주입)
 * - ThrottlerModule: Rate Limiting (무차별 대입 공격 방지)
 * - validate: 환경변수 유효성 검사
 */
@Module({
  imports: [
    // 환경변수 설정 (전역)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),

    // Rate Limiting: 1분에 60회 요청 제한
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1분 (밀리초)
        limit: 60, // 최대 60회
      },
    ]),

    // 데이터베이스 연결
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),

    // Feature Modules
    MailModule,
    AuthModule,
    UsersModule,
    NfcModule,
    CoinModule,
    DailyLogsModule,
    GrowthModule,
    TraitsModule,
    ReportsModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Rate Limiting 전역 적용
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // JWT 인증 전역 적용 - @Public() 데코레이터가 있는 라우트는 인증 skip
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
