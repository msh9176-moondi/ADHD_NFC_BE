import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check 엔드포인트
   * @Public() - 인증 없이 접근 가능 (서버 상태 확인용)
   */
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
