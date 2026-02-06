import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import { UpdateAddressDto, UpdateProfileDto, UserProfileResponseDto } from './dto';
import { User } from './entities';
import { UsersService } from './users.service';

/**
 * Users Controller
 * 글로벌 JwtAuthGuard가 적용됨 - 모든 API가 인증 필요
 */
@ApiTags('Users')
@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 내 정보 조회
   */
  @Get('me')
  @ApiOperation({ summary: '내 정보 조회' })
  getMe(@CurrentUser() user: User): UserProfileResponseDto {
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      profileImage: user.profileImage,
      role: user.role,
      realName: user.realName,
      phone: user.phone,
      zipCode: user.zipCode,
      address: user.address,
      addressDetail: user.addressDetail,
      deliveryRequest: user.deliveryRequest,
      coinBalance: user.coinBalance,
      createdAt: user.createdAt,
    };
  }

  /**
   * 프로필 정보 수정
   */
  @Patch('me')
  @ApiOperation({ summary: '프로필 정보 수정 (닉네임, 프로필이미지, 실명, 연락처)' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileResponseDto> {
    const updated = await this.usersService.updateProfile(user.id, dto);
    return {
      id: updated.id,
      email: updated.email,
      nickname: updated.nickname,
      profileImage: updated.profileImage,
      role: updated.role,
      realName: updated.realName,
      phone: updated.phone,
      zipCode: updated.zipCode,
      address: updated.address,
      addressDetail: updated.addressDetail,
      deliveryRequest: updated.deliveryRequest,
      coinBalance: updated.coinBalance,
      createdAt: updated.createdAt,
    };
  }

  /**
   * 배송지 정보 수정
   */
  @Patch('me/address')
  @ApiOperation({ summary: '배송지 정보 수정 (우편번호, 주소, 상세주소, 배송요청사항)' })
  async updateAddress(
    @CurrentUser() user: User,
    @Body() dto: UpdateAddressDto,
  ): Promise<UserProfileResponseDto> {
    const updated = await this.usersService.updateAddress(user.id, dto);
    return {
      id: updated.id,
      email: updated.email,
      nickname: updated.nickname,
      profileImage: updated.profileImage,
      role: updated.role,
      realName: updated.realName,
      phone: updated.phone,
      zipCode: updated.zipCode,
      address: updated.address,
      addressDetail: updated.addressDetail,
      deliveryRequest: updated.deliveryRequest,
      coinBalance: updated.coinBalance,
      createdAt: updated.createdAt,
    };
  }
}
