import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * Mail Module
 *
 * @Global(): 전역 모듈로 등록하여 다른 모듈에서 import 없이 사용 가능
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
