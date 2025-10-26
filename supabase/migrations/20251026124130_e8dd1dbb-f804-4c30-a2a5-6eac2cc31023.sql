-- Add support for short-answer question keywords and auto-grading
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS expected_keywords jsonb,
ADD COLUMN IF NOT EXISTS keyword_weightage jsonb;

COMMENT ON COLUMN questions.expected_keywords IS 'Array of expected keywords/phrases for short-answer questions';
COMMENT ON COLUMN questions.keyword_weightage IS 'Object mapping keywords to their scoring weights for auto-grading';

-- Update attempt_answers to support auto-grading scores
ALTER TABLE attempt_answers
ADD COLUMN IF NOT EXISTS auto_graded_score numeric,
ADD COLUMN IF NOT EXISTS requires_manual_review boolean DEFAULT false;