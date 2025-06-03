const express = require('express');
const { authenticateToken } = require('../utils/jwt-utils');
const {
  createQuestionSet,
  generateQuestions,
  getUserQuestionSets,
  getQuestionSetWithQuestions
} = require('../services/question-set-service');

const router = express.Router();

/**
 * UUID 형식 검증 함수
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * 문제지 생성
 * POST /api/questions/create-set
 */
router.post('/create-set', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const questionSetData = req.body;

    // 입력 검증
    const requiredFields = ['subject', 'grade'];
    const missingFields = requiredFields.filter(field => !questionSetData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: '필수 입력 항목이 누락되었습니다.',
        missingFields,
        message: '과목과 학년은 필수 입력 항목입니다.'
      });
    }

    // 문제지 생성
    const questionSet = await createQuestionSet(questionSetData, userId);

    res.status(201).json({
      success: true,
      message: '문제지가 성공적으로 생성되었습니다.',
      data: questionSet
    });

  } catch (error) {
    console.error('문제지 생성 오류:', error);
    res.status(500).json({
      error: '문제지 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

/**
 * 문제 생성 (GPT 사용)
 * POST /api/questions/generate/:questionSetId
 */
router.post('/generate/:questionSetId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const questionSetId = req.params.questionSetId;

    // UUID 형식 검증
    if (!isValidUUID(questionSetId)) {
      return res.status(400).json({
        error: '유효하지 않은 문제지 ID 형식입니다.',
        message: 'questionSetId는 UUID 형식이어야 합니다.',
        example: 'a0b1c2d3-e4f5-6789-abcd-ef0123456789'
      });
    }

    // 비동기로 문제 생성 (시간이 오래 걸릴 수 있음)
    generateQuestions(questionSetId, userId)
      .then(result => {
        console.log('문제 생성 완료:', result);
      })
      .catch(error => {
        console.error('문제 생성 실패:', error);
      });

    // 즉시 응답 반환 (생성 진행 중)
    res.json({
      success: true,
      message: '문제 생성이 시작되었습니다. 잠시 후 다시 확인해주세요.',
      questionSetId,
      status: 'generating'
    });

  } catch (error) {
    console.error('문제 생성 시작 오류:', error);
    res.status(500).json({
      error: '문제 생성을 시작하는 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

/**
 * 사용자의 문제지 목록 조회
 * GET /api/questions/sets
 */
router.get('/sets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (page < 1 || limit < 1 || limit > 50) {
      return res.status(400).json({
        error: '잘못된 페이지네이션 파라미터입니다.',
        message: 'page는 1 이상, limit는 1-50 사이여야 합니다.'
      });
    }

    const questionSets = await getUserQuestionSets(userId, page, limit);

    res.json({
      success: true,
      data: questionSets,
      pagination: {
        page,
        limit,
        total: questionSets.length
      }
    });

  } catch (error) {
    console.error('문제지 목록 조회 오류:', error);
    res.status(500).json({
      error: '문제지 목록을 불러오는 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

/**
 * 문제지 상세 조회 (문제들 포함)
 * GET /api/questions/sets/:questionSetId
 */
router.get('/sets/:questionSetId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const questionSetId = req.params.questionSetId;

    // UUID 형식 검증
    if (!isValidUUID(questionSetId)) {
      return res.status(400).json({
        error: '유효하지 않은 문제지 ID 형식입니다.',
        message: 'questionSetId는 UUID 형식이어야 합니다.'
      });
    }

    const questionSetWithQuestions = await getQuestionSetWithQuestions(questionSetId, userId);

    res.json({
      success: true,
      data: questionSetWithQuestions
    });

  } catch (error) {
    console.error('문제지 상세 조회 오류:', error);
    
    if (error.message === '문제지를 찾을 수 없습니다.') {
      return res.status(404).json({
        error: '문제지를 찾을 수 없습니다.',
        message: '존재하지 않거나 접근 권한이 없는 문제지입니다.'
      });
    }

    res.status(500).json({
      error: '문제지 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

/**
 * 문제지 상태 확인
 * GET /api/questions/sets/:questionSetId/status
 */
router.get('/sets/:questionSetId/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const questionSetId = req.params.questionSetId;

    // UUID 형식 검증
    if (!isValidUUID(questionSetId)) {
      return res.status(400).json({
        error: '유효하지 않은 문제지 ID 형식입니다.',
        message: 'questionSetId는 UUID 형식이어야 합니다.'
      });
    }

    const questionSet = await getQuestionSetWithQuestions(questionSetId, userId);

    res.json({
      success: true,
      status: questionSet.status,
      questionsCount: questionSet.questions.length,
      data: {
        id: questionSet.id,
        title: questionSet.title,
        subject: questionSet.subject,
        grade: questionSet.grade,
        status: questionSet.status,
        created_at: questionSet.created_at,
        updated_at: questionSet.updated_at
      }
    });

  } catch (error) {
    console.error('문제지 상태 확인 오류:', error);
    
    if (error.message === '문제지를 찾을 수 없습니다.') {
      return res.status(404).json({
        error: '문제지를 찾을 수 없습니다.'
      });
    }

    res.status(500).json({
      error: '문제지 상태 확인 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

/**
 * 문제지 삭제
 * DELETE /api/questions/sets/:questionSetId
 */
router.delete('/sets/:questionSetId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const questionSetId = req.params.questionSetId;

    // UUID 형식 검증
    if (!isValidUUID(questionSetId)) {
      return res.status(400).json({
        error: '유효하지 않은 문제지 ID 형식입니다.',
        message: 'questionSetId는 UUID 형식이어야 합니다.'
      });
    }

    const { supabase } = require('../config/supabase-config');

    // 문제지 존재 및 권한 확인
    const { data: questionSet, error: fetchError } = await supabase
      .from('question_sets')
      .select('id')
      .eq('id', questionSetId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !questionSet) {
      return res.status(404).json({
        error: '문제지를 찾을 수 없습니다.',
        message: '존재하지 않거나 삭제 권한이 없는 문제지입니다.'
      });
    }

    // 문제지 삭제 (CASCADE로 관련 문제들도 자동 삭제)
    const { error: deleteError } = await supabase
      .from('question_sets')
      .delete()
      .eq('id', questionSetId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('문제지 삭제 오류:', deleteError);
      throw new Error('문제지 삭제에 실패했습니다.');
    }

    res.json({
      success: true,
      message: '문제지가 성공적으로 삭제되었습니다.',
      deletedId: questionSetId
    });

  } catch (error) {
    console.error('문제지 삭제 오류:', error);
    res.status(500).json({
      error: '문제지 삭제 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

/**
 * 지원되는 과목 목록 조회
 * GET /api/questions/subjects
 */
router.get('/subjects', (req, res) => {
  const subjects = [
    { value: '수학', label: '수학', icon: '🔢' },
    { value: '국어', label: '국어', icon: '📖' },
    { value: '영어', label: '영어', icon: '🌍' },
    { value: '과학', label: '과학', icon: '🔬' },
    { value: '사회', label: '사회', icon: '🏛️' },
    { value: '음악', label: '음악', icon: '🎵' },
    { value: '미술', label: '미술', icon: '🎨' },
    { value: '체육', label: '체육', icon: '⚽' }
  ];

  res.json({
    success: true,
    data: subjects
  });
});

/**
 * 지원되는 난이도 목록 조회
 * GET /api/questions/difficulties
 */
router.get('/difficulties', (req, res) => {
  const difficulties = [
    { value: '쉬움', label: '쉬움', description: '기초적이고 쉬운 문제' },
    { value: '보통', label: '보통', description: '표준적인 수준의 문제' },
    { value: '어려움', label: '어려움', description: '도전적이고 어려운 문제' }
  ];

  res.json({
    success: true,
    data: difficulties
  });
});

module.exports = router; 