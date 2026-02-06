import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CoinModule } from '../coin/coin.module';
import { User } from '../users/entities';
import { UsersModule } from '../users/users.module';
import { NfcCard } from './entities';
import { NfcController } from './nfc.controller';
import { NfcService } from './nfc.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NfcCard, User]),
    UsersModule,
    AuthModule,
    CoinModule,
  ],
  controllers: [NfcController],
  providers: [NfcService],
  exports: [NfcService],
})
export class NfcModule {}
