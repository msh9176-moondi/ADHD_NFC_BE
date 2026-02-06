import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities';

/**
 * 현재 로그인한 유저를 가져오는 데코레이터
 *
 * 사용 예시:
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User;

    // 특정 필드만 추출할 경우
    if (data) {
      return user[data];
    }

    return user;
  },
);
