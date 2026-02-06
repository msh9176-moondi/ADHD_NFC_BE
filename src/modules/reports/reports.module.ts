import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AiMonthlyReport } from './entities/ai-monthly-report.entity';
import { DailyLog } from '../daily-logs/entities/daily-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AiMonthlyReport, DailyLog])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
