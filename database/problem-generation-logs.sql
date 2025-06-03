-- 문제 생성 로그 테이블
-- 사용자의 문제 생성 요청과 GPT 응답을 저장하는 테이블

-- 1. 문제 생성 로그 테이블
CREATE TABLE IF NOT EXISTS problem_generation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- null 허용 (익명 사용자)
  
  -- 요청 정보
  request_data JSONB NOT NULL, -- 요청 파라미터 (subject, grade, questionType, etc.)
  
  -- GPT 응답 정보  
  response_data JSONB NOT NULL, -- GPT가 생성한 문제 데이터
  raw_response TEXT, -- GPT 원본 응답 (디버깅용)
  
  -- 메타데이터
  model_used VARCHAR(100) DEFAULT 'gpt-4o-mini',
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  response_time_ms INTEGER, -- 응답 시간 (밀리초)
  
  -- 상태 정보
  status VARCHAR(50) DEFAULT 'success', -- success, error, timeout
  error_message TEXT, -- 오류 발생 시 메시지
  
  -- API 정보
  api_endpoint VARCHAR(100), -- /api/generate-problems 또는 /api/generate-problems-stream
  user_agent TEXT, -- 클라이언트 정보
  ip_address INET, -- 요청자 IP
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 검색을 위한 추가 필드 (request_data에서 추출)
  subject VARCHAR(100), -- 과목
  grade INTEGER, -- 학년
  question_type VARCHAR(100), -- 문제 유형
  question_count INTEGER, -- 문제 수
  difficulty VARCHAR(50), -- 난이도
  include_explanation BOOLEAN -- 해설 포함 여부
);

-- 2. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_problem_logs_user_id ON problem_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_problem_logs_created_at ON problem_generation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_problem_logs_status ON problem_generation_logs(status);
CREATE INDEX IF NOT EXISTS idx_problem_logs_subject_grade ON problem_generation_logs(subject, grade);
CREATE INDEX IF NOT EXISTS idx_problem_logs_model ON problem_generation_logs(model_used);

-- JSONB 컬럼에 대한 GIN 인덱스 (빠른 검색을 위해)
CREATE INDEX IF NOT EXISTS idx_problem_logs_request_data_gin ON problem_generation_logs USING GIN (request_data);
CREATE INDEX IF NOT EXISTS idx_problem_logs_response_data_gin ON problem_generation_logs USING GIN (response_data);

-- 3. RLS (Row Level Security) 정책 설정
ALTER TABLE problem_generation_logs ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Users can view own problem logs" ON problem_generation_logs;
DROP POLICY IF EXISTS "Anyone can insert problem logs" ON problem_generation_logs;

-- 사용자는 자신의 로그만 조회 가능 (익명 사용자 제외)
CREATE POLICY "Users can view own problem logs" ON problem_generation_logs 
  FOR SELECT USING (
    user_id IS NULL OR 
    auth.uid()::text = (SELECT social_id FROM users WHERE id = user_id)
  );

-- 로그 생성은 누구나 가능 (익명 사용자 포함)
CREATE POLICY "Anyone can insert problem logs" ON problem_generation_logs 
  FOR INSERT WITH CHECK (true);

-- 4. 통계 조회를 위한 뷰 생성
CREATE OR REPLACE VIEW problem_generation_stats AS
SELECT 
  subject,
  grade,
  difficulty,
  COUNT(*) as generation_count,
  AVG(total_tokens) as avg_tokens,
  AVG(response_time_ms) as avg_response_time_ms,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
  DATE_TRUNC('day', created_at) as date
FROM problem_generation_logs
GROUP BY subject, grade, difficulty, DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- 5. 사용자별 통계 뷰
CREATE OR REPLACE VIEW user_problem_generation_stats AS
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  COUNT(pgl.*) as total_generations,
  SUM(pgl.total_tokens) as total_tokens_used,
  AVG(pgl.response_time_ms) as avg_response_time_ms,
  COUNT(CASE WHEN pgl.status = 'success' THEN 1 END) as success_count,
  COUNT(CASE WHEN pgl.status = 'error' THEN 1 END) as error_count,
  MAX(pgl.created_at) as last_generation_at
FROM users u
LEFT JOIN problem_generation_logs pgl ON u.id = pgl.user_id
GROUP BY u.id, u.email, u.name;

-- 6. 데이터 정리를 위한 함수 (선택사항)
CREATE OR REPLACE FUNCTION cleanup_old_problem_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM problem_generation_logs 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 사용 예시:
-- SELECT cleanup_old_problem_logs(90); -- 90일 이전 로그 삭제 