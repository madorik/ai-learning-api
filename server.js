require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// 설정 파일들 import
require('./config/passport-config');
const { testConnection } = require('./config/supabase-config');

// 라우터 import
const authRoutes = require('./routes/auth-routes');
const aiRoutes = require('./routes/ai-routes');
const questionRoutes = require('./routes/question-routes');

const app = express();
const PORT = process.env.PORT || 3000;

// 보안 미들웨어 설정
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS 설정 - 클라이언트 요청을 허용
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com', 'http://localhost:9090']
    : ['http://localhost:3000', 'http://localhost:9090'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting - API 호출 제한
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 15분당 최대 100회 요청
  message: {
    error: '너무 많은 요청이 발생했습니다.',
    message: '15분 후에 다시 시도해주세요.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 세션 설정 - Passport 인증을 위해 필요
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24시간
  }
}));

// Body parsing 미들웨어
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());

// 라우터 연결
app.use('/auth', authRoutes);
app.use('/api', aiRoutes);
app.use('/api/questions', questionRoutes);

// 기본 루트 엔드포인트
app.get('/', (req, res) => {
  res.json({
    message: '🚀 AI Learning API에 오신 것을 환영합니다!',
    version: '1.0.0',
    documentation: {
      authentication: {
        'Google OAuth 로그인': 'GET /auth/google',
        '로그인 상태 확인': 'GET /auth/status',
        '사용자 프로필': 'GET /auth/profile',
        '토큰 검증': 'POST /auth/verify-token',
        '로그아웃': 'POST /auth/logout',
        '사용자 통계': 'GET /auth/stats'
      },
      ai: {
        '단일 질문': 'POST /api/ask',
        '대화형 채팅': 'POST /api/chat',
        '서비스 상태': 'GET /api/health',
        '사용량 통계': 'GET /api/usage-stats',
        '사용 가능한 모델': 'GET /api/models'
      },
      questions: {
        '문제지 생성': 'POST /api/questions/create-set',
        '문제 생성': 'POST /api/questions/generate/:questionSetId',
        '문제지 목록': 'GET /api/questions/sets',
        '문제지 상세': 'GET /api/questions/sets/:questionSetId',
        '문제지 상태': 'GET /api/questions/sets/:questionSetId/status',
        '문제지 삭제': 'DELETE /api/questions/sets/:questionSetId',
        '지원 과목': 'GET /api/questions/subjects',
        '난이도 목록': 'GET /api/questions/difficulties'
      }
    },
    features: [
      '✅ Google OAuth 2.0 인증',
      '✅ JWT 토큰 기반 인증',
      '✅ OpenAI ChatGPT 4o-mini 연동',
      '✅ Supabase 데이터베이스 연동',
      '✅ 문제지 생성 및 관리',
      '✅ GPT 기반 문제 자동 생성',
      '✅ 사용자별 데이터 격리',
      '✅ Rate Limiting 보안',
      '✅ CORS 정책 적용',
      '✅ 소셜 로그인 확장 지원'
    ],
    database: {
      type: 'Supabase PostgreSQL',
      features: ['Row Level Security', 'Real-time subscriptions', 'Auto-generated APIs']
    },
    authentication: {
      providers: ['Google OAuth 2.0'],
      expandable: 'Facebook, Kakao, Naver 등 추가 가능'
    },
    environment: process.env.NODE_ENV || 'development',
    models: ['gpt-4o-mini']
  });
});

// 404 에러 처리
app.use('*', (req, res) => {
  res.status(404).json({
    error: '요청하신 엔드포인트를 찾을 수 없습니다.',
    message: `${req.method} ${req.originalUrl}는 지원되지 않는 경로입니다.`,
    availableEndpoints: {
      auth: '/auth/*',
      ai: '/api/*',
      questions: '/api/questions/*',
      documentation: '/'
    }
  });
});

// 전역 에러 핸들링
app.use((error, req, res, next) => {
  console.error('서버 오류:', error);
  
  // JWT 토큰 관련 에러
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: '잘못된 토큰입니다.',
      message: '유효하지 않은 JWT 토큰입니다.'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: '토큰이 만료되었습니다.',
      message: '다시 로그인해주세요.'
    });
  }

  // 기본 서버 에러
  res.status(500).json({
    error: '서버 내부 오류가 발생했습니다.',
    message: process.env.NODE_ENV === 'development' ? error.message : '잠시 후 다시 시도해주세요.',
    timestamp: new Date().toISOString()
  });
});

// 환경변수 검증 함수
function validateEnvironment() {
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'GOOGLE_CLIENT_ID', 
    'GOOGLE_CLIENT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  다음 환경변수가 설정되지 않았습니다:', missingVars.join(', '));
    console.warn('📝 .env 파일을 확인하고 누락된 값들을 추가해주세요.');
    return false;
  }
  
  console.log('✅ 모든 환경변수가 설정되었습니다.');
  return true;
}

// 서버 시작
async function startServer() {
  try {
    // 환경변수 검증
    const envValid = validateEnvironment();
    
    // Supabase 연결 테스트
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      console.log('🔌 Supabase 연결을 확인하는 중...');
      await testConnection();
    } else {
      console.warn('⚠️  Supabase 환경변수가 설정되지 않았습니다.');
    }
    
    // 서버 시작
    app.listen(PORT, () => {
      console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`📝 API 문서: http://localhost:${PORT}`);
      console.log(`🔐 Google OAuth: http://localhost:${PORT}/auth/google`);
      console.log(`💾 데이터베이스: Supabase PostgreSQL`);
      console.log(`🤖 AI 모델: OpenAI gpt-4o-mini`);
      console.log(`👥 소셜 로그인: Google (확장 가능)`);
      
      if (!envValid) {
        console.log('⚡ 개발 모드로 실행 중 (일부 기능 제한됨)');
      }
    });
    
  } catch (error) {
    console.error('❌ 서버 시작 중 오류가 발생했습니다:', error);
    process.exit(1);
  }
}

// 서버 시작
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 서버를 종료합니다...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 서버를 종료합니다...');
  process.exit(0);
});

module.exports = app; 