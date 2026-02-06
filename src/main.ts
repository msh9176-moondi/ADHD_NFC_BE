import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './modules/app/app.module';
import { GlobalExceptionFilter } from './modules/common/filters';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Helmet: HTTP 보안 헤더 설정
  // XSS, Clickjacking, MIME sniffing 등 방지
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
    }),
  );

  // 전역 예외 필터 설정
  // 모든 에러를 일관된 형식으로 응답
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 전역 ValidationPipe 설정
  // DTO 유효성 검사를 자동으로 수행
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성 제거
      forbidNonWhitelisted: true, // 정의되지 않은 속성이 있으면 에러
      transform: true, // 요청 데이터를 DTO 인스턴스로 변환
    }),
  );

  // CORS 설정
  const allowedOrigins = configService.get<string>('CORS_ORIGINS')?.split(',') || [];
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? allowedOrigins
        : true, // 개발환경: 모든 origin 허용
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('ADHD NFC API')
    .setDescription('ADHD NFC 백엔드 API 문서')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', '인증 관련 API')
    .addTag('Users', '유저 관련 API')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api-docs`);
}
bootstrap();
