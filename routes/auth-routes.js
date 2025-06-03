const express = require('express');
const passport = require('passport');
const { generateToken, authenticateToken } = require('../utils/jwt-utils');
const { getUserStatsByProvider } = require('../config/passport-config');

const router = express.Router();

/**
 * Google OAuth 로그인 시작
 * GET /auth/google
 */
router.get('/google', 
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

/**
 * Google OAuth 콜백 처리
 * GET /auth/google/callback
 */
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/auth/login/failed'
  }),
  (req, res) => {
    try {
      // JWT 토큰 생성
      const token = generateToken(req.user);
      
      // 성공 시 클라이언트로 리다이렉트 (토큰을 쿼리 파라미터로 전달)
      // 프론트엔드가 9090 포트에서 실행됨
      const redirectUrl = process.env.NODE_ENV === 'production'
        ? `https://yourdomain.com/auth/success?token=${token}`
        : `http://localhost:9090/auth/success?token=${token}`;
      
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('OAuth 콜백 처리 중 오류:', error);
      res.redirect('/auth/login/failed');
    }
  }
);

/**
 * 로그인 실패 처리
 * GET /auth/login/failed
 */
router.get('/login/failed', (req, res) => {
  res.status(401).json({
    error: 'Google 로그인에 실패했습니다.',
    message: '다시 시도해주세요.',
    loginUrl: '/auth/google'
  });
});

/**
 * 로그인 성공 후 사용자 정보 확인 (토큰 기반)
 * GET /auth/profile
 * Authorization: Bearer <token> 헤더 필요
 */
router.get('/profile', authenticateToken, (req, res) => {
  // JWT 토큰에서 추출된 사용자 정보 반환
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      socialProvider: req.user.social_provider,
      profileImage: req.user.profile_image,
      createdAt: req.user.created_at
    },
    message: '사용자 정보 조회 성공'
  });
});

/**
 * 토큰 유효성 검증
 * POST /auth/verify-token
 */
router.post('/verify-token', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      socialProvider: req.user.social_provider
    },
    message: '유효한 토큰입니다.'
  });
});

/**
 * 로그아웃
 * POST /auth/logout
 */
router.post('/logout', (req, res) => {
  // 세션 기반 로그아웃
  req.logout((err) => {
    if (err) {
      console.error('로그아웃 중 오류:', err);
      return res.status(500).json({
        error: '로그아웃 처리 중 오류가 발생했습니다.'
      });
    }
    
    // 세션 제거
    req.session.destroy((err) => {
      if (err) {
        console.error('세션 제거 중 오류:', err);
      }
      
      res.json({
        success: true,
        message: '성공적으로 로그아웃되었습니다.',
        note: '클라이언트에서 저장된 토큰도 제거해주세요.'
      });
    });
  });
});

/**
 * 현재 로그인 상태 확인 (세션 기반)
 * GET /auth/status
 */
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        socialProvider: req.user.social_provider
      }
    });
  } else {
    res.json({
      authenticated: false,
      message: '로그인이 필요합니다.'
    });
  }
});

/**
 * 사용자 통계 조회 (관리자용)
 * GET /auth/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await getUserStatsByProvider();
    
    const totalUsers = Object.values(stats).reduce((sum, count) => sum + count, 0);
    
    res.json({
      success: true,
      data: {
        totalUsers,
        providerStats: stats,
        supportedProviders: ['google'] // 향후 확장 가능
      },
      message: '사용자 통계 조회 성공'
    });
    
  } catch (error) {
    console.error('사용자 통계 조회 오류:', error);
    res.status(500).json({
      error: '사용자 통계 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = router; 