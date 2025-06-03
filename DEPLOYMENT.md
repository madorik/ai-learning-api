# Vercel 배포 가이드

이 문서는 AI Learning API를 Vercel에 배포하는 방법을 설명합니다.

## 🚀 배포 단계

### 1. Vercel CLI 설치 및 로그인

```bash
# Vercel CLI 설치
npm i -g vercel

# Vercel에 로그인
vercel login
```

### 2. 프로젝트 배포

```bash
# 첫 배포 (설정)
vercel

# 이후 배포
vercel --prod
```

### 3. 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수들을 설정해야 합니다:

#### 필수 환경 변수
- `NODE_ENV=production`
- `OPENAI_API_KEY` - OpenAI API 키
- `SUPABASE_URL` - Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY` - Supabase anon 키
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role 키
- `JWT_SECRET` - JWT 시크릿 키 (최소 32자)
- `SESSION_SECRET` - 세션 시크릿 키

#### 선택적 환경 변수 (OAuth 사용시)
- `GOOGLE_CLIENT_ID` - Google OAuth 클라이언트 ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth 클라이언트 시크릿
- `GOOGLE_CALLBACK_URL` - Google OAuth 콜백 URL
- `FRONTEND_URL` - 프론트엔드 URL (CORS용)

### 4. 환경 변수 설정 방법

#### 방법 1: Vercel 대시보드
1. https://vercel.com/dashboard 접속
2. 프로젝트 선택 → Settings → Environment Variables
3. 각 환경 변수 추가

#### 방법 2: Vercel CLI
```bash
# 개별 환경 변수 설정
vercel env add NODE_ENV production
vercel env add OPENAI_API_KEY your-openai-api-key
vercel env add SUPABASE_URL https://your-project.supabase.co
vercel env add SUPABASE_ANON_KEY your-supabase-anon-key

# 파일에서 환경 변수 가져오기 (.env 파일 사용)
vercel env pull .env.local
```

## 🔧 배포 설정

### vercel.json 설정
프로젝트 루트에 `vercel.json` 파일이 있어야 합니다:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "server.js": {
      "maxDuration": 30
    }
  }
}
```

### .vercelignore 설정
불필요한 파일들을 배포에서 제외합니다:

```
.idea/
.vscode/
.env*
env-template.txt
examples/
*.test.js
logs/
*.log
README.md
```

## 🌐 도메인 설정

### 커스텀 도메인 추가
1. Vercel 대시보드 → 프로젝트 → Settings → Domains
2. 도메인 입력 후 추가
3. DNS 설정 (A 레코드 또는 CNAME)

### Google OAuth 콜백 URL 업데이트
도메인 변경시 Google Cloud Console에서 OAuth 콜백 URL을 업데이트해야 합니다:
- 기존: `http://localhost:3000/auth/google/callback`
- 변경: `https://your-domain.com/auth/google/callback`

## 📊 모니터링

### 배포 상태 확인
```bash
# 배포 로그 확인
vercel logs

# 프로젝트 상태 확인
vercel inspect
```

### API 엔드포인트 테스트
배포 후 다음 엔드포인트들을 테스트해보세요:

- `GET /` - 서버 상태 확인
- `POST /api/generate-problems` - 문제 생성
- `GET /api/generate-problems-stream` - 실시간 문제 생성
- `GET /api/logs/stats` - 통계 조회

## 🔐 보안 설정

### CORS 설정
프론트엔드 도메인을 `FRONTEND_URL` 환경 변수에 설정하여 CORS를 허용하세요.

### Rate Limiting
API에는 기본적으로 rate limiting이 적용되어 있습니다:
- 일반 API: 100 requests/15분
- 문제 생성 API: 50 requests/15분

## 🚨 문제 해결

### 일반적인 문제들

#### 1. 환경 변수 오류
```
Error: OpenAI API key not configured
```
해결: `OPENAI_API_KEY` 환경 변수 설정 확인

#### 2. 데이터베이스 연결 오류
```
Error: Invalid Supabase URL or key
```
해결: `SUPABASE_URL`, `SUPABASE_ANON_KEY` 환경 변수 확인

#### 3. OAuth 오류 (선택적 기능)
```
Error: Google OAuth callback mismatch
```
해결: Google Cloud Console에서 콜백 URL 업데이트

### 로그 확인
```bash
# 실시간 로그 보기
vercel logs --follow

# 특정 함수 로그
vercel logs server.js
```

## 📞 지원

배포 관련 문제가 있으면 다음을 확인하세요:
1. Vercel 대시보드의 Function 로그
2. 환경 변수 설정 확인
3. API 키 유효성 검증
4. 네트워크 연결 상태

---

이 가이드를 따라 성공적으로 배포하시기 바랍니다! 🎉 