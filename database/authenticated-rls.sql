-- 인증된 사용자용 RLS 정책 설정
-- Supabase SQL Editor에서 실행하세요

-- 1. 먼저 기존 정책들 모두 삭제
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Anyone can insert users" ON users;
DROP POLICY IF EXISTS "Users can manage own question sets" ON question_sets;
DROP POLICY IF EXISTS "Users can manage own questions" ON questions;
DROP POLICY IF EXISTS "Users can manage own gpt responses" ON gpt_responses;
DROP POLICY IF EXISTS "Users can manage own responses" ON user_responses;
DROP POLICY IF EXISTS "Allow all for development" ON users;
DROP POLICY IF EXISTS "Allow all for development" ON question_sets;
DROP POLICY IF EXISTS "Allow all for development" ON questions;
DROP POLICY IF EXISTS "Allow all for development" ON gpt_responses;
DROP POLICY IF EXISTS "Allow all for development" ON user_responses;

-- 2. RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gpt_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_responses ENABLE ROW LEVEL SECURITY;

-- 3. 인증된 사용자용 정책 생성

-- Users 테이블: 인증된 사용자만 SELECT/INSERT/UPDATE 가능
CREATE POLICY "authenticated_users_select" ON users 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_insert" ON users 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_update" ON users 
FOR UPDATE USING (auth.role() = 'authenticated');

-- Question Sets 테이블: 인증된 사용자만 모든 작업 가능, 자신의 데이터만
CREATE POLICY "authenticated_users_question_sets" ON question_sets 
FOR ALL USING (
  auth.role() = 'authenticated' AND 
  user_id IN (SELECT id FROM users WHERE auth.uid()::text = social_id)
);

-- Questions 테이블: 인증된 사용자만 모든 작업 가능, 자신의 문제지에 속한 문제만
CREATE POLICY "authenticated_users_questions" ON questions 
FOR ALL USING (
  auth.role() = 'authenticated' AND 
  question_set_id IN (
    SELECT id FROM question_sets 
    WHERE user_id IN (SELECT id FROM users WHERE auth.uid()::text = social_id)
  )
);

-- GPT Responses 테이블: 인증된 사용자만 모든 작업 가능, 자신의 응답만
CREATE POLICY "authenticated_users_gpt_responses" ON gpt_responses 
FOR ALL USING (
  auth.role() = 'authenticated' AND 
  user_id IN (SELECT id FROM users WHERE auth.uid()::text = social_id)
);

-- User Responses 테이블: 인증된 사용자만 모든 작업 가능, 자신의 응답만
CREATE POLICY "authenticated_users_user_responses" ON user_responses 
FOR ALL USING (
  auth.role() = 'authenticated' AND 
  user_id IN (SELECT id FROM users WHERE auth.uid()::text = social_id)
);

-- 4. 정책 확인
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. RLS 상태 확인
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'question_sets', 'questions', 'gpt_responses', 'user_responses')
ORDER BY tablename;

-- 6. 현재 사용자 정보 확인 함수 생성
CREATE OR REPLACE FUNCTION get_current_user_info()
RETURNS TABLE(
  user_role text,
  user_id text,
  is_authenticated boolean
) AS $$
BEGIN
  RETURN QUERY SELECT 
    auth.role()::text as user_role,
    auth.uid()::text as user_id,
    (auth.role() = 'authenticated') as is_authenticated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용 예시: SELECT * FROM get_current_user_info();

RAISE NOTICE '✅ 인증된 사용자용 RLS 정책 설정 완료';
RAISE NOTICE '🔐 인증된 사용자만 데이터에 접근할 수 있습니다';
RAISE NOTICE '📝 각 사용자는 자신의 데이터만 관리할 수 있습니다'; 