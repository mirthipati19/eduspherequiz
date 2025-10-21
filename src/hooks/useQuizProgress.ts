import { useState, useEffect } from 'react';

interface QuizProgress {
  attemptId: string;
  quizId: string;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  flaggedQuestions: string[];
  timeRemaining: number;
  lastSaved: number;
}

const STORAGE_KEY = 'quiz_progress';
const SAVE_INTERVAL = 5000; // Save every 5 seconds

export function useQuizProgress(attemptId: string | null, quizId: string | null) {
  const [progress, setProgress] = useState<QuizProgress | null>(null);

  // Load progress from localStorage on mount
  useEffect(() => {
    if (!attemptId || !quizId) return;

    const stored = localStorage.getItem(`${STORAGE_KEY}_${attemptId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.attemptId === attemptId && parsed.quizId === quizId) {
          setProgress(parsed);
        }
      } catch (error) {
        console.error('Failed to parse stored progress:', error);
      }
    }
  }, [attemptId, quizId]);

  // Save progress to localStorage
  const saveProgress = (data: Partial<QuizProgress>) => {
    if (!attemptId || !quizId) return;

    const newProgress: QuizProgress = {
      attemptId,
      quizId,
      currentQuestionIndex: data.currentQuestionIndex ?? progress?.currentQuestionIndex ?? 0,
      answers: data.answers ?? progress?.answers ?? {},
      flaggedQuestions: data.flaggedQuestions ?? progress?.flaggedQuestions ?? [],
      timeRemaining: data.timeRemaining ?? progress?.timeRemaining ?? 0,
      lastSaved: Date.now()
    };

    setProgress(newProgress);
    localStorage.setItem(`${STORAGE_KEY}_${attemptId}`, JSON.stringify(newProgress));
  };

  // Clear progress from localStorage
  const clearProgress = () => {
    if (!attemptId) return;
    localStorage.removeItem(`${STORAGE_KEY}_${attemptId}`);
    setProgress(null);
  };

  return {
    progress,
    saveProgress,
    clearProgress
  };
}
