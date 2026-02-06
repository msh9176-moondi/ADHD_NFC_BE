import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TraitScore } from './entities/trait-score.entity';
import { UpdateTraitScoreDto } from './dto/update-trait-score.dto';

@Injectable()
export class TraitsService {
  constructor(
    @InjectRepository(TraitScore)
    private readonly traitScoreRepository: Repository<TraitScore>,
  ) {}

  async findByUser(userId: string): Promise<TraitScore | null> {
    return this.traitScoreRepository.findOne({ where: { userId } });
  }

  async upsert(userId: string, dto: UpdateTraitScoreDto): Promise<TraitScore> {
    let traitScore = await this.traitScoreRepository.findOne({
      where: { userId },
    });

    if (traitScore) {
      // 기존 데이터 업데이트
      Object.assign(traitScore, dto);
    } else {
      // 새로 생성
      traitScore = this.traitScoreRepository.create({
        userId,
        ...dto,
      });
    }

    return this.traitScoreRepository.save(traitScore);
  }
}
