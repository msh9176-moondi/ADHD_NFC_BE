import {
  Controller,
  Post,
  Get,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import { User } from '../users/entities/user.entity';
import { DailyLogsService } from './daily-logs.service';
import { CreateDailyLogDto } from './dto/create-daily-log.dto';

/**
 * Daily Logs Controller
 * 글로벌 JwtAuthGuard가 적용됨 - 모든 API가 인증 필요
 */
@ApiTags('Daily Logs')
@Controller('daily-logs')
@ApiBearerAuth()
export class DailyLogsController {
  constructor(private readonly dailyLogsService: DailyLogsService) {}

  @Post()
  @ApiOperation({ summary: '일일 리포트 저장 (생성/수정)' })
  @ApiResponse({
    status: 201,
    description: '리포트가 성공적으로 저장되었습니다.',
  })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateDailyLogDto,
  ) {
    const dailyLog = await this.dailyLogsService.create(user.id, dto);
    return { dailyLog };
  }

  @Get()
  @ApiOperation({ summary: '내 일일 리포트 목록 조회' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 30 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  async findAll(
    @CurrentUser() user: User,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const logs = await this.dailyLogsService.findByUser(
      user.id,
      limit || 30,
      offset || 0,
    );
    return { logs };
  }

  @Get('today')
  @ApiOperation({ summary: '오늘의 리포트 조회' })
  async findToday(@CurrentUser() user: User) {
    const today = new Date().toISOString().split('T')[0];
    const dailyLog = await this.dailyLogsService.findByDate(user.id, today);
    return { dailyLog };
  }

  @Get('date')
  @ApiOperation({ summary: '특정 날짜의 리포트 조회' })
  @ApiQuery({ name: 'date', required: true, type: String, example: '2026-01-26' })
  async findByDate(
    @CurrentUser() user: User,
    @Query('date') date: string,
  ) {
    const dailyLog = await this.dailyLogsService.findByDate(user.id, date);
    return { dailyLog };
  }

  @Get('stats')
  @ApiOperation({ summary: '성장 통계 조회 (루틴 랭킹, 총 실행, 스트릭)' })
  @ApiResponse({
    status: 200,
    description: '성장 통계 조회 성공',
  })
  async getStats(@CurrentUser() user: User) {
    const stats = await this.dailyLogsService.getStats(user.id);
    return { stats };
  }
}
