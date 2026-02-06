import { SetMetadata } from '@nestjs/common';
import { Role } from '../../common/enums';

export const ROLES_KEY = 'roles';

/**
 * Role 기반 접근 제어 데코레이터
 *
 * 사용 예시:
 * @Roles(Role.ADMIN)
 * @Roles(Role.EXPERT, Role.SELLER)  // 여러 역할 허용
 * @UseGuards(JwtAuthGuard, RolesGuard)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
