const express = require('express');
const { askChatGPT, chatWithHistory, validateApiKey, generateProblems, generateProblemsStream } = require('../services/openai-service');
const { optionalAuth, authenticateToken } = require('../utils/jwt-utils');

const router = express.Router();

/**
 * ChatGPT에 질문하기 (단일 질문)
 * POST /api/ask
 * 
 * Body: {
 *   "question": "사용자 질문"
 * }
 * 
 * 인증은 선택사항 (로그인하지 않아도 사용 가능)
 */
router.post('/ask', optionalAuth, async (req, res) => {
  try {
    const { question } = req.body;
    
    // 입력 검증
    if (!question) {
      return res.status(400).json({
        error: '질문이 필요합니다.',
        message: 'request body에 question 필드를 포함해주세요.'
      });
    }
    
    // 사용자 ID 추출 (로그인한 경우)
    const userId = req.user ? req.user.id : null;
    
    // ChatGPT API 호출
    const result = await askChatGPT(question, userId);
    
    res.json({
      success: true,
      question: question,
      answer: result.answer,
      metadata: result.metadata
    });
    
  } catch (error) {
    console.error('질문 처리 중 오류:', error);
    
    res.status(500).json({
      error: '질문 처리 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

/**
 * 대화형 채팅 (히스토리 포함)
 * POST /api/chat
 * 
 * Body: {
 *   "messages": [
 *     {"role": "user", "content": "안녕하세요"},
 *     {"role": "assistant", "content": "안녕하세요! 무엇을 도와드릴까요?"},
 *     {"role": "user", "content": "프로그래밍에 대해 질문이 있어요"}
 *   ]
 * }
 */
router.post('/chat', optionalAuth, async (req, res) => {
  try {
    const { messages } = req.body;
    
    // 입력 검증
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: '메시지 배열이 필요합니다.',
        message: 'request body에 messages 배열을 포함해주세요.',
        example: {
          messages: [
            { role: 'user', content: '안녕하세요' }
          ]
        }
      });
    }
    
    // 메시지 형식 검증
    const isValidMessages = messages.every(msg => 
      msg.role && msg.content && 
      ['user', 'assistant', 'system'].includes(msg.role)
    );
    
    if (!isValidMessages) {
      return res.status(400).json({
        error: '잘못된 메시지 형식입니다.',
        message: '각 메시지는 role(user/assistant/system)과 content를 포함해야 합니다.'
      });
    }
    
    const userId = req.user ? req.user.id : null;
    
    // 시스템 메시지가 없으면 기본 시스템 메시지 추가
    const hasSystemMessage = messages.some(msg => msg.role === 'system');
    if (!hasSystemMessage) {
      messages.unshift({
        role: 'system',
        content: `당신은 친근하고 도움이 되는 AI 학습 도우미입니다. 
        사용자의 질문에 정확하고 이해하기 쉽게 답변해주세요.
        복잡한 개념은 단계별로 설명하고, 적절한 예시를 들어주세요.
        한국어로 답변해주세요.`
      });
    }
    
    // ChatGPT API 호출
    const result = await chatWithHistory(messages, userId);
    
    res.json({
      success: true,
      answer: result.answer,
      message: result.message,
      metadata: result.metadata
    });
    
  } catch (error) {
    console.error('채팅 처리 중 오류:', error);
    
    res.status(500).json({
      error: '채팅 처리 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

/**
 * OpenAI API 상태 확인
 * GET /api/health
 */
router.get('/health', async (req, res) => {
  try {
    const isApiKeyValid = await validateApiKey();
    
    res.json({
      status: 'ok',
      openai: {
        connected: isApiKeyValid,
        model: 'gpt-4o-mini'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('헬스체크 중 오류:', error);
    
    res.status(500).json({
      status: 'error',
      openai: {
        connected: false,
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 사용자별 AI 사용 통계 조회 (로그인 필요)
 * GET /api/usage-stats
 */
router.get('/usage-stats', authenticateToken, async (req, res) => {
  try {
    // 실제 구현에서는 데이터베이스에서 사용자별 통계를 조회
    // 현재는 예시 데이터 반환
    const stats = {
      userId: req.user.id,
      totalQuestions: 0,
      totalTokensUsed: 0,
      lastUsed: null,
      monthlyUsage: {
        questions: 0,
        tokens: 0
      }
    };
    
    res.json({
      success: true,
      stats: stats,
      message: '사용 통계를 조회했습니다.',
      note: '실제 구현에서는 데이터베이스에서 통계 데이터를 조회합니다.'
    });
    
  } catch (error) {
    console.error('사용 통계 조회 중 오류:', error);
    
    res.status(500).json({
      error: '사용 통계 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

/**
 * AI 모델 정보 조회
 * GET /api/models
 */
router.get('/models', async (req, res) => {
  try {
    res.json({
      success: true,
      models: [
        {
          id: 'gpt-4o-mini',
          name: 'GPT-4 Mini',
          description: '빠르고 효율적인 GPT-4 모델',
          maxTokens: 4096,
          costEffective: true
        }
      ],
      currentModel: 'gpt-4o-mini',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('모델 정보 조회 중 오류:', error);
    
    res.status(500).json({
      error: '모델 정보 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

/**
 * 교육용 문제 생성 API
 * POST /api/generate-problems
 * 
 * Body: {
 *   "subject": "영어",
 *   "grade": 3,
 *   "questionType": "교과 과정",
 *   "questionCount": 5,
 *   "difficulty": "어려움"
 * }
 */
router.post('/generate-problems', optionalAuth, async (req, res) => {
  try {
    const { subject, grade, questionType, questionCount, difficulty } = req.body;
    
    // 입력 검증
    if (!subject || !grade || !questionType || !questionCount || !difficulty) {
      return res.status(400).json({
        error: '필수 파라미터가 누락되었습니다.',
        message: 'subject, grade, questionType, questionCount, difficulty 모든 필드가 필요합니다.',
        example: {
          subject: "영어",
          grade: 3,
          questionType: "교과 과정",
          questionCount: 5,
          difficulty: "어려움"
        }
      });
    }
    
    // 데이터 타입 검증
    if (typeof grade !== 'number' || grade < 1 || grade > 12) {
      return res.status(400).json({
        error: '학년은 1-12 사이의 숫자여야 합니다.',
        message: 'grade 필드는 1에서 12 사이의 숫자로 입력해주세요.'
      });
    }
    
    if (typeof questionCount !== 'number' || questionCount < 1 || questionCount > 10) {
      return res.status(400).json({
        error: '문제 수는 1-10 사이의 숫자여야 합니다.',
        message: 'questionCount 필드는 1에서 10 사이의 숫자로 입력해주세요.'
      });
    }
    
    // 사용자 ID 추출 (로그인한 경우)
    const userId = req.user ? req.user.id : null;
    
    // 문제 생성 파라미터
    const problemParams = {
      subject: subject.trim(),
      grade,
      questionType: questionType.trim(),
      questionCount,
      difficulty: difficulty.trim()
    };
    
    // 문제 생성 API 호출
    const result = await generateProblems(problemParams, userId);
    
    res.json({
      success: true,
      message: '문제가 성공적으로 생성되었습니다.',
      ...result.data,
      metadata: result.metadata
    });
    
  } catch (error) {
    console.error('문제 생성 중 오류:', error);
    
    res.status(500).json({
      error: '문제 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

/**
 * 교육용 문제 실시간 생성 API (Server-Sent Events)
 * GET /api/generate-problems-stream
 * 
 * Query Parameters:
 * - subject: 과목
 * - grade: 학년
 * - questionType: 문제 유형
 * - questionCount: 문제 수
 * - difficulty: 난이도
 */
router.get('/generate-problems-stream', optionalAuth, async (req, res) => {
  try {
    const { subject, grade, questionType, questionCount, difficulty } = req.query;
    
    // 입력 검증
    if (!subject || !grade || !questionType || !questionCount || !difficulty) {
      return res.status(400).json({
        error: '필수 파라미터가 누락되었습니다.',
        message: 'subject, grade, questionType, questionCount, difficulty 모든 쿼리 파라미터가 필요합니다.',
        example: '?subject=영어&grade=3&questionType=교과 과정&questionCount=5&difficulty=어려움'
      });
    }
    
    // 데이터 타입 검증
    const gradeNum = parseInt(grade);
    const questionCountNum = parseInt(questionCount);
    
    if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 12) {
      return res.status(400).json({
        error: '학년은 1-12 사이의 숫자여야 합니다.'
      });
    }
    
    if (isNaN(questionCountNum) || questionCountNum < 1 || questionCountNum > 10) {
      return res.status(400).json({
        error: '문제 수는 1-10 사이의 숫자여야 합니다.'
      });
    }
    
    // SSE 헤더 설정
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    const userId = req.user ? req.user.id : null;
    
    // 문제 생성 파라미터
    const problemParams = {
      subject: subject.trim(),
      grade: gradeNum,
      questionType: questionType.trim(),
      questionCount: questionCountNum,
      difficulty: difficulty.trim()
    };
    
    // SSE 메시지 전송 함수
    const sendSSE = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    
    // 연결 시작 메시지
    sendSSE({
      type: 'connected',
      message: 'Server-Sent Events 연결이 설정되었습니다.',
      params: problemParams,
      timestamp: new Date().toISOString()
    });
    
    // 스트림 콜백 함수들
    const onChunk = (data) => {
      sendSSE(data);
    };
    
    const onComplete = (result) => {
      sendSSE({
        type: 'complete',
        ...result
      });
      res.end();
    };
    
    const onError = (error) => {
      sendSSE({
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      res.end();
    };
    
    // 클라이언트 연결 종료 처리
    req.on('close', () => {
      console.log('클라이언트가 SSE 연결을 종료했습니다.');
    });
    
    // 스트리밍 문제 생성 시작
    await generateProblemsStream(problemParams, userId, onChunk, onComplete, onError);
    
  } catch (error) {
    console.error('실시간 문제 생성 중 오류:', error);
    
    const errorData = {
      type: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
    res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    res.end();
  }
});

module.exports = router; 