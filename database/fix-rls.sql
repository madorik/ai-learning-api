-- RLS 정책 문제 해결용 SQL 스크립트
-- Supabase SQL Editor에서 실행하세요

-- 1. 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Anyone can insert users" ON users;
DROP POLICY IF EXISTS "Users can manage own question sets" ON question_sets;
DROP POLICY IF EXISTS "Users can manage own questions" ON questions;
DROP POLICY IF EXISTS "Users can manage own gpt responses" ON gpt_responses;
DROP POLICY IF EXISTS "Users can manage own responses" ON user_responses;

-- 2. 개발 환경에서 RLS 임시 비활성화
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE question_sets DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE gpt_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_responses DISABLE ROW LEVEL SECURITY;

-- 3. 또는 모든 작업을 허용하는 정책 생성 (개발용)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for development" ON users FOR ALL USING (true) WITH CHECK (true);

-- 4. 현재 RLS 상태 확인
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'question_sets', 'questions', 'gpt_responses', 'user_responses');

-- 5. 기존 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public';

RAISE NOTICE '✅ RLS 비활성화 완료 - 개발 환경에서 사용하세요';
RAISE NOTICE '⚠️  프로덕션 환경에서는 RLS를 다시 활성화해야 합니다'; 