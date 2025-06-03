# 🚀 AI Learning API

초등학생을 위한 AI 기반 학습 문제 생성 플랫폼입니다. Google OAuth 인증, OpenAI ChatGPT 연동, Supabase 데이터베이스를 활용하여 개인화된 학습 환경을 제공합니다.

## ✨ 주요 기능

### 🔐 사용자 인증
- **소셜 로그인** (Google OAuth 2.0, 확장 가능)
- **JWT 토큰** 기반 인증 시스템
- 사용자별 데이터 격리 및 보안
- **멀티 소셜 제공자** 지원 구조
- **UUID 기반** 사용자 식별 (보안 강화)

### 🤖 AI 학습 도우미
- **OpenAI ChatGPT 4o-mini** 모델 연동
- 단일 질문 및 대화형 채팅 지원
- 사용량 통계 및 모니터링

### 📚 문제지 생성 시스템
- **과목별 문제지 생성** (수학, 국어, 영어 등)
- **학년별 맞춤 난이도** (1-6학년)
- **GPT 기반 자동 문제 생성**
- 문제 유형, 난이도, 문제 수 커스터마이징
- 해설 포함/제외 옵션
- **UUID 기반** 문제지 식별

### 💾 데이터베이스
- **Supabase PostgreSQL** 데이터베이스
- 사용자, 문제지, 문제, GPT 응답 로그 관리
- Row Level Security (RLS) 적용
- **확장 가능한 소셜 인증** 테이블 구조
- **UUID 기본키** 사용 (보안 및 확장성)

## 🛠️ 기술 스택

### Backend
- **Node.js** + **Express.js**
- **Passport.js** (소셜 OAuth)
- **JWT** (JSON Web Tokens)
- **Helmet.js** (보안)
- **Express Rate Limit** (API 제한)

### Database
- **Supabase** (PostgreSQL)
- **Row Level Security** (RLS)
- 자동 스키마 관리
- **소셜 제공자 확장** 지원
- **UUID 기본키** (uuid-ossp 확장)

### AI/ML
- **OpenAI API** (gpt-4o-mini)
- 자연어 처리 및 문제 생성

### Authentication
- **Google OAuth 2.0** (현재 지원)
- **확장 가능한 구조** (Facebook, Kakao, Naver 등)

## 📋 사전 요구사항

- **Node.js** 18+ 
- **npm** 또는 **yarn**
- **Google Cloud Console** 계정 (OAuth)
- **OpenAI Platform** 계정 및 API 키
- **Supabase** 계정 및 프로젝트

## 🚀 빠른 시작

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone <repository-url>
cd ai-learning-api
npm install
```

### 2. 환경변수 설정

```bash
# 템플릿 파일 복사
cp config/env-template.txt .env

# .env 파일에 실제 값 입력
nano .env
```

필수 환경변수:
```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI API
OPENAI_API_KEY=your-openai-api-key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key
```

### 3. Supabase 데이터베이스 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `database/schema.sql` 실행
3. UUID 확장 자동 활성화 확인
4. 테이블 및 정책 생성 확인
5. 자동 마이그레이션으로 기존 데이터 호환

### 4. Google OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. API 및 서비스 > 사용자 인증 정보 > OAuth 2.0 클라이언트 ID 생성
4. 승인된 리디렉션 URI 추가: `http://localhost:3000/auth/google/callback`

### 5. 서버 실행

```bash
# 개발 모드 (자동 재시작)
npm run dev

# 프로덕션 모드
npm start
```

서버가 성공적으로 시작되면:
- 🌐 **API 서버**: http://localhost:3000
- 📖 **API 문서**: http://localhost:3000
- 🔐 **Google 로그인**: http://localhost:3000/auth/google

## 📚 API 엔드포인트

### 🔐 인증 API

