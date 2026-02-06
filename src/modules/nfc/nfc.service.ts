import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { AuthResponseDto, UserResponseDto } from '../auth/dto';
import { CoinService, COIN_CONFIG } from '../coin/coin.service';
import { User } from '../users/entities';
import { UsersService } from '../users/users.service';
import {
  NfcCardResponseDto,
  NfcCardsListResponseDto,
  NfcCheckinResponseDto,
  NfcCheckinStatusResponseDto,
  RegisterNfcCardDto,
  UpdateNfcCardDto,
} from './dto';
import { NfcCard } from './entities';

/**
 * NFC Service
 *
 * - cardUid는 정규화하여 저장 (콜론 제거, 대문자)
 * - 보안을 위해 응답에서 UID 일부 마스킹
 * - 카드 분실 시 비활성화로 즉시 로그인 차단 가능
 * - NFC 로그인 시 하루 1회 코인 보상 지급
 */
@Injectable()
export class NfcService {
  constructor(
    @InjectRepository(NfcCard)
    private readonly nfcCardRepository: Repository<NfcCard>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly coinService: CoinService,
  ) {}

  /**
   * NFC 카드 등록
   * 로그인한 유저만 자신의 카드를 등록할 수 있음
   */
  async registerCard(
    userId: string,
    dto: RegisterNfcCardDto,
  ): Promise<NfcCardResponseDto> {
    // 1. 카드 UID 정규화
    const normalizedUid = this.normalizeCardUid(dto.cardUid);

    // 2. 이미 등록된 카드인지 확인
    const existingCard = await this.nfcCardRepository.findOne({
      where: { cardUid: normalizedUid },
    });

    if (existingCard) {
      if (existingCard.userId === userId) {
        throw new ConflictException('이미 등록된 카드입니다');
      }
      throw new ConflictException('다른 사용자가 등록한 카드입니다');
    }

    // 3. 카드 등록
    const nfcCard = this.nfcCardRepository.create({
      cardUid: normalizedUid,
      cardName: dto.cardName || null,
      userId,
    });

    const saved = await this.nfcCardRepository.save(nfcCard);

    return this.toCardResponse(saved);
  }

  /**
   * NFC 카드로 로그인
   * - 하루 1회 코인 보상 지급
   */
  async loginWithCard(cardUid: string): Promise<AuthResponseDto> {
    // 1. 카드 UID 정규화
    const normalizedUid = this.normalizeCardUid(cardUid);

    // 2. 카드 조회
    const nfcCard = await this.nfcCardRepository.findOne({
      where: { cardUid: normalizedUid },
      relations: ['user'],
    });

    if (!nfcCard) {
      throw new UnauthorizedException('등록되지 않은 카드입니다');
    }

    // 3. 카드 활성화 상태 확인
    if (!nfcCard.isActive) {
      throw new UnauthorizedException('비활성화된 카드입니다');
    }

    // 4. 유저 활성화 상태 확인
    if (!nfcCard.user.isActive) {
      throw new UnauthorizedException('비활성화된 계정입니다');
    }

    // 5. 마지막 사용 시간 업데이트
    await this.nfcCardRepository.update(nfcCard.id, {
      lastUsedAt: new Date(),
    });

    // 6. 유저 마지막 로그인 시간 업데이트
    await this.usersService.updateLastLogin(nfcCard.user.id);

    // 7. 코인 보상 지급 (하루 1회)
    await this.coinService.earnByNfcLogin(nfcCard.user.id, nfcCard.id);

    // 8. JWT 토큰 발급
    return this.generateAuthResponse(nfcCard.user);
  }

  /**
   * 내 카드 목록 조회
   */
  async getMyCards(userId: string): Promise<NfcCardsListResponseDto> {
    const cards = await this.nfcCardRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return {
      cards: cards.map((card) => this.toCardResponse(card)),
      total: cards.length,
    };
  }

  /**
   * 카드 정보 수정 (이름, 활성화 상태)
   */
  async updateCard(
    userId: string,
    cardId: string,
    dto: UpdateNfcCardDto,
  ): Promise<NfcCardResponseDto> {
    // 1. 카드 조회 및 소유권 확인
    const card = await this.findCardWithOwnership(userId, cardId);

    // 2. 업데이트
    if (dto.cardName !== undefined) {
      card.cardName = dto.cardName;
    }
    if (dto.isActive !== undefined) {
      card.isActive = dto.isActive;
    }

    const updated = await this.nfcCardRepository.save(card);

    return this.toCardResponse(updated);
  }

  /**
   * 카드 삭제 (등록 해제)
   */
  async deleteCard(userId: string, cardId: string): Promise<void> {
    // 1. 카드 조회 및 소유권 확인
    const card = await this.findCardWithOwnership(userId, cardId);

    // 2. 삭제
    await this.nfcCardRepository.remove(card);
  }

