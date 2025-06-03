const OpenAI = require('openai');

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * ChatGPT에 질문을 보내고 응답을 받는 함수
 * @param {string} question - 사용자 질문
 * @param {string} userId - 사용자 ID (로깅 및 추적용)
 * @param {Object} options - 추가 옵션
 * @returns {Promise<Object>} ChatGPT 응답 결과
 */
async function askChatGPT(question, userId = null, options = {}) {
  try {
    // 입력 검증
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      throw new Error('질문이 제공되지 않았거나 유효하지 않습니다.');
    }
    
    // 질문 길이 제한 (토큰 비용 관리)
    const MAX_QUESTION_LENGTH = 2000;
    if (question.length > MAX_QUESTION_LENGTH) {
      throw new Error(`질문이 너무 깁니다. 최대 ${MAX_QUESTION_LENGTH}자까지 입력 가능합니다.`);
    }
    
    console.log(`ChatGPT 요청 - 사용자: ${userId || 'anonymous'}, 질문 길이: ${question.length}`);
    
    // 기본 설정
    const defaultOptions = {
      model: 'gpt-4o-mini', // GPT-4 Mini 모델 사용
      max_tokens: 1000,      // 응답 길이 제한
      temperature: 0.7,      // 창의성 수준 (0-1)
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    };
    
    // 시스템 메시지 설정 - AI 학습 도우미 역할
    const systemMessage = {
      role: 'system',
      content: `당신은 친근하고 도움이 되는 AI 학습 도우미입니다. 
      사용자의 질문에 정확하고 이해하기 쉽게 답변해주세요.
      복잡한 개념은 단계별로 설명하고, 적절한 예시를 들어주세요.
      한국어로 답변해주세요.`
    };
    
    // 사용자 메시지
    const userMessage = {
      role: 'user',
      content: question.trim()
    };
    
    // OpenAI API 호출
    const completion = await openai.chat.completions.create({
      ...defaultOptions,
      ...options, // 사용자 정의 옵션으로 덮어쓰기
      messages: [systemMessage, userMessage]
    });
    
    // 응답 검증
    if (!completion.choices || completion.choices.length === 0) {
      throw new Error('OpenAI API에서 응답을 받지 못했습니다.');
    }
    
    const answer = completion.choices[0].message.content;
    const usage = completion.usage;
    
    console.log(`ChatGPT 응답 완료 - 토큰 사용량: ${usage.total_tokens}`);
    
    return {
      success: true,
      answer: answer,
      metadata: {
        model: completion.model,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        },
        timestamp: new Date().toISOString(),
        userId: userId
      }
    };
    
  } catch (error) {
    console.error('ChatGPT API 호출 중 오류:', error);
    
    // OpenAI API 에러 처리
    if (error.status === 401) {
      throw new Error('OpenAI API 키가 유효하지 않습니다.');
    } else if (error.status === 429) {
      throw new Error('API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
    } else if (error.status === 500) {
      throw new Error('OpenAI 서버에 일시적인 문제가 발생했습니다.');
    }
    
    // 일반적인 에러
    throw new Error(error.message || '알 수 없는 오류가 발생했습니다.');
  }
}

/**
 * 대화 히스토리를 포함한 채팅 기능
 * @param {Array} messages - 대화 히스토리 (OpenAI 메시지 형식)
 * @param {string} userId - 사용자 ID
 * @param {Object} options - 추가 옵션
 * @returns {Promise<Object>} ChatGPT 응답 결과
 */
async function chatWithHistory(messages, userId = null, options = {}) {
  try {
    // 메시지 배열 검증
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('메시지 히스토리가 제공되지 않았습니다.');
    }
    
    // 메시지 개수 제한 (컨텍스트 길이 관리)
    const MAX_MESSAGES = 20;
    if (messages.length > MAX_MESSAGES) {
      // 최근 메시지만 유지 (시스템 메시지는 보존)
      const systemMessages = messages.filter(msg => msg.role === 'system');
      const recentMessages = messages.filter(msg => msg.role !== 'system').slice(-MAX_MESSAGES);
      messages = [...systemMessages, ...recentMessages];
    }
    
    console.log(`ChatGPT 대화 요청 - 사용자: ${userId || 'anonymous'}, 메시지 수: ${messages.length}`);
    
    const defaultOptions = {
      model: 'gpt-4o-mini',
      max_tokens: 1000,
      temperature: 0.7
    };
    
    const completion = await openai.chat.completions.create({
      ...defaultOptions,
      ...options,
      messages: messages
    });
    
    if (!completion.choices || completion.choices.length === 0) {
      throw new Error('OpenAI API에서 응답을 받지 못했습니다.');
    }
    
    const answer = completion.choices[0].message.content;
    const usage = completion.usage;
    
    console.log(`ChatGPT 대화 응답 완료 - 토큰 사용량: ${usage.total_tokens}`);
    
    return {
      success: true,
      answer: answer,
      message: completion.choices[0].message,
      metadata: {
        model: completion.model,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        },
        timestamp: new Date().toISOString(),
        userId: userId
      }
    };
    
  } catch (error) {
    console.error('ChatGPT 대화 API 호출 중 오류:', error);
    throw error;
  }
}

/**
 * API 키 유효성 검증 함수
 * @returns {Promise<boolean>} API 키가 유효하면 true
 */
async function validateApiKey() {
  try {
    await openai.models.list();
    return true;
  } catch (error) {
    console.error('OpenAI API 키 검증 실패:', error.message);
    return false;
  }
}

module.exports = {
  askChatGPT,
  chatWithHistory,
  validateApiKey
}; 