const { supabase } = require('../config/supabase-config');
const { askChatGPT } = require('./openai-service');

/**
 * 문제지 생성
 * @param {Object} questionSetData - 문제지 설정 데이터
 * @param {number} userId - 사용자 ID
 * @returns {Promise<Object>} 생성된 문제지 정보
 */
async function createQuestionSet(questionSetData, userId) {
  try {
    const {
      title = '문제지',
      subject,
      grade,
      questionType = '교과과정',
      questionCount = 10,
      difficulty = '보통',
      estimatedTime = 15,
      hasExplanation = false
    } = questionSetData;

    // 입력 검증
    if (!subject || !grade) {
      throw new Error('과목과 학년은 필수 입력 항목입니다.');
    }

    if (![1, 2, 3, 4, 5, 6].includes(parseInt(grade))) {
      throw new Error('학년은 1-6 사이여야 합니다.');
    }

    if (![5, 10, 20, 30].includes(parseInt(questionCount))) {
      throw new Error('문제 수는 5, 10, 20, 30개 중 선택해야 합니다.');
    }

    // 문제지 생성
    const { data: questionSet, error } = await supabase
      .from('question_sets')
      .insert([{
        user_id: userId,
        title,
        subject,
        grade: parseInt(grade),
        question_type: questionType,
        question_count: parseInt(questionCount),
        difficulty,
        estimated_time: parseInt(estimatedTime),
        has_explanation: hasExplanation,
        status: 'draft'
      }])
      .select()
      .single();

    if (error) {
      console.error('문제지 생성 오류:', error);
      throw new Error('문제지 생성에 실패했습니다.');
    }

    console.log('문제지 생성 완료:', questionSet.id);
    return questionSet;

  } catch (error) {
    console.error('createQuestionSet 오류:', error);
    throw error;
  }
}

/**
 * GPT를 사용하여 문제 생성
 * @param {number} questionSetId - 문제지 ID
 * @param {number} userId - 사용자 ID
 * @returns {Promise<Object>} 생성 결과
 */
async function generateQuestions(questionSetId, userId) {
  try {
    // 문제지 정보 조회
    const { data: questionSet, error: fetchError } = await supabase
      .from('question_sets')
      .select('*')
      .eq('id', questionSetId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !questionSet) {
      throw new Error('문제지를 찾을 수 없습니다.');
    }

    // 상태를 'generating'으로 변경
    await supabase
      .from('question_sets')
      .update({ status: 'generating' })
      .eq('id', questionSetId);

    // GPT 프롬프트 생성
    const prompt = createPrompt(questionSet);
    
    console.log('GPT 문제 생성 시작:', questionSetId);
    const startTime = Date.now();

    // GPT API 호출
    const gptResponse = await askChatGPT(prompt, userId, {
      max_tokens: 2000,
      temperature: 0.8
    });

    const responseTime = (Date.now() - startTime) / 1000;

    // GPT 응답 로그 저장
    await saveGptResponse(questionSetId, userId, prompt, gptResponse, responseTime);

    // 응답 파싱 및 문제 저장
    const questions = parseGptResponse(gptResponse.answer, questionSet);
    const savedQuestions = await saveQuestions(questionSetId, questions);

    // 문제지 상태를 'completed'로 변경
    await supabase
      .from('question_sets')
      .update({ status: 'completed' })
      .eq('id', questionSetId);

    console.log('문제 생성 완료:', savedQuestions.length + '개');

    return {
      success: true,
      questionSetId,
      questionsCount: savedQuestions.length,
      questions: savedQuestions
    };

  } catch (error) {
    console.error('generateQuestions 오류:', error);
    
    // 문제지 상태를 'failed'로 변경
    await supabase
      .from('question_sets')
      .update({ status: 'failed' })
      .eq('id', questionSetId);

    throw error;
  }
}

/**
 * GPT 프롬프트 생성
 */
function createPrompt(questionSet) {
  const { subject, grade, question_type, question_count, difficulty, has_explanation } = questionSet;
  
  const difficultyMap = {
    '쉬움': '기초적이고 쉬운',
    '보통': '표준적인',
    '어려움': '도전적이고 어려운'
  };

  const gradeText = `${grade}학년`;
  const difficultyText = difficultyMap[difficulty] || '표준적인';

  let prompt = `
당신은 초등학생을 위한 ${subject} 문제 출제 전문가입니다.
다음 조건에 맞는 ${question_count}개의 문제를 생성해주세요:

📋 문제 조건:
- 과목: ${subject}
- 학년: ${gradeText}
- 문제 유형: ${question_type}
- 난이도: ${difficultyText}
- 문제 수: ${question_count}개
${has_explanation ? '- 각 문제에 대한 상세한 해설 포함' : ''}

📝 출력 형식:
각 문제를 다음 형식으로 작성해주세요:

문제 1:
[문제 내용을 여기에 작성]

정답: [정답을 여기에 작성]
${has_explanation ? '\n해설: [해설을 여기에 작성]' : ''}

---

문제 2:
[문제 내용을 여기에 작성]

정답: [정답을 여기에 작성]
${has_explanation ? '\n해설: [해설을 여기에 작성]' : ''}

---

⚠️ 주의사항:
- 문제는 ${gradeText} 수준에 맞게 작성하세요
- 명확하고 이해하기 쉬운 표현을 사용하세요
- 정답은 정확하고 명확하게 제시하세요
- 각 문제는 "---"로 구분하세요
`;

  return prompt.trim();
}