  /**
   * NFC 체크인 (이미 로그인된 사용자가 매일 태그 찍어서 보상 받기)
   * - 하루 1회만 보상 지급
   * - cardUid 없이도 체크인 가능 (로그인된 사용자 기준)
   */
  async checkin(userId: string, cardUid?: string): Promise<NfcCheckinResponseDto> {
    // 1. 유저의 조회수 증가 (매 태깅마다)
    await this.userRepository.update(userId, {
      totalTagCount: () => 'total_tag_count + 1',
    });

    // 업데이트된 유저 조회
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    const totalTagCount = user?.totalTagCount ?? 1;

    // 2. cardUid가 있으면 카드도 업데이트
    if (cardUid) {
      const normalizedUid = this.normalizeCardUid(cardUid);
      const nfcCard = await this.nfcCardRepository.findOne({
        where: { cardUid: normalizedUid },
      });

      if (nfcCard && nfcCard.userId === userId && nfcCard.isActive) {
        await this.nfcCardRepository.update(nfcCard.id, {
          lastUsedAt: new Date(),
          totalTagCount: () => 'total_tag_count + 1',
        });
      }
    }

    // 3. 코인 보상 지급 시도 (내부에서 중복 체크 + 락 처리)
    const rewardResult = await this.coinService.earnByNfcLogin(userId);

    // 이미 오늘 보상을 받았거나 동시 요청으로 실패한 경우
    if (!rewardResult) {
      return {
        success: true,
        alreadyCheckedIn: true,
        coinsEarned: 0,
        xpEarned: 0,
        totalTagCount,
        message: '오늘은 이미 체크인했습니다. 내일 다시 시도해주세요!',
      };
    }

    return {
      success: true,
      alreadyCheckedIn: false,
      coinsEarned: COIN_CONFIG.NFC_LOGIN_REWARD,
      xpEarned: COIN_CONFIG.NFC_LOGIN_REWARD,
      totalTagCount,
      message: '체크인 성공! 코인과 XP를 획득했습니다!',
    };
  }

  /**
   * 오늘 체크인 여부 확인
   */
  async getCheckinStatus(userId: string): Promise<NfcCheckinStatusResponseDto> {
    const checkedInToday = await this.coinService.hasReceivedNfcRewardToday(userId);

    // 유저 조회 (조회수 포함)
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    // 마지막 체크인 시간 조회 (가장 최근 사용한 카드 기준)
    const lastUsedCard = await this.nfcCardRepository.findOne({
      where: { userId },
      order: { lastUsedAt: 'DESC' },
    });

    return {
      checkedInToday,
      lastCheckinAt: lastUsedCard?.lastUsedAt || null,
      totalTagCount: user?.totalTagCount ?? 0,
    };
  }

  /**
   * 카드 조회 및 소유권 확인
   */
  private async findCardWithOwnership(
    userId: string,
    cardId: string,
  ): Promise<NfcCard> {
    const card = await this.nfcCardRepository.findOne({
      where: { id: cardId },
    });

    if (!card) {
      throw new NotFoundException('카드를 찾을 수 없습니다');
    }

    if (card.userId !== userId) {
      throw new BadRequestException('본인의 카드만 관리할 수 있습니다');
    }

    return card;
  }

  /**
   * 카드 UID 정규화
   * - 콜론 제거
   * - 대문자 변환
   */
  private normalizeCardUid(cardUid: string): string {
    return cardUid.replace(/:/g, '').toUpperCase();
  }

  /**
   * 카드 UID 마스킹 (보안)
   * 예: 04A3B21F5D8000 → 04A3****8000
   */
  private maskCardUid(cardUid: string): string {
    if (cardUid.length <= 8) {
      return cardUid.substring(0, 4) + '****';
    }
    return (
      cardUid.substring(0, 4) + '****' + cardUid.substring(cardUid.length - 4)
    );
  }

  /**
   * 카드 엔티티 → 응답 DTO 변환
   */
  private toCardResponse(card: NfcCard): NfcCardResponseDto {
    return {
      id: card.id,
      cardUid: this.maskCardUid(card.cardUid),
      cardName: card.cardName,
      isActive: card.isActive,
      lastUsedAt: card.lastUsedAt,
      registeredAt: card.createdAt,
    };
  }

  /**
   * 인증 응답 생성 (리프레시 토큰 포함)
   */
  private async generateAuthResponse(user: User): Promise<AuthResponseDto> {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

    // 리프레시 토큰 생성
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const hashedRefreshToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // 만료일 계산 (7일)
    const refreshTokenExpires = new Date();
    refreshTokenExpires.setDate(refreshTokenExpires.getDate() + 7);

    // DB에 해싱된 리프레시 토큰 저장
    await this.usersService.setRefreshToken(user.id, hashedRefreshToken, refreshTokenExpires);

    const userResponse: UserResponseDto = {
      id: user.id,
      userNumber: user.userNumber,
      email: user.email,
      nickname: user.nickname,
      profileImage: user.profileImage,
      role: user.role,
    };

    return {
      accessToken,
      refreshToken,
      user: userResponse,
    };
  }
}
