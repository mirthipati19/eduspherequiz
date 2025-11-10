-- Add new columns to favorite_questions table for Question Bank functionality
ALTER TABLE favorite_questions
ADD COLUMN IF NOT EXISTS question_text TEXT,
ADD COLUMN IF NOT EXISTS question_type TEXT CHECK (question_type IN ('multiple-choice', 'fill-blank', 'short-answer')),
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS options TEXT,
ADD COLUMN IF NOT EXISTS correct_answer TEXT;

-- Make question_id nullable since users can now add their own questions
ALTER TABLE favorite_questions
ALTER COLUMN question_id DROP NOT NULL;