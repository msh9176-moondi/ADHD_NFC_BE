import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { CoinController } from './coin.controller';
import { CoinService } from './coin.service';
import { CoinHistory } from './entities/coin-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CoinHistory, User])],
  controllers: [CoinController],
  providers: [CoinService],
  exports: [CoinService], // 다른 모듈에서 사용 가능하도록 export
})
export class CoinModule {}