| 메서드 | 엔드포인트 | 설명 | 인증 필요 |
|--------|------------|------|-----------|
| `GET` | `/auth/google` | Google OAuth 로그인 시작 | ❌ |
| `GET` | `/auth/google/callback` | Google OAuth 콜백 | ❌ |
| `GET` | `/auth/profile` | 사용자 프로필 조회 | ✅ |
| `POST` | `/auth/verify-token` | JWT 토큰 검증 | ✅ |
| `POST` | `/auth/logout` | 로그아웃 | ✅ |
| `GET` | `/auth/status` | 로그인 상태 확인 | ❌ |
| `GET` | `/auth/stats` | 사용자 통계 조회 | ✅ |

### 🤖 AI API

| 메서드 | 엔드포인트 | 설명 | 인증 필요 |
|--------|------------|------|-----------|
| `POST` | `/api/ask` | 단일 질문 | ✅ |
| `POST` | `/api/chat` | 대화형 채팅 | ✅ |
| `POST` | `/api/generate-problems` | **교육용 문제 생성** | ❌ |
| `GET` | `/api/generate-problems-stream` | **🔥 실시간 문제 생성 (SSE)** | ❌ |
| `GET` | `/api/health` | 서비스 상태 확인 | ❌ |
| `GET` | `/api/usage-stats` | 사용량 통계 | ✅ |
| `GET` | `/api/models` | 사용 가능한 모델 | ❌ |

### 📝 문제지 API (UUID 사용)

| 메서드 | 엔드포인트 | 설명 | 인증 필요 |
|--------|------------|------|-----------|
| `POST` | `/api/questions/create-set` | 문제지 생성 | ✅ |
| `POST` | `/api/questions/generate/:uuid` | 문제 생성 (GPT) | ✅ |
| `GET` | `/api/questions/sets` | 문제지 목록 | ✅ |
| `GET` | `/api/questions/sets/:uuid` | 문제지 상세 | ✅ |
| `GET` | `/api/questions/sets/:uuid/status` | 문제지 상태 | ✅ |
| `DELETE` | `/api/questions/sets/:uuid` | 문제지 삭제 | ✅ |
| `GET` | `/api/questions/subjects` | 지원 과목 목록 | ❌ |
| `GET` | `/api/questions/difficulties` | 난이도 목록 | ❌ |

**UUID 형식**: `a0b1c2d3-e4f5-6789-abcd-ef0123456789`

## 🎯 사용 예제

### 1. Google OAuth 로그인

```javascript
// 브라우저에서
window.location.href = 'http://localhost:3000/auth/google';

// 성공 시 리다이렉트: http://localhost:9090/auth/success?token=JWT_TOKEN
```

### 2. **교육용 문제 생성 (GPT-4o mini)**

```javascript
// 문제 생성 요청
const problemData = {
  subject: "영어",
  grade: 3,
  questionType: "교과 과정",
  questionCount: 5,
  difficulty: "어려움"
};

const response = await fetch('http://localhost:3000/api/generate-problems', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(problemData)
});

const result = await response.json();
console.log('생성된 문제:', result);

// 응답 예시
{
  "success": true,
  "message": "문제가 성공적으로 생성되었습니다.",
  "subject": "영어",
  "grade": 3,
  "question_type": "교과 과정",
  "difficulty": "어려움",
  "question_count": 5,
  "problems": [
    {
      "question": "다음 중 '사과'를 영어로 올바르게 쓴 것은?",
      "choices": ["aple", "apple", "aplle", "appel"],
      "answer": "apple",
      "explanation": "사과는 영어로 'apple'입니다. 'app' + 'le'로 구성되며, 'p'가 두 개 있는 것이 특징입니다."
    }
  ],
  "metadata": {
    "model": "gpt-4o-mini",
    "usage": {
      "promptTokens": 250,
      "completionTokens": 800,
      "totalTokens": 1050
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. 사용자 통계 조회

```javascript
const token = 'your-jwt-token';

const response = await fetch('http://localhost:3000/auth/stats', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const stats = await response.json();
console.log('사용자 통계:', stats);
// 결과: { totalUsers: 10, providerStats: { google: 10 }, supportedProviders: ['google'] }
```

### 4. 문제지 생성 (UUID 반환)

```javascript
const token = 'your-jwt-token';

const questionSetData = {
  title: '3학년 수학 문제지',
  subject: '수학',
  grade: 3,
  questionType: '교과과정',
  questionCount: 10,
  difficulty: '보통',
  estimatedTime: 15,
  hasExplanation: true
};

const response = await fetch('http://localhost:3000/api/questions/create-set', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(questionSetData)
});

