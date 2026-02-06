import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthResponseDto } from '../auth/dto';
import { CurrentUser, Public } from '../auth/decorators';
import { User } from '../users/entities';
import {
  NfcCardResponseDto,
  NfcCardsListResponseDto,
  NfcCheckinDto,
  NfcCheckinResponseDto,
  NfcCheckinStatusResponseDto,
  NfcLoginDto,
  RegisterNfcCardDto,
  UpdateNfcCardDto,
} from './dto';
import { NfcService } from './nfc.service';

/**
 * NFC Controller
 *
 * - 글로벌 JwtAuthGuard가 적용됨
 * - 카드 로그인만 @Public() - 인증 불필요 (카드만 있으면 로그인 가능)
 * - 나머지 API는 인증 필요
 */
@ApiTags('NFC')
@Controller('nfc')
export class NfcController {
  constructor(private readonly nfcService: NfcService) {}

  /**
   * NFC 카드로 로그인
   * @Public() - 인증 불필요, 카드 UID만으로 로그인
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'NFC 카드로 로그인' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async loginWithNfc(@Body() dto: NfcLoginDto): Promise<AuthResponseDto> {
    return this.nfcService.loginWithCard(dto.cardUid);
  }

  /**
   * NFC 카드 등록
   * 로그인한 유저만 자신의 카드를 등록 가능
   */
  @Post('register')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'NFC 카드 등록' })
  @ApiResponse({ status: 201, type: NfcCardResponseDto })
  async registerCard(
    @CurrentUser() user: User,
    @Body() dto: RegisterNfcCardDto,
  ): Promise<NfcCardResponseDto> {
    return this.nfcService.registerCard(user.id, dto);
  }

  /**
   * 내 카드 목록 조회
   */
  @Get('cards')
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 NFC 카드 목록 조회' })
  @ApiResponse({ status: 200, type: NfcCardsListResponseDto })
  async getMyCards(
    @CurrentUser() user: User,
  ): Promise<NfcCardsListResponseDto> {
    return this.nfcService.getMyCards(user.id);
  }

  /**
   * 카드 정보 수정 (이름, 활성화 상태)
   */
  @Patch('cards/:cardId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'NFC 카드 정보 수정' })
  @ApiResponse({ status: 200, type: NfcCardResponseDto })
  async updateCard(
    @CurrentUser() user: User,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body() dto: UpdateNfcCardDto,
  ): Promise<NfcCardResponseDto> {
    return this.nfcService.updateCard(user.id, cardId, dto);
  }

  /**
   * 카드 삭제 (등록 해제)
   */
  @Delete('cards/:cardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'NFC 카드 삭제' })
  @ApiResponse({ status: 204, description: '삭제 완료' })
  async deleteCard(
    @CurrentUser() user: User,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ): Promise<void> {
    return this.nfcService.deleteCard(user.id, cardId);
  }

  /**
   * NFC 체크인 (하루 1회 보상 받기)
   * 로그인한 유저가 자신의 NFC 카드를 찍어서 보상을 받음
   */
  @Post('checkin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'NFC 체크인 (하루 1회 보상)' })
  @ApiResponse({ status: 200, type: NfcCheckinResponseDto })
  async checkin(
    @CurrentUser() user: User,
    @Body() dto: NfcCheckinDto,
  ): Promise<NfcCheckinResponseDto> {
    return this.nfcService.checkin(user.id, dto.cardUid);
  }

  /**
   * 오늘 체크인 여부 확인
   */
  @Get('checkin/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: '오늘 NFC 체크인 여부 확인' })
  @ApiResponse({ status: 200, type: NfcCheckinStatusResponseDto })
  async getCheckinStatus(
    @CurrentUser() user: User,
  ): Promise<NfcCheckinStatusResponseDto> {
    return this.nfcService.getCheckinStatus(user.id);
  }
}
