import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * NFC 카드 로그인 요청 DTO
 */
export class NfcLoginDto {
  @ApiProperty({
    description: 'NFC 카드 UID (hex string)',
    example: '04:A3:B2:1F:5D:80:00',
  })
  @IsNotEmpty({ message: '카드 UID는 필수입니다' })
  @IsString()
  @Matches(/^[0-9A-Fa-f:]+$/, {
    message: '유효한 NFC 카드 UID 형식이 아닙니다',
  })
  cardUid: string;
}
