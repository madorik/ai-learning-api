const { supabase } = require('../config/supabase-config');

/**
 * 문제 생성 로그를 Supabase에 저장하는 서비스
 */

/**
 * 문제 생성 로그 저장
 * @param {Object} logData - 저장할 로그 데이터
 * @param {string} logData.userId - 사용자 ID (옵셔널, 익명 사용자의 경우 null)
 * @param {Object} logData.requestData - 요청 데이터
 * @param {Object} logData.responseData - GPT 응답 데이터
 * @param {string} logData.rawResponse - GPT 원본 응답
 * @param {Object} logData.metadata - 메타데이터 (토큰 사용량 등)
 * @param {string} logData.apiEndpoint - API 엔드포인트
 * @param {string} logData.userAgent - User Agent
 * @param {string} logData.ipAddress - IP 주소
 * @param {number} logData.responseTimeMs - 응답 시간 (밀리초)
 * @param {string} logData.status - 상태 (success/error)
 * @param {string} logData.errorMessage - 오류 메시지 (오류 시)
 * @returns {Promise<Object>} 저장 결과
 */
async function saveProblemGenerationLog(logData) {
  try {
    const {
      userId,
      requestData,
      responseData,
      rawResponse,
      metadata,
      apiEndpoint,
      userAgent,
      ipAddress,
      responseTimeMs,
      status = 'success',
      errorMessage
    } = logData;

    // 요청 데이터에서 검색용 필드 추출
    const {
      subject,
      grade,
      questionType,
      questionCount,
      difficulty,
      includeExplanation
    } = requestData;

    // 저장할 데이터 구성
    const insertData = {
      user_id: userId || null,
      request_data: requestData,
      response_data: responseData || null,
      raw_response: rawResponse || null,
      model_used: metadata?.model || 'gpt-4o-mini',
      prompt_tokens: metadata?.usage?.promptTokens || null,
      completion_tokens: metadata?.usage?.completionTokens || null,
      total_tokens: metadata?.usage?.totalTokens || metadata?.usage?.estimatedTokens || null,
      response_time_ms: responseTimeMs,
      status: status,
      error_message: errorMessage || null,
      api_endpoint: apiEndpoint,
      user_agent: userAgent || null,
      ip_address: ipAddress || null,
      // 검색용 필드
      subject: subject,
      grade: grade,
      question_type: questionType,
      question_count: questionCount,
      difficulty: difficulty,
      include_explanation: includeExplanation
    };

    // Supabase에 삽입
    const { data, error } = await supabase
      .from('problem_generation_logs')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('문제 생성 로그 저장 오류:', error);
      throw error;
    }

    console.log(`✅ 문제 생성 로그 저장 완료 - ID: ${data.id}, 사용자: ${userId || 'anonymous'}`);
    return {
      success: true,
      logId: data.id,
      data: data
    };

  } catch (error) {
    console.error('saveProblemGenerationLog 오류:', error);
    throw error;
  }
}

/**
 * 사용자별 문제 생성 통계 조회
 * @param {string} userId - 사용자 ID
 * @param {Object} options - 조회 옵션
 * @param {number} options.days - 최근 며칠간의 데이터 (기본: 30일)
 * @returns {Promise<Object>} 통계 데이터
 */
async function getUserProblemStats(userId, options = {}) {
  try {
    const { days = 30 } = options;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const { data, error } = await supabase
      .from('problem_generation_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', fromDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('사용자 통계 조회 오류:', error);
      throw error;
    }

    // 통계 계산
    const stats = {
      totalGenerations: data.length,
      totalTokensUsed: data.reduce((sum, log) => sum + (log.total_tokens || 0), 0),
      averageResponseTime: data.length > 0 
        ? Math.round(data.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / data.length)
        : 0,
      successCount: data.filter(log => log.status === 'success').length,
      errorCount: data.filter(log => log.status === 'error').length,
      subjectBreakdown: {},
      gradeBreakdown: {},
      difficultyBreakdown: {},
      recentActivity: data.slice(0, 10) // 최근 10개 활동
    };

    // 과목별, 학년별, 난이도별 분류
    data.forEach(log => {
      // 과목별
      const subject = log.subject || 'unknown';
      stats.subjectBreakdown[subject] = (stats.subjectBreakdown[subject] || 0) + 1;

      // 학년별
      const grade = log.grade || 'unknown';
      stats.gradeBreakdown[grade] = (stats.gradeBreakdown[grade] || 0) + 1;

      // 난이도별
      const difficulty = log.difficulty || 'unknown';
      stats.difficultyBreakdown[difficulty] = (stats.difficultyBreakdown[difficulty] || 0) + 1;
    });

    return {
      success: true,
      period: `최근 ${days}일`,
      stats: stats
    };

  } catch (error) {
    console.error('getUserProblemStats 오류:', error);
    throw error;
  }
}

