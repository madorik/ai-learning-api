/**
 * API 테스트 예시 파일
 * 실제 서버를 실행한 후 이 스크립트를 실행하여 API 동작을 테스트할 수 있습니다.
 * 
 * 실행 방법:
 * 1. 서버 실행: npm run dev
 * 2. 새 터미널에서: node examples/api-test.js
 */

const API_BASE_URL = 'http://localhost:3000';

/**
 * API 요청을 보내는 헬퍼 함수
 */
async function apiRequest(endpoint, options = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error(`API 요청 실패 (${endpoint}):`, error.message);
    return { status: 500, error: error.message };
  }
}

/**
 * 서버 상태 확인
 */
async function testServerHealth() {
  console.log('\n🔍 서버 상태 확인...');
  
  const result = await apiRequest('/');
  if (result.status === 200) {
    console.log('✅ 서버 정상 실행 중');
    console.log('📋 사용 가능한 엔드포인트:', result.data.endpoints);
  } else {
    console.log('❌ 서버 응답 없음');
    return false;
  }
  return true;
}

/**
 * OpenAI API 연결 상태 확인
 */
async function testOpenAIHealth() {
  console.log('\n🔍 OpenAI API 상태 확인...');
  
  const result = await apiRequest('/api/health');
  if (result.status === 200) {
    const { openai } = result.data;
    if (openai.connected) {
      console.log('✅ OpenAI API 연결 성공');
      console.log(`📊 사용 모델: ${openai.model}`);
    } else {
      console.log('❌ OpenAI API 연결 실패');
      console.log('💡 .env 파일의 OPENAI_API_KEY를 확인하세요');
    }
  } else {
    console.log('❌ 헬스체크 실패:', result.data?.error);
  }
}

/**
 * ChatGPT 단일 질문 테스트
 */
async function testAskQuestion() {
  console.log('\n🤖 ChatGPT 질문 테스트...');
  
  const testQuestion = 'Node.js에서 비동기 처리의 장점을 간단히 설명해주세요.';
  
  const result = await apiRequest('/api/ask', {
    method: 'POST',
    body: JSON.stringify({
      question: testQuestion
    })
  });
  
  if (result.status === 200) {
    console.log('✅ 질문 처리 성공');
    console.log(`❓ 질문: ${result.data.question}`);
    console.log(`🤖 답변: ${result.data.answer}`);
    console.log(`📊 토큰 사용량: ${result.data.metadata.usage.totalTokens}`);
  } else {
    console.log('❌ 질문 처리 실패:', result.data?.error);
  }
}

/**
 * 대화형 채팅 테스트
 */
async function testChatConversation() {
  console.log('\n💬 대화형 채팅 테스트...');
  
  const conversation = [
    { role: 'user', content: '안녕하세요' },
    { role: 'assistant', content: '안녕하세요! 무엇을 도와드릴까요?' },
    { role: 'user', content: 'JavaScript의 Promise란 무엇인가요?' }
  ];
  
  const result = await apiRequest('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages: conversation
    })
  });
  
  if (result.status === 200) {
    console.log('✅ 대화 처리 성공');
    console.log(`🤖 AI 응답: ${result.data.answer}`);
    console.log(`📊 토큰 사용량: ${result.data.metadata.usage.totalTokens}`);
  } else {
    console.log('❌ 대화 처리 실패:', result.data?.error);
  }
}

/**
 * 모델 정보 조회 테스트
 */
async function testModelInfo() {
  console.log('\n📋 AI 모델 정보 조회...');
  
  const result = await apiRequest('/api/models');
  
  if (result.status === 200) {
    console.log('✅ 모델 정보 조회 성공');
    console.log(`🤖 현재 사용 모델: ${result.data.currentModel}`);
    console.log('📊 사용 가능한 모델들:');
    result.data.models.forEach(model => {
      console.log(`  - ${model.name} (${model.id}): ${model.description}`);
    });
  } else {
    console.log('❌ 모델 정보 조회 실패:', result.data?.error);
  }
}

/**
 * 잘못된 요청 처리 테스트
 */
async function testErrorHandling() {
  console.log('\n🚨 에러 처리 테스트...');
  
  // 빈 질문 테스트
  const emptyQuestionResult = await apiRequest('/api/ask', {
    method: 'POST',
    body: JSON.stringify({})
  });
  
  if (emptyQuestionResult.status === 400) {
    console.log('✅ 빈 질문 에러 처리 정상:', emptyQuestionResult.data.error);
  }
  
  // 존재하지 않는 엔드포인트 테스트
  const notFoundResult = await apiRequest('/api/nonexistent');
  
  if (notFoundResult.status === 404) {
    console.log('✅ 404 에러 처리 정상:', notFoundResult.data.error);
  }
}

/**
 * 전체 테스트 실행
 */
async function runAllTests() {
  console.log('🚀 AI Learning API 테스트 시작...\n');
  
  const serverOk = await testServerHealth();
  if (!serverOk) {
    console.log('\n❌ 서버가 실행되지 않았습니다. npm run dev로 서버를 먼저 실행하세요.');
    return;
  }
  
  await testOpenAIHealth();
  await testModelInfo();
  await testAskQuestion();
  await testChatConversation();
  await testErrorHandling();
  
  console.log('\n✨ 모든 테스트 완료!');
  console.log('🔗 Google OAuth 테스트: http://localhost:3000/auth/google');
}

// Node.js 환경에서만 실행 (브라우저에서는 실행하지 않음)
if (typeof window === 'undefined') {
  // fetch API polyfill for Node.js
  global.fetch = require('node-fetch');
  
  runAllTests().catch(error => {
    console.error('테스트 실행 중 오류:', error);
  });
}

module.exports = {
  testServerHealth,
  testOpenAIHealth,
  testAskQuestion,
  testChatConversation,
  testModelInfo,
  testErrorHandling
}; 