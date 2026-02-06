import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * 배송지 정보 수정 DTO
 */
export class UpdateAddressDto {
  @ApiPropertyOptional({ example: '12345', description: '우편번호' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  zipCode?: string;

  @ApiPropertyOptional({ example: '서울시 강남구 테헤란로 123', description: '기본주소' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ example: '456동 789호', description: '상세주소' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressDetail?: string;

  @ApiPropertyOptional({ example: '문 앞에 놔주세요', description: '배송요청사항' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  deliveryRequest?: string;
}
