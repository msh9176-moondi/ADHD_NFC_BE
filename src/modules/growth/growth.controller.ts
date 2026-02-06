import {
  Controller,
  Get,
  Post,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import { User } from '../users/entities/user.entity';
import { GrowthService } from './growth.service';
import { GrowthTreeResponseDto, WateringCanPurchaseResponseDto } from './dto';

/**
 * Growth Controller
 * 글로벌 JwtAuthGuard가 적용됨 - 모든 API가 인증 필요
 */
@ApiTags('Growth')
@Controller('growth')
@ApiBearerAuth()
export class GrowthController {
  constructor(private readonly growthService: GrowthService) {}

  @Get('tree')
  @ApiOperation({ summary: '나만의 성장 나무 정보 조회' })
  @ApiResponse({
    status: 200,
    description: '성장 나무 정보 조회 성공',
    type: GrowthTreeResponseDto,
  })
  async getGrowthTree(@CurrentUser() user: User) {
    const tree = await this.growthService.getGrowthTree(user.id);
    return { tree };
  }

  @Post('watering-can')
  @ApiBearerAuth()
  @ApiOperation({ summary: '물뿌리개 구매 - 즉시 XP 보너스 획득' })
  @ApiResponse({
    status: 200,
    description: '물뿌리개 구매 성공',
    type: WateringCanPurchaseResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '코인 부족',
  })
  async purchaseWateringCan(@CurrentUser() user: User) {
    const result = await this.growthService.purchaseWateringCan(user.id);
    if (!result.success) {
      throw new BadRequestException(result.message);
    }
    return result;
  }
}
