import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums';

/**
 * 유저 프로필 응답 DTO
 * 민감정보(password) 제외
 */
export class UserProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiPropertyOptional()
  nickname: string | null;

  @ApiPropertyOptional()
  profileImage: string | null;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiPropertyOptional()
  realName: string | null;

  @ApiPropertyOptional()
  phone: string | null;

  @ApiPropertyOptional()
  zipCode: string | null;

  @ApiPropertyOptional()
  address: string | null;

  @ApiPropertyOptional()
  addressDetail: string | null;

  @ApiPropertyOptional()
  deliveryRequest: string | null;

  @ApiProperty()
  coinBalance: number;

  @ApiProperty()
  createdAt: Date;
}