const result = await response.json();
console.log('문제지 생성:', result);
// result.data.id = "a0b1c2d3-e4f5-6789-abcd-ef0123456789" (UUID)
```

### 5. GPT 문제 생성 (UUID 사용)

```javascript
const questionSetId = 'a0b1c2d3-e4f5-6789-abcd-ef0123456789'; // UUID

const response = await fetch(`http://localhost:3000/api/questions/generate/${questionSetId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const result = await response.json();
console.log('문제 생성 시작:', result);

// 상태 확인
const statusResponse = await fetch(`http://localhost:3000/api/questions/sets/${questionSetId}/status`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const status = await statusResponse.json();
console.log('생성 상태:', status);
```

### 6. AI 채팅

```javascript
const chatData = {
  message: '분수의 덧셈을 쉽게 설명해주세요',
  conversation: [] // 이전 대화 내역
};

const response = await fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(chatData)
});

const result = await response.json();
console.log('AI 응답:', result);
```

## 🗄️ 데이터베이스 스키마

### 테이블 구조 (UUID 기반)

1. **users** - 사용자 정보
   - `id` - UUID 기본키 (자동 생성)
   - `social_id` - 소셜 로그인 ID (Google ID 등)
   - `social_provider` - 소셜 제공자 ('google', 'facebook' 등)
   - `email` - 이메일 주소
   - `name` - 사용자 이름
   - `profile_image` - 프로필 이미지

2. **question_sets** - 문제지 정보
   - `id` - UUID 기본키
   - `user_id` - UUID 외래키 (users 참조)
   - 제목, 과목, 학년, 난이도, 문제 수, 상태

3. **questions** - 생성된 문제들
   - `id` - UUID 기본키
   - `question_set_id` - UUID 외래키 (question_sets 참조)
   - 문제 내용, 정답, 해설, 난이도 점수

4. **gpt_responses** - GPT 응답 로그
   - `id` - UUID 기본키
   - `question_set_id` - UUID 외래키
   - `user_id` - UUID 외래키
   - 프롬프트, 응답 내용, 토큰 사용량, 응답 시간

5. **user_responses** - 사용자 답안 (향후 확장)
   - `id` - UUID 기본키
   - `user_id` - UUID 외래키
   - `question_id` - UUID 외래키
   - `question_set_id` - UUID 외래키
   - 사용자 답안, 정답 여부, 소요 시간

### UUID 사용의 장점

1. **보안성**: ID 값 추측 불가능
2. **확장성**: 분산 환경에서 고유성 보장
3. **호환성**: 다양한 시스템 간 데이터 이전 용이
4. **표준화**: RFC 4122 표준 준수

### 소셜 인증 확장성

```sql
-- 새로운 소셜 제공자 추가 예시
INSERT INTO users (social_id, social_provider, email, name) 
VALUES ('facebook-user-id', 'facebook', 'user@example.com', 'User Name');

-- 소셜 제공자별 통계
SELECT social_provider, COUNT(*) as user_count 
FROM users 
GROUP BY social_provider;
```

### UUID 샘플 데이터 생성

```sql
-- 개발/테스트용 사용자 생성 함수
SELECT create_sample_user('google-123456', 'test@example.com', 'Test User', 'google');

