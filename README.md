# ADHD NFC Backend

ADHD 관리 앱 FLOCA의 백엔드 서버입니다.

## 기술 스택

- **Framework**: NestJS 11
- **Language**: TypeScript 5
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Authentication**: JWT + Passport
- **API Documentation**: Swagger

---

## 사전 준비 (Prerequisites)

### 1. Node.js 설치

- **필수 버전**: Node.js 18 이상
- 다운로드: https://nodejs.org/

```bash
# 버전 확인
node -v  # v18.x.x 이상
npm -v   # 9.x.x 이상
```

### 2. PostgreSQL 설치

#### macOS (Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### Windows
- 다운로드: https://www.postgresql.org/download/windows/
- 설치 시 비밀번호 설정 기억해두기

#### Ubuntu
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 3. DBeaver 설치 (선택사항 - DB GUI 클라이언트)

- 다운로드: https://dbeaver.io/download/
- PostgreSQL 연결 시 사용

---

## 설치 가이드

### 1. 프로젝트 클론

```bash
git clone <repository-url>
cd adhd_nfc_be
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

프로젝트 루트에 `.env` 파일 생성:

```bash
# .env 파일 생성
touch .env
```

`.env` 파일 내용:

```env
# ===========================================
# 개발 환경 설정
# ===========================================

# 서버 설정
PORT=4000
NODE_ENV=development

# 데이터베이스 설정 (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password_here
DB_DATABASE=adhd_nfc_db

# JWT 설정
JWT_SECRET=dev-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5173/auth/google/callback

# Kakao OAuth
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_CLIENT_SECRET=your_kakao_client_secret
KAKAO_CALLBACK_URL=http://localhost:5173/auth/kakao/callback

# Naver OAuth
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
NAVER_CALLBACK_URL=http://localhost:5173/auth/naver/callback

# Mail 설정 (Gmail)
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=your_email@gmail.com
FRONTEND_URL=http://localhost:5173
```

> **Note**: 실제 OAuth 키와 비밀번호는 팀장에게 문의하세요.

### 4. 데이터베이스 생성

#### PostgreSQL CLI 사용:

```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE adhd_nfc_db;

# 확인
\l

# 나가기
\q
```

#### DBeaver 사용:

1. DBeaver 실행
2. 새 연결 추가 (PostgreSQL)
3. 연결 정보 입력:
   - Host: `localhost`
   - Port: `5432`
   - Database: `postgres` (처음 연결 시)
   - Username: `postgres`
   - Password: 설치 시 설정한 비밀번호
4. 연결 후 우클릭 → "Create New Database" → `adhd_nfc_db` 생성

---

## 서버 실행

### 개발 모드 (watch mode)

```bash
npm run start:dev
```

### 프로덕션 빌드

```bash
npm run build
npm run start:prod
```

### 서버 확인

- 서버 URL: http://localhost:4000
- Swagger API 문서: http://localhost:4000/api

---

## API 문서 (Swagger)

서버 실행 후 http://localhost:4000/api 에서 확인 가능

### 주요 API 엔드포인트

| 모듈 | 엔드포인트 | 설명 |
|------|-----------|------|
| Auth | `POST /auth/login` | 이메일 로그인 |
| Auth | `POST /auth/register` | 회원가입 |
| Auth | `GET /auth/google` | Google 소셜 로그인 |
| Auth | `GET /auth/kakao` | Kakao 소셜 로그인 |
| Auth | `GET /auth/naver` | Naver 소셜 로그인 |
| Daily Logs | `POST /daily-logs` | 일일 리포트 저장 |
| Daily Logs | `GET /daily-logs` | 리포트 목록 조회 |
| Daily Logs | `GET /daily-logs/stats` | 성장 통계 조회 |
| Growth | `GET /growth/tree` | 성장 나무 정보 조회 |
| NFC | `POST /nfc/checkin` | NFC 체크인 (코인 적립) |
| Traits | `GET /traits` | ADHD 성향 점수 조회 |
| Traits | `PUT /traits` | ADHD 성향 점수 저장 |

---

## 프로젝트 구조

```
src/
├── main.ts                    # 앱 진입점
├── app.module.ts              # 루트 모듈
├── modules/
│   ├── auth/                  # 인증 (JWT, OAuth)
│   ├── users/                 # 유저 관리
│   ├── daily-logs/            # 일일 리포트
│   ├── growth/                # 성장 나무
│   ├── nfc/                   # NFC 체크인
│   ├── coin/                  # 코인 시스템
│   ├── traits/                # ADHD 성향 테스트
│   └── common/                # 공통 유틸리티
└── config/                    # 설정 파일
```

---

## 자주 발생하는 문제

### 1. PostgreSQL 연결 실패

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**해결**: PostgreSQL 서비스가 실행 중인지 확인

```bash
# macOS
brew services list
brew services start postgresql@15

# Ubuntu
sudo systemctl status postgresql
sudo systemctl start postgresql

# Windows
# 서비스에서 PostgreSQL 실행 상태 확인
```

### 2. 데이터베이스가 없음

```
error: database "adhd_nfc_db" does not exist
```

**해결**: 데이터베이스 생성

```bash
psql -U postgres -c "CREATE DATABASE adhd_nfc_db;"
```

### 3. 포트 충돌

```
Error: listen EADDRINUSE: address already in use :::4000
```

**해결**: 해당 포트를 사용하는 프로세스 종료

```bash
# 포트 사용 프로세스 찾기
lsof -i :4000

# 프로세스 종료
kill -9 <PID>
```

---

## 유용한 명령어

```bash
# 개발 서버 실행
npm run start:dev

# 빌드
npm run build

# 린트
npm run lint

# 포맷팅
npm run format

# 테스트
npm run test
```

---

## 팀원 연락처

문의사항이 있으면 팀장에게 연락하세요.
