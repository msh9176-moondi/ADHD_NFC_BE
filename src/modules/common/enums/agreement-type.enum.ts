/**
 * 약관 동의 유형
 * 실무 포인트: 법적 요구사항에 따라 각 약관을 구분하여 저장
 */
export enum AgreementType {
  // 회원가입 약관
  TERMS_OF_SERVICE = 'terms_of_service', // 서비스 이용약관 (필수)
  PRIVACY_POLICY = 'privacy_policy', // 개인정보 처리방침 (필수)
  MARKETING = 'marketing', // 마케팅 및 광고 수신 (선택)

  // 구매/배송 약관 (모두 필수)
  PURCHASE_AGREEMENT = 'purchase_agreement', // 구매조건 확인 및 결제 진행 동의
  PURCHASE_PRIVACY = 'purchase_privacy', // 개인정보 수집 및 이용 동의
  PURCHASE_THIRD_PARTY = 'purchase_third_party', // 개인정보 제3자 제공 동의
}
