import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import { User } from '../users/entities/user.entity';
import { CoinService } from './coin.service';

/**
 * Coin Controller
 * 글로벌 JwtAuthGuard가 적용됨 - 모든 API가 인증 필요
 */
@ApiTags('Coin')
@Controller('coin')
@ApiBearerAuth()
export class CoinController {
  constructor(private readonly coinService: CoinService) {}

  @Get('balance')
  @ApiOperation({ summary: '내 코인 잔액 조회' })
  async getBalance(@CurrentUser() user: User) {
    const balance = await this.coinService.getBalance(user.id);
    return { balance };
  }

  @Get('history')
  @ApiOperation({ summary: '내 코인 이력 조회' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getHistory(
    @CurrentUser() user: User,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const history = await this.coinService.getHistory(
      user.id,
      limit || 20,
      offset || 0,
    );
    return { history };
  }
}
