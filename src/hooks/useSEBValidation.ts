import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SEBValidationResult {
  valid: boolean;
  error?: string;
  message?: string;
  validated_with?: 'config_key' | 'browser_exam_key';
}

export function useSEBValidation(quizId: string) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateSEB = async () => {
      if (!quizId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First, check if this quiz requires SEB
        const { data: quiz, error: quizError } = await supabase
          .from('quizzes')
          .select('require_seb')
          .eq('id', quizId)
          .single();

        if (quizError) {
          throw new Error('Failed to check quiz requirements');
        }

        // If SEB is not required, validation passes
        if (!quiz?.require_seb) {
          setIsValid(true);
          setLoading(false);
          return;
        }

        // SEB is required - check if we're in SEB environment
        const isSEBEnvironment = 
          navigator.userAgent.includes('SEB') ||
          // @ts-ignore - SEB specific properties
          window.sebHost !== undefined ||
          // @ts-ignore
          window.SafeExamBrowser !== undefined;

        if (!isSEBEnvironment) {
          // SEB required but not present
          setIsValid(false);
          setError('This quiz requires Safe Exam Browser. Please open the quiz using the provided .seb configuration file.');
          setLoading(false);
          return;
        }

        // We're in SEB - validate the session
        const currentUrl = window.location.href;
        
        const { data, error: sebError } = await supabase.functions.invoke('seb-validate', {
          body: { 
            quizId, 
            requestUrl: currentUrl 
          }
        });

        if (sebError) {
          throw new Error(sebError.message);
        }

        const result = data as SEBValidationResult;
        
        if (result.valid) {
          setIsValid(true);
        } else {
          setIsValid(false);
          setError(result.message || result.error || 'SEB validation failed. Please ensure you are using the correct .seb configuration file.');
        }
      } catch (err) {
        console.error('SEB validation error:', err);
        setIsValid(false);
        setError(err instanceof Error ? err.message : 'Failed to validate SEB session');
      } finally {
        setLoading(false);
      }
    };

    validateSEB();
  }, [quizId]);

  return {
    isValid,
    loading,
    error,
    retry: () => {
      setLoading(true);
      setError(null);
      // Re-trigger validation
      window.location.reload();
    }
  };
}

export function createQuizLaunchUrl(quizId: string, studentData?: { name?: string; email?: string }) {
  return supabase.functions.invoke('quiz-launch', {
    body: {
      quizId,
      studentName: studentData?.name,
      studentEmail: studentData?.email,
      userId: null // For anonymous access
    }
  });
}