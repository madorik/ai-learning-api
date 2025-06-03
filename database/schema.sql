-- AI Learning Platform Database Schema
-- Supabase에서 이 SQL을 실행하세요

-- 0. UUID 확장 활성화 (Supabase에서는 기본 활성화됨)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 사용자 테이블 (UUID 기본키 사용)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  social_id VARCHAR(255) NOT NULL,
  social_provider VARCHAR(50) NOT NULL DEFAULT 'google',
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 소셜 ID와 제공자 조합으로 유니크 제약 조건
  UNIQUE(social_id, social_provider)
);

-- 2. 문제지 템플릿 테이블 (user_id를 UUID로 참조)
CREATE TABLE IF NOT EXISTS question_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT '문제지',
  subject VARCHAR(100) NOT NULL, -- 과목 (수학, 국어, 영어 등)
  grade INTEGER NOT NULL, -- 학년 (1-6)
  question_type VARCHAR(100) NOT NULL DEFAULT '교과과정', -- 문제 유형
  question_count INTEGER NOT NULL DEFAULT 10, -- 문제 수 (5, 10, 20, 30)
  difficulty VARCHAR(50) NOT NULL DEFAULT '보통', -- 난이도 (쉬움, 보통, 어려움)
  estimated_time INTEGER DEFAULT 15, -- 예상 풀이 시간 (분)
  has_explanation BOOLEAN DEFAULT false, -- 해설 포함 여부
  status VARCHAR(50) DEFAULT 'draft', -- 상태 (draft, generating, completed, failed)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 생성된 문제들 테이블 (question_set_id를 UUID로 참조)
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_set_id UUID REFERENCES question_sets(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL, -- 문제 번호 (1, 2, 3...)
  question_text TEXT NOT NULL, -- 문제 내용
  question_type VARCHAR(100), -- 문제 유형 (객관식, 주관식, 서술형 등)
  options JSONB, -- 객관식 선택지 (JSON 배열)
  correct_answer TEXT NOT NULL, -- 정답
  explanation TEXT, -- 해설
  difficulty_score INTEGER DEFAULT 3, -- 난이도 점수 (1-5)
  estimated_time INTEGER DEFAULT 2, -- 예상 풀이 시간 (분)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. GPT 응답 로그 테이블 (UUID 외래키 사용)
CREATE TABLE IF NOT EXISTS gpt_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_set_id UUID REFERENCES question_sets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL, -- GPT에 보낸 프롬프트
  response_text TEXT NOT NULL, -- GPT 응답 원문
  model_used VARCHAR(100) DEFAULT 'gpt-4o-mini', -- 사용된 모델
  tokens_used INTEGER, -- 사용된 토큰 수
  response_time DECIMAL(10,3), -- 응답 시간 (초)
  status VARCHAR(50) DEFAULT 'success', -- 응답 상태
  error_message TEXT, -- 오류 메시지 (실패 시)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 사용자 응답/결과 테이블 (UUID 외래키 사용)
CREATE TABLE IF NOT EXISTS user_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  question_set_id UUID REFERENCES question_sets(id) ON DELETE CASCADE,
  user_answer TEXT, -- 사용자가 제출한 답안
  is_correct BOOLEAN, -- 정답 여부
  time_taken INTEGER, -- 소요 시간 (초)
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 인덱스 생성 (성능 최적화) - UUID에 최적화
CREATE INDEX IF NOT EXISTS idx_users_social_id_provider ON users(social_id, social_provider);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_social_provider ON users(social_provider);
CREATE INDEX IF NOT EXISTS idx_question_sets_user_id ON question_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_question_sets_status ON question_sets(status);
CREATE INDEX IF NOT EXISTS idx_questions_question_set_id ON questions(question_set_id);
CREATE INDEX IF NOT EXISTS idx_gpt_responses_question_set_id ON gpt_responses(question_set_id);
CREATE INDEX IF NOT EXISTS idx_gpt_responses_user_id ON gpt_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_responses_user_id ON user_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_responses_question_set_id ON user_responses(question_set_id);

-- 7. RLS (Row Level Security) 정책 설정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gpt_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_responses ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Anyone can insert users" ON users;
DROP POLICY IF EXISTS "Users can manage own question sets" ON question_sets;
DROP POLICY IF EXISTS "Users can manage own questions" ON questions;
DROP POLICY IF EXISTS "Users can manage own gpt responses" ON gpt_responses;
DROP POLICY IF EXISTS "Users can manage own responses" ON user_responses;

-- 새로운 RLS 정책: 사용자 테이블
-- 모든 사용자가 자신의 데이터만 조회/수정 가능
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = social_id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = social_id);

