import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * 전역 HTTP 예외 필터
 * - 모든 예외를 일관된 형식으로 응답
 * - 에러 로깅 통합
 * - 민감 정보 노출 방지 (프로덕션)
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '서버 내부 오류가 발생했습니다';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, any>;
        message = res.message || message;
        error = res.error || exception.name;
      }
    } else if (exception instanceof Error) {
      // TypeORM 에러 등 처리
      if (exception.message.includes('duplicate key')) {
        status = HttpStatus.CONFLICT;
        message = '이미 존재하는 데이터입니다';
        error = 'Conflict';
      } else if (exception.message.includes('Could not find any entity')) {
        status = HttpStatus.NOT_FOUND;
        message = '요청한 데이터를 찾을 수 없습니다';
        error = 'Not Found';
      }

      // 프로덕션에서는 상세 에러 숨김
      if (process.env.NODE_ENV !== 'production') {
        message = exception.message;
      }
    }

    // 에러 로깅
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // 일관된 에러 응답 형식
    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