/**
 * GPT 응답 파싱
 */
function parseGptResponse(responseText, questionSet) {
  try {
    const questions = [];
    const questionBlocks = responseText.split('---').filter(block => block.trim());

    questionBlocks.forEach((block, index) => {
      const lines = block.trim().split('\n').filter(line => line.trim());
      
      let questionText = '';
      let correctAnswer = '';
      let explanation = '';
      
      let currentSection = 'question';
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('문제')) {
          currentSection = 'question';
        } else if (trimmedLine.startsWith('정답:')) {
          currentSection = 'answer';
          correctAnswer = trimmedLine.replace('정답:', '').trim();
        } else if (trimmedLine.startsWith('해설:')) {
          currentSection = 'explanation';
          explanation = trimmedLine.replace('해설:', '').trim();
        } else {
          if (currentSection === 'question' && !trimmedLine.startsWith('문제')) {
            questionText += (questionText ? '\n' : '') + trimmedLine;
          } else if (currentSection === 'explanation') {
            explanation += (explanation ? '\n' : '') + trimmedLine;
          }
        }
      });

      if (questionText && correctAnswer) {
        questions.push({
          question_number: index + 1,
          question_text: questionText.trim(),
          question_type: questionSet.question_type,
          correct_answer: correctAnswer.trim(),
          explanation: explanation.trim() || null,
          difficulty_score: getDifficultyScore(questionSet.difficulty),
          estimated_time: Math.ceil(questionSet.estimated_time / questionSet.question_count)
        });
      }
    });

    return questions;
  } catch (error) {
    console.error('GPT 응답 파싱 오류:', error);
    throw new Error('GPT 응답을 파싱하는 중 오류가 발생했습니다.');
  }
}

/**
 * 난이도를 점수로 변환
 */
function getDifficultyScore(difficulty) {
  const scoreMap = {
    '쉬움': 2,
    '보통': 3,
    '어려움': 4
  };
  return scoreMap[difficulty] || 3;
}

/**
 * 문제들을 데이터베이스에 저장
 */
async function saveQuestions(questionSetId, questions) {
  try {
    const questionsWithSetId = questions.map(q => ({
      ...q,
      question_set_id: questionSetId
    }));

    const { data: savedQuestions, error } = await supabase
      .from('questions')
      .insert(questionsWithSetId)
      .select();

    if (error) {
      console.error('문제 저장 오류:', error);
      throw new Error('문제 저장에 실패했습니다.');
    }

    return savedQuestions;
  } catch (error) {
    console.error('saveQuestions 오류:', error);
    throw error;
  }
}

/**
 * GPT 응답 로그 저장
 */
async function saveGptResponse(questionSetId, userId, prompt, gptResponse, responseTime) {
  try {
    await supabase
      .from('gpt_responses')
      .insert([{
        question_set_id: questionSetId,
        user_id: userId,
        prompt_text: prompt,
        response_text: gptResponse.answer,
        model_used: gptResponse.metadata.model,
        tokens_used: gptResponse.metadata.usage.totalTokens,
        response_time: responseTime,
        status: 'success'
      }]);
  } catch (error) {
    console.error('GPT 응답 로그 저장 오류:', error);
  }
}

/**
 * 사용자의 문제지 목록 조회
 */
async function getUserQuestionSets(userId, page = 1, limit = 10) {
  try {
    const offset = (page - 1) * limit;

    const { data: questionSets, error } = await supabase
      .from('question_sets')
      .select(`
        *,
        questions:questions(count)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('문제지 목록 조회 오류:', error);
      throw new Error('문제지 목록을 불러오는데 실패했습니다.');
    }

    return questionSets;
  } catch (error) {
    console.error('getUserQuestionSets 오류:', error);
    throw error;
  }
}

/**
 * 문제지 상세 조회 (문제들 포함)
 */
async function getQuestionSetWithQuestions(questionSetId, userId) {
  try {
    const { data: questionSet, error: setError } = await supabase
      .from('question_sets')
      .select('*')
      .eq('id', questionSetId)
      .eq('user_id', userId)
      .single();

    if (setError || !questionSet) {
      throw new Error('문제지를 찾을 수 없습니다.');
    }

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('question_set_id', questionSetId)
      .order('question_number', { ascending: true });

    if (questionsError) {
      console.error('문제 조회 오류:', questionsError);
      throw new Error('문제를 불러오는데 실패했습니다.');
    }

    return {
      ...questionSet,
      questions: questions || []
    };
  } catch (error) {
    console.error('getQuestionSetWithQuestions 오류:', error);
    throw error;
  }
}

module.exports = {
  createQuestionSet,
  generateQuestions,
  getUserQuestionSets,
  getQuestionSetWithQuestions
}; 