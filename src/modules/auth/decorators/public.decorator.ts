import { SetMetadata } from '@nestjs/common';

/**
 * Public 데코레이터 - 인증 없이 접근 가능한 라우트 표시
 *
 * 🔑 사용 목적:
 * - JwtAuthGuard가 글로벌로 적용되어 있을 때,
 * - 로그인/회원가입 등 인증 없이 접근해야 하는 API에 사용
 *
 * 📌 작동 원리:
 * 1. SetMetadata로 'isPublic' 키에 true 값을 저장
 * 2. JwtAuthGuard가 Reflector로 이 값을 읽어서 체크
 * 3. isPublic이 true면 인증 검사 skip
 *
 * 💡 사용 예시:
 * @Public()
 * @Post('login')
 * async login(@Body() dto: LoginDto) { ... }
 *
 * @Public()
 * @Post('register')
 * async register(@Body() dto: RegisterDto) { ... }
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