-- 새로운 사용자 생성은 누구나 가능 (OAuth 로그인 시)
CREATE POLICY "Anyone can insert users" ON users FOR INSERT WITH CHECK (true);

-- 다른 테이블들의 정책 (UUID 사용)
CREATE POLICY "Users can manage own question sets" ON question_sets FOR ALL USING (auth.uid()::text = (SELECT social_id FROM users WHERE id = user_id));
CREATE POLICY "Users can manage own questions" ON questions FOR ALL USING (auth.uid()::text = (SELECT u.social_id FROM users u JOIN question_sets qs ON u.id = qs.user_id WHERE qs.id = question_set_id));
CREATE POLICY "Users can manage own gpt responses" ON gpt_responses FOR ALL USING (auth.uid()::text = (SELECT social_id FROM users WHERE id = user_id));
CREATE POLICY "Users can manage own responses" ON user_responses FOR ALL USING (auth.uid()::text = (SELECT social_id FROM users WHERE id = user_id));

-- 8. 트리거 함수 - updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 적용
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_question_sets_updated_at BEFORE UPDATE ON question_sets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. 데이터 마이그레이션 (기존 BIGINT ID를 UUID로 변경)
-- ⚠️ 주의: 이 마이그레이션은 기존 데이터가 있는 경우 신중히 실행하세요
DO $$
DECLARE
    has_data BOOLEAN := FALSE;
BEGIN
    -- 기존 테이블에 데이터가 있는지 확인
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'users') INTO has_data;
    
    IF has_data THEN
        -- 기존 테이블이 있고 데이터가 있는 경우
        IF EXISTS(SELECT 1 FROM users LIMIT 1) THEN
            RAISE NOTICE '⚠️  기존 사용자 데이터가 발견되었습니다.';
            RAISE NOTICE '🔄 UUID 마이그레이션은 수동으로 진행해야 합니다.';
            RAISE NOTICE '📝 기존 데이터 백업 후 새 스키마로 마이그레이션하세요.';
        ELSE
            RAISE NOTICE '✅ 빈 테이블 발견, UUID 스키마 적용 완료';
        END IF;
    ELSE
        RAISE NOTICE '✅ 새로운 설치, UUID 스키마 적용 완료';
    END IF;
    
    -- UUID 기본값 함수가 있는지 확인
    IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'uuid_generate_v4') THEN
        RAISE NOTICE '⚠️  uuid-ossp 확장이 필요합니다. CREATE EXTENSION "uuid-ossp"; 실행하세요.';
    END IF;
END $$;

-- 10. 샘플 데이터 생성 함수 (개발/테스트용)
CREATE OR REPLACE FUNCTION create_sample_user(
    p_social_id VARCHAR(255),
    p_email VARCHAR(255),
    p_name VARCHAR(255),
    p_provider VARCHAR(50) DEFAULT 'google'
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    INSERT INTO users (social_id, social_provider, email, name)
    VALUES (p_social_id, p_provider, p_email, p_name)
    RETURNING id INTO new_user_id;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

-- 사용 예시:
-- SELECT create_sample_user('google-123456', 'test@example.com', 'Test User', 'google'); 