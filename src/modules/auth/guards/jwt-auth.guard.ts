import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT 인증 Guard
 *
 * 🔐 주요 기능:
 * - @UseGuards(JwtAuthGuard)로 라우트에 적용
 * - 인증 실패 시 401 Unauthorized 응답
 * - @Public() 데코레이터가 있는 라우트는 인증 skip
 *
 * 📌 작동 순서:
 * 1. canActivate() 호출
 * 2. Reflector로 @Public() 메타데이터 확인
 * 3. isPublic이 true면 → 인증 없이 통과 (return true)
 * 4. isPublic이 false면 → 부모 클래스의 JWT 검증 실행
 *
 * 💡 글로벌 가드로 설정하면:
 * - 모든 API가 기본적으로 인증 필요
 * - @Public()이 있는 API만 인증 없이 접근 가능
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * 인증 검사 실행 여부 결정
   *
   * @param context - 실행 컨텍스트 (요청 정보 포함)
   * @returns true면 통과, false면 거부
   */
  canActivate(context: ExecutionContext) {
    // 1. @Public() 데코레이터가 있는지 확인
    // getAllAndOverride: 메서드 → 클래스 순서로 메타데이터 검색
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), // 메서드 레벨 데코레이터 확인
      context.getClass(), // 클래스 레벨 데코레이터 확인
    ]);

    // 2. @Public()이 있으면 인증 skip
    if (isPublic) {
      return true;
    }

    // 3. @Public()이 없으면 JWT 인증 실행
    return super.canActivate(context);
  }
}
