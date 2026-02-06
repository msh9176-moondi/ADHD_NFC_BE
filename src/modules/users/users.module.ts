import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialAccount, User, UserAgreement } from './entities';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * Users Module
 *
 * - TypeOrmModule.forFeature()로 Repository를 등록
 * - exports로 UsersService를 다른 모듈에서 사용할 수 있게 한다
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, SocialAccount, UserAgreement])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
