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

/**
 * 교육용 문제를 생성하는 함수
 * @param {Object} params - 문제 생성 파라미터
 * @param {string} params.subject - 과목
 * @param {number} params.grade - 학년
 * @param {string} params.questionType - 문제 유형
 * @param {number} params.questionCount - 문제 수
 * @param {string} params.difficulty - 난이도
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} 생성된 문제들
 */
async function generateProblems(params, userId = null) {
  try {
    const { subject, grade, questionType, questionCount, difficulty } = params;
    
    // 입력 검증
    if (!subject || !grade || !questionType || !questionCount || !difficulty) {
      throw new Error('필수 파라미터가 누락되었습니다.');
    }
    
    if (questionCount < 1 || questionCount > 10) {
      throw new Error('문제 수는 1개 이상 10개 이하로 설정해주세요.');
    }
    
    console.log(`문제 생성 요청 - 사용자: ${userId || 'anonymous'}, ${subject} ${grade}학년 ${difficulty} ${questionCount}개`);
    
    // 프롬프트 생성
    const systemMessage = {
      role: 'system',
      content: `당신은 교육 전문가이자 문제 출제 전문가입니다. 
      주어진 조건에 맞는 교육용 문제를 생성해주세요.
      문제는 해당 학년 수준에 맞고, 교육과정을 반영해야 합니다.
      해설은 학생들이 이해하기 쉽도록 단계별로 자세히 설명해주세요.
      반드시 JSON 형식으로만 응답하고, 다른 텍스트는 포함하지 마세요.`
    };
    
    const userMessage = {
      role: 'user',
      content: `다음 조건에 맞는 문제를 생성해주세요:

과목: ${subject}
학년: ${grade}학년
문제 유형: ${questionType}
문제 수: ${questionCount}개
난이도: ${difficulty}

응답은 반드시 다음 JSON 형식으로 출력해주세요:

{
  "subject": "${subject}",
  "grade": ${grade},
  "question_type": "${questionType}",
  "difficulty": "${difficulty}",
  "question_count": ${questionCount},
  "problems": [
    {
      "question": "문제 내용",
      "choices": ["보기1", "보기2", "보기3", "보기4"],
      "answer": "정답 보기 텍스트",
      "explanation": "자세한 해설"
    }
  ]
}

각 문제는 다음을 반드시 포함해야 합니다:
- question: 명확하고 구체적인 문제 내용
- choices: 정확히 4개의 보기 (한국어)
- answer: choices 중 하나와 정확히 일치하는 정답
- explanation: 왜 그 답이 정답인지, 다른 보기들이 왜 틀렸는지 포함한 자세한 해설

${grade}학년 수준에 맞는 적절한 난이도로 출제하고, 해설은 학생들이 완전히 이해할 수 있도록 상세하게 작성해주세요.`
    };
    
    // OpenAI API 호출
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 3000, // 문제 생성을 위해 토큰 수 증가
      temperature: 0.8, // 다양한 문제 생성을 위해 창의성 증가
      messages: [systemMessage, userMessage]
    });
    
    if (!completion.choices || completion.choices.length === 0) {
      throw new Error('OpenAI API에서 응답을 받지 못했습니다.');
    }
    
    const responseContent = completion.choices[0].message.content;
    const usage = completion.usage;
    
    // JSON 파싱 시도
    let problemsData;
    try {
      // 응답에서 JSON 부분만 추출 (코드 블록 제거)
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('응답에서 JSON을 찾을 수 없습니다.');
      }
      
      problemsData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      throw new Error('생성된 문제 데이터의 형식이 올바르지 않습니다.');
    }
    
    // 응답 데이터 검증
    if (!problemsData.problems || !Array.isArray(problemsData.problems)) {
      throw new Error('생성된 문제 데이터의 구조가 올바르지 않습니다.');
    }
    
    // 각 문제 검증
    for (const problem of problemsData.problems) {
      if (!problem.question || !problem.choices || !problem.answer || !problem.explanation) {
        throw new Error('문제 데이터에 필수 필드가 누락되었습니다.');
      }
      
      if (!Array.isArray(problem.choices) || problem.choices.length !== 4) {
        throw new Error('각 문제는 정확히 4개의 보기를 가져야 합니다.');
      }
      
      if (!problem.choices.includes(problem.answer)) {
        throw new Error('정답이 보기에 포함되어 있지 않습니다.');
      }
    }
    
    console.log(`문제 생성 완료 - 토큰 사용량: ${usage.total_tokens}, 문제 수: ${problemsData.problems.length}`);
    
    return {
      success: true,
      data: problemsData,
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
    console.error('문제 생성 중 오류:', error);
    throw error;
  }
}

/**
 * 교육용 문제를 실시간으로 생성하는 스트리밍 함수
 * @param {Object} params - 문제 생성 파라미터
 * @param {string} userId - 사용자 ID
 * @param {Function} onChunk - 스트림 청크 콜백 함수
 * @param {Function} onComplete - 완료 콜백 함수
 * @param {Function} onError - 오류 콜백 함수
 */