-- UUID 형식 확인
SELECT id, social_id, email FROM users WHERE social_provider = 'google';
```

### Row Level Security (RLS)

모든 테이블에 RLS가 적용되어 사용자는 자신의 데이터만 접근할 수 있습니다.

### 데이터 마이그레이션

기존 `BIGINT` ID를 사용하던 데이터는 새로운 설치 시 자동으로 UUID 스키마로 적용됩니다.

## 🔒 보안 기능

### 인증 및 인가
- **JWT 토큰** 기반 stateless 인증
- **멀티 소셜 OAuth** 안전한 소셜 로그인
- **토큰 만료** 자동 처리
- **UUID 기반** 사용자 식별 (ID 추측 방지)

### API 보안
- **Rate Limiting** - 15분당 100회 요청 제한
- **Helmet.js** - 보안 헤더 자동 설정
- **CORS** 정책 적용
- **Input Validation** - 모든 입력 데이터 검증
- **UUID 형식 검증** - 잘못된 ID 형식 차단

### 데이터베이스 보안
- **Row Level Security** - 사용자별 데이터 격리
- **SQL Injection** 방지
- **Prepared Statements** 사용
- **UUID 기본키** - 순차적 ID 공격 방지

## 🧪 테스트

### API 테스트 실행

```bash
# 기본 테스트
npm test

# 자동 감시 모드
npm run test:watch

# 수동 테스트
node examples/api-test.js
```

### UUID 형식 테스트

```javascript
// 올바른 UUID 형식
const validUUID = 'a0b1c2d3-e4f5-6789-abcd-ef0123456789';

// 잘못된 형식 (에러 발생)
const invalidUUID = '123456';
```

### 브라우저 테스트

브라우저에서 `examples/client-example.html` 파일을 열어 UI를 통한 테스트가 가능합니다.

## 🌐 소셜 로그인 확장

### 지원 예정 플랫폼

- ✅ **Google** OAuth 2.0
- 🔄 **Facebook** OAuth 2.0 (준비 중)
- 🔄 **Kakao** OAuth 2.0 (준비 중)
- 🔄 **Naver** OAuth 2.0 (준비 중)

### 새 소셜 제공자 추가 방법

1. **Passport Strategy 추가**
```javascript
// config/passport-config.js
const FacebookStrategy = require('passport-facebook').Strategy;

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: '/auth/facebook/callback'
}, async (accessToken, refreshToken, profile, done) => {
  // 사용자 처리 로직 (Google과 동일)
}));
```

2. **라우트 추가**
```javascript
// routes/auth-routes.js
router.get('/facebook', passport.authenticate('facebook'));
router.get('/facebook/callback', passport.authenticate('facebook'), handleCallback);
```

3. **환경변수 추가**
```env
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
```

## 📦 배포

### 환경변수 (프로덕션)

```env
NODE_ENV=production
PORT=3000

# 프로덕션 URL로 변경
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
FRONTEND_URL=https://yourdomain.com

# 강력한 시크릿 키로 변경
JWT_SECRET=super-strong-production-secret
SESSION_SECRET=super-strong-session-secret
```

### Docker 배포 (선택사항)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 기여하기

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 🆘 문제 해결

### 자주 발생하는 문제

**1. Supabase 연결 실패**
```bash
# 환경변수 확인
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# 네트워크 연결 확인
curl $SUPABASE_URL/rest/v1/
```

**2. Google OAuth 오류**
```bash
# 콜백 URL 확인
# Google Console에서 승인된 리디렉션 URI 설정 확인
```

**3. UUID 확장 오류**
```sql
-- Supabase에서 UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- UUID 생성 테스트
SELECT uuid_generate_v4();
```

**4. 데이터베이스 마이그레이션**
```sql
-- 기존 BIGINT ID 데이터 확인
SELECT id, email FROM users LIMIT 5;

-- UUID 마이그레이션 후 확인
SELECT id, social_id, social_provider FROM users LIMIT 5;
```

**5. OpenAI API 오류**
```bash
# API 키 및 사용량 확인
# OpenAI Platform에서 결제 정보 확인
```

**6. JWT 토큰 오류**
```bash
# 토큰 만료 시간 확인
# 클라이언트에서 토큰 갱신 로직 구현
```

### 로그 확인

```bash
# 서버 로그 (개발 모드)
npm run dev

# 상세 로그
DEBUG=* npm run dev
```

## 📞 지원

문제가 발생하거나 기능 요청이 있으시면 GitHub Issues를 통해 문의해 주세요.

---

**Created with ❤️ by AI Learning Team** 