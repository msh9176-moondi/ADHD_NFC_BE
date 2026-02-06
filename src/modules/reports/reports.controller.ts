import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ReportsService } from './reports.service';
import { MonthlyReportQueryDto, MonthlyReportResponseDto } from './dto/monthly-report.dto';

/**
 * Reports Controller
 * 글로벌 JwtAuthGuard가 적용됨 - 모든 API가 인증 필요
 */
@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * 월간 ADHD 패턴 리포트 조회
   */
  @Get('monthly')
  @ApiOperation({
    summary: '월간 ADHD 패턴 리포트 조회',
    description: '해당 월의 AI 분석 리포트를 조회합니다. 없으면 새로 생성합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '리포트 조회 성공',
    type: MonthlyReportResponseDto,
  })
  async getMonthlyReport(
    @CurrentUser() user: User,
    @Query() query: MonthlyReportQueryDto,
  ): Promise<MonthlyReportResponseDto> {
    return this.reportsService.getMonthlyReport(user.id, query.yearMonth);
  }

  /**
   * 월간 리포트 재생성
   */
  @Post('monthly/regenerate')
  @ApiOperation({
    summary: '월간 리포트 재생성',
    description: '해당 월의 리포트를 새로 생성합니다. 월 3회까지 가능합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '리포트 재생성 성공',
    type: MonthlyReportResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '재생성 횟수 초과',
  })
  async regenerateReport(
    @CurrentUser() user: User,
    @Query() query: MonthlyReportQueryDto,
  ): Promise<MonthlyReportResponseDto> {
    return this.reportsService.regenerateReport(user.id, query.yearMonth);
  }
}
