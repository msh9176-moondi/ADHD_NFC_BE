import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync } from 'class-validator';

/**
 * 실무 포인트:
 * - 환경변수 타입 검증을 앱 시작 시점에 수행합니다
 * - 잘못된 설정으로 인한 런타임 에러를 방지합니다
 * - 필수 환경변수가 누락되면 앱이 시작되지 않습니다
 */

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  // Database
  @IsString()
  DB_HOST: string;

  @IsNumber()
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_DATABASE: string;

  // JWT
  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    // 문자열을 대상 타입으로 자동 변환
    enableImplicitConversion: true,
  });
  // 데코레이터 규칙을 만족하는지 동기적으로 검증하고 에러사항을 errors로 반환
  const errors = validateSync(validatedConfig, {
    // 누락된 속성이 있는지 검사
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
