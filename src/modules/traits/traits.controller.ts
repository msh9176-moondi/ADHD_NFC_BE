import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import { User } from '../users/entities/user.entity';
import { TraitsService } from './traits.service';
import { UpdateTraitScoreDto } from './dto/update-trait-score.dto';

/**
 * Traits Controller
 * 글로벌 JwtAuthGuard가 적용됨 - 모든 API가 인증 필요
 */
@ApiTags('Traits')
@Controller('traits')
@ApiBearerAuth()
export class TraitsController {
  constructor(private readonly traitsService: TraitsService) {}

  @Get()
  @ApiOperation({ summary: '내 ADHD 성향 점수 조회' })
  @ApiResponse({
    status: 200,
    description: '성향 점수 조회 성공',
    schema: {
      example: {
        traitScore: {
          attention: 75,
          impulsive: 60,
          complex: 45,
          emotional: 80,
          motivation: 55,
          environment: 70,
        },
      },
    },
  })
  async getMyTraits(@CurrentUser() user: User) {
    const traitScore = await this.traitsService.findByUser(user.id);
    return { traitScore };
  }

  @Put()
  @ApiOperation({ summary: 'ADHD 성향 점수 저장/수정' })
  @ApiResponse({
    status: 200,
    description: '성향 점수 저장 성공',
  })
  async updateTraits(
    @CurrentUser() user: User,
    @Body() dto: UpdateTraitScoreDto,
  ) {
    const traitScore = await this.traitsService.upsert(user.id, dto);
    return { traitScore };
  }
}
