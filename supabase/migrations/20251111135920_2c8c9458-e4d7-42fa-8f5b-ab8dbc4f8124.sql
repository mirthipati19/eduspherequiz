-- Add performance indexes for better scalability with concurrent users

-- Index for quiz_attempts lookups by user and quiz
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz 
ON quiz_attempts(user_id, quiz_id);

-- Index for quiz_attempts lookups by quiz (for admin views)
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz 
ON quiz_attempts(quiz_id);

-- Index for attempt_answers lookups by attempt
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt 
ON attempt_answers(attempt_id);

-- Index for questions lookups by quiz with ordering
CREATE INDEX IF NOT EXISTS idx_questions_quiz_order 
ON questions(quiz_id, order_index);

-- Index for faster filtering by quiz status
CREATE INDEX IF NOT EXISTS idx_quizzes_status 
ON quizzes(status);

-- Index for faster access_token lookups (for guest attempts)
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_token 
ON quiz_attempts(access_token) WHERE access_token IS NOT NULL;