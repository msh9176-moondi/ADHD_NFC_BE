import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TraitScore } from './entities/trait-score.entity';
import { TraitsService } from './traits.service';
import { TraitsController } from './traits.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TraitScore])],
  controllers: [TraitsController],
  providers: [TraitsService],
  exports: [TraitsService],
})
export class TraitsModule {}
