const fetch = require('node-fetch');

// API 서버 주소 (환경에 맞게 수정)
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * 문제 생성 API 테스트 함수
 */
async function testGenerateProblems() {
  try {
    console.log('🧪 문제 생성 API 테스트 시작...\n');
    
    // 테스트 요청 데이터
    const requestData = {
      subject: "영어",
      grade: 3,
      questionType: "교과 과정",
      questionCount: 5,
      difficulty: "어려움"
    };
    
    console.log('📝 요청 데이터:');
    console.log(JSON.stringify(requestData, null, 2));
    console.log('\n⏳ GPT-4o mini API 호출 중...\n');
    
    // API 요청 시작 시간
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE_URL}/generate-problems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    // API 요청 완료 시간
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`⏱️  API 응답 시간: ${duration}초\n`);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API 오류:', errorData);
      return;
    }
    
    const result = await response.json();
    
    console.log('✅ 문제 생성 성공!\n');
    console.log('📊 응답 데이터:');
    console.log('='.repeat(60));
    
    // 메타데이터 출력
    if (result.metadata) {
      console.log(`🤖 모델: ${result.metadata.model}`);
      console.log(`🎯 토큰 사용량: ${result.metadata.usage.totalTokens}`);
      console.log(`📅 생성 시간: ${result.metadata.timestamp}\n`);
    }
    
    // 문제 정보 출력
    console.log(`📚 과목: ${result.subject}`);
    console.log(`🎓 학년: ${result.grade}학년`);
    console.log(`📝 문제 유형: ${result.question_type}`);
    console.log(`⚡ 난이도: ${result.difficulty}`);
    console.log(`🔢 문제 수: ${result.question_count}개\n`);
    
    // 각 문제 출력
    result.problems.forEach((problem, index) => {
      console.log(`📖 문제 ${index + 1}:`);
      console.log(`Q: ${problem.question}`);
      console.log('\n보기:');
      problem.choices.forEach((choice, idx) => {
        const marker = choice === problem.answer ? '✓' : ' ';
        console.log(`  ${idx + 1}) ${choice} ${marker}`);
      });
      console.log(`\n💡 해설:`);
      console.log(`${problem.explanation}\n`);
      console.log('-'.repeat(50));
    });
    
    console.log('\n🎉 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
  }
}

/**
 * 여러 조건으로 테스트하는 함수
 */
async function testMultipleConditions() {
  const testCases = [
    {
      name: "영어 3학년 교과과정",
      data: {
        subject: "영어",
        grade: 3,
        questionType: "교과 과정",
        questionCount: 3,
        difficulty: "보통"
      }
    },
    {
      name: "수학 5학년 응용문제",
      data: {
        subject: "수학",
        grade: 5,
        questionType: "응용 문제",
        questionCount: 2,
        difficulty: "어려움"
      }
    },
    {
      name: "과학 4학년 기초개념",
      data: {
        subject: "과학",
        grade: 4,
        questionType: "기초 개념",
        questionCount: 3,
        difficulty: "쉬움"
      }
    }
  ];
  
  console.log('🧪 다중 조건 테스트 시작...\n');
  
  for (const testCase of testCases) {
    console.log(`\n📋 테스트: ${testCase.name}`);
    console.log('='.repeat(40));
    
    try {
      const response = await fetch(`${API_BASE_URL}/generate-problems`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testCase.data)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ 성공: ${result.problems.length}개 문제 생성`);
        console.log(`🎯 토큰 사용: ${result.metadata?.usage?.totalTokens || 'N/A'}`);
      } else {
        const error = await response.json();
        console.log(`❌ 실패: ${error.message}`);
      }
    } catch (error) {
      console.log(`❌ 오류: ${error.message}`);
    }
    
    // 다음 테스트 전 잠시 대기 (API 제한 고려)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 다중 조건 테스트 완료!');
}

// 실행할 테스트 선택
async function runTests() {
  const args = process.argv.slice(2);
  
  if (args.includes('--multiple') || args.includes('-m')) {
    await testMultipleConditions();
  } else {
    await testGenerateProblems();
  }
}

// 스크립트 실행
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testGenerateProblems,
  testMultipleConditions
}; 