async function generateProblemsStream(params, userId = null, onChunk, onComplete, onError) {
  try {
    const { subject, grade, questionType, questionCount, difficulty } = params;
    
    // 입력 검증
    if (!subject || !grade || !questionType || !questionCount || !difficulty) {
      throw new Error('필수 파라미터가 누락되었습니다.');
    }
    
    if (questionCount < 1 || questionCount > 10) {
      throw new Error('문제 수는 1개 이상 10개 이하로 설정해주세요.');
    }
    
    console.log(`실시간 문제 생성 요청 - 사용자: ${userId || 'anonymous'}, ${subject} ${grade}학년 ${difficulty} ${questionCount}개`);
    
    // 시작 메시지 전송
    onChunk({
      type: 'start',
      message: '문제 생성을 시작합니다...',
      timestamp: new Date().toISOString()
    });
    
    // 프롬프트 생성
    const systemMessage = {
      role: 'system',
      content: `당신은 교육 전문가이자 문제 출제 전문가입니다. 
      주어진 조건에 맞는 교육용 문제를 생성해주세요.
      문제는 해당 학년 수준에 맞고, 교육과정을 반영해야 합니다.
      해설은 학생들이 이해하기 쉽도록 단계별로 자세히 설명해주세요.
      반드시 JSON 형식으로만 응답하고, 다른 텍스트는 포함하지 마세요.`
    };
    
    const userMessage = {
      role: 'user',
      content: `다음 조건에 맞는 문제를 생성해주세요:

과목: ${subject}
학년: ${grade}학년
문제 유형: ${questionType}
문제 수: ${questionCount}개
난이도: ${difficulty}

응답은 반드시 다음 JSON 형식으로 출력해주세요:

{
  "subject": "${subject}",
  "grade": ${grade},
  "question_type": "${questionType}",
  "difficulty": "${difficulty}",
  "question_count": ${questionCount},
  "problems": [
    {
      "question": "문제 내용",
      "choices": ["보기1", "보기2", "보기3", "보기4"],
      "answer": "정답 보기 텍스트",
      "explanation": "자세한 해설"
    }
  ]
}

각 문제는 다음을 반드시 포함해야 합니다:
- question: 명확하고 구체적인 문제 내용
- choices: 정확히 4개의 보기 (한국어)
- answer: choices 중 하나와 정확히 일치하는 정답
- explanation: 왜 그 답이 정답인지, 다른 보기들이 왜 틀렸는지 포함한 자세한 해설

${grade}학년 수준에 맞는 적절한 난이도로 출제하고, 해설은 학생들이 완전히 이해할 수 있도록 상세하게 작성해주세요.`
    };
    
    // 진행 상황 전송
    onChunk({
      type: 'progress',
      message: 'GPT-4o mini에 요청을 전송 중...',
      timestamp: new Date().toISOString()
    });
    
    let fullResponse = '';
    let tokenCount = 0;
    
    // OpenAI 스트림 API 호출
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 3000,
      temperature: 0.8,
      stream: true, // 스트리밍 활성화
      messages: [systemMessage, userMessage]
    });
    
    // 스트림 처리 시작 메시지
    onChunk({
      type: 'stream_start',
      message: '응답을 실시간으로 받고 있습니다...',
      timestamp: new Date().toISOString()
    });
    
    // 스트림 데이터 처리
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      
      if (content) {
        fullResponse += content;
        tokenCount++;
        
        // 실시간 청크 데이터 전송
        onChunk({
          type: 'chunk',
          content: content,
          fullResponse: fullResponse,
          tokenCount: tokenCount,
          timestamp: new Date().toISOString()
        });
      }
      
      // 완료 여부 확인
      if (chunk.choices[0]?.finish_reason === 'stop') {
        break;
      }
    }
    
    // 파싱 시작 메시지
    onChunk({
      type: 'parsing',
      message: '응답을 분석하고 검증 중...',
      timestamp: new Date().toISOString()
    });
    
    // JSON 파싱 시도
    let problemsData;
    try {
      // 응답에서 JSON 부분만 추출
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('응답에서 JSON을 찾을 수 없습니다.');
      }
      
      problemsData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      onError(new Error('생성된 문제 데이터의 형식이 올바르지 않습니다.'));
      return;
    }
    
    // 응답 데이터 검증
    if (!problemsData.problems || !Array.isArray(problemsData.problems)) {
      onError(new Error('생성된 문제 데이터의 구조가 올바르지 않습니다.'));
      return;
    }
    
    // 각 문제 검증
    for (const problem of problemsData.problems) {
      if (!problem.question || !problem.choices || !problem.answer || !problem.explanation) {
        onError(new Error('문제 데이터에 필수 필드가 누락되었습니다.'));
        return;
      }
      
      if (!Array.isArray(problem.choices) || problem.choices.length !== 4) {
        onError(new Error('각 문제는 정확히 4개의 보기를 가져야 합니다.'));
        return;
      }
      
      if (!problem.choices.includes(problem.answer)) {
        onError(new Error('정답이 보기에 포함되어 있지 않습니다.'));
        return;
      }
    }
    
    console.log(`실시간 문제 생성 완료 - 예상 토큰 사용량: ${tokenCount}, 문제 수: ${problemsData.problems.length}`);
    
    // 완료 데이터 전송
    onComplete({
      success: true,
      data: problemsData,
      metadata: {
        model: 'gpt-4o-mini',
        usage: {
          estimatedTokens: tokenCount
        },
        timestamp: new Date().toISOString(),
        userId: userId
      }
    });
    
  } catch (error) {
    console.error('실시간 문제 생성 중 오류:', error);
    onError(error);
  }
}

module.exports = {
  askChatGPT,
  chatWithHistory,
  validateApiKey,
  generateProblems,
  generateProblemsStream
}; 