/**
 * 전체 문제 생성 통계 조회 (관리자용)
 * @param {Object} options - 조회 옵션
 * @param {number} options.days - 최근 며칠간의 데이터 (기본: 7일)
 * @param {number} options.limit - 결과 수 제한 (기본: 100)
 * @returns {Promise<Object>} 통계 데이터
 */
async function getGlobalProblemStats(options = {}) {
  try {
    const { days = 7, limit = 100 } = options;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // 전체 통계 조회
    const { data, error } = await supabase
      .from('problem_generation_logs')
      .select('*')
      .gte('created_at', fromDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('전체 통계 조회 오류:', error);
      throw error;
    }

    // 통계 계산
    const stats = {
      totalGenerations: data.length,
      totalTokensUsed: data.reduce((sum, log) => sum + (log.total_tokens || 0), 0),
      averageResponseTime: data.length > 0 
        ? Math.round(data.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / data.length)
        : 0,
      successRate: data.length > 0 
        ? Math.round((data.filter(log => log.status === 'success').length / data.length) * 100)
        : 0,
      uniqueUsers: new Set(data.filter(log => log.user_id).map(log => log.user_id)).size,
      anonymousGenerations: data.filter(log => !log.user_id).length,
      apiEndpointUsage: {},
      dailyActivity: {}
    };

    // API 엔드포인트별 사용량
    data.forEach(log => {
      const endpoint = log.api_endpoint || 'unknown';
      stats.apiEndpointUsage[endpoint] = (stats.apiEndpointUsage[endpoint] || 0) + 1;
    });

    // 일별 활동량
    data.forEach(log => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      if (!stats.dailyActivity[date]) {
        stats.dailyActivity[date] = { count: 0, tokens: 0 };
      }
      stats.dailyActivity[date].count += 1;
      stats.dailyActivity[date].tokens += log.total_tokens || 0;
    });

    return {
      success: true,
      period: `최근 ${days}일`,
      stats: stats
    };

  } catch (error) {
    console.error('getGlobalProblemStats 오류:', error);
    throw error;
  }
}

/**
 * 특정 로그 조회
 * @param {string} logId - 로그 ID
 * @param {string} userId - 사용자 ID (본인 데이터만 조회 가능)
 * @returns {Promise<Object>} 로그 데이터
 */
async function getProblemGenerationLog(logId, userId = null) {
  try {
    let query = supabase
      .from('problem_generation_logs')
      .select('*')
      .eq('id', logId);

    // 사용자 ID가 제공된 경우 본인 데이터만 조회
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: '로그를 찾을 수 없습니다.' };
      }
      console.error('로그 조회 오류:', error);
      throw error;
    }

    return {
      success: true,
      data: data
    };

  } catch (error) {
    console.error('getProblemGenerationLog 오류:', error);
    throw error;
  }
}

/**
 * 사용자의 최근 문제 생성 로그 목록 조회
 * @param {string} userId - 사용자 ID
 * @param {Object} options - 조회 옵션
 * @param {number} options.limit - 결과 수 제한 (기본: 20)
 * @param {number} options.offset - 오프셋 (기본: 0)
 * @returns {Promise<Object>} 로그 목록
 */
async function getUserProblemLogs(userId, options = {}) {
  try {
    const { limit = 20, offset = 0 } = options;

    const { data, error, count } = await supabase
      .from('problem_generation_logs')
      .select('id, subject, grade, question_type, question_count, difficulty, status, total_tokens, response_time_ms, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('사용자 로그 목록 조회 오류:', error);
      throw error;
    }

    return {
      success: true,
      data: data,
      total: count,
      limit: limit,
      offset: offset
    };

  } catch (error) {
    console.error('getUserProblemLogs 오류:', error);
    throw error;
  }
}

module.exports = {
  saveProblemGenerationLog,
  getUserProblemStats,
  getGlobalProblemStats,
  getProblemGenerationLog,
  getUserProblemLogs
}; 