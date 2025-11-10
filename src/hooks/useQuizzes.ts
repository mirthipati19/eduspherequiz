import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  status: 'draft' | 'published' | 'archived';
  allow_multiple_attempts: boolean;
  shuffle_questions: boolean;
  show_results_immediately: boolean;
  password_protected: boolean;
  access_password: string | null;
  require_seb: boolean;
  seb_config_key: string | null;
  seb_browser_exam_key: string | null;
  seb_quit_url: string | null;
  max_attempts: number | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: 'multiple-choice' | 'fill-blank' | 'short-answer';
  options: any;
  correct_answer: string | null;
  points: number;
  order_index: number;
  has_image: boolean;
  image_url: string | null;
  expected_keywords?: any;
  keyword_weightage?: any;
  created_at: string;
  updated_at: string;
}

export interface CreateQuizData {
  title: string;
  description?: string;
  duration: number;
  status?: 'draft' | 'published' | 'archived';
  allow_multiple_attempts: boolean;
  shuffle_questions: boolean;
  show_results_immediately: boolean;
  password_protected?: boolean;
  access_password?: string | null;
  max_attempts?: number;
  require_seb?: boolean;
  seb_config_key?: string;
  seb_browser_exam_key?: string;
  seb_quit_url?: string;
}

export interface CreateQuestionData {
  quiz_id: string;
  question_text: string;
  question_type: 'multiple-choice' | 'fill-blank' | 'short-answer';
  options?: string[];
  correct_answer?: string;
  points: number;
  order_index: number;
  has_image?: boolean;
  image_url?: string;
}

export function useQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuizzes(data || []);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const createQuiz = async (quizData: CreateQuizData): Promise<Quiz | null> => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        toast.error("You must be logged in to create a quiz");
        return null;
      }

      // Verify admin role
      const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
        _user_id: userData.user.id,
        _role: 'admin'
      });

      if (roleError || !hasAdminRole) {
        toast.error("Admin access required to create quizzes");
        return null;
      }

      const insertData = { 
        ...quizData, 
        created_by: userData.user.id,
        status: quizData.status || 'draft' as const
      };

      const { data, error } = await supabase
        .from('quizzes')
        .insert([insertData])
        .select('id, title, status, created_at')
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error("Quiz created but hidden due to permissions");
        return null;
      }
      
      await fetchQuizzes();
      toast.success('Quiz created successfully!');
      return data as Quiz;
    } catch (error) {
      console.error('Error creating quiz:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to create quiz: ${message}`);
      return null;
    }
  };

  const updateQuiz = async (id: string, updates: Partial<CreateQuizData>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      setQuizzes(prev => prev.map(quiz => 
        quiz.id === id ? { ...quiz, ...updates } : quiz
      ));
      toast.success('Quiz updated successfully!');
      return true;
    } catch (error) {
      console.error('Error updating quiz:', error);
      toast.error('Failed to update quiz');
      return false;
    }
  };

  const deleteQuiz = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setQuizzes(prev => prev.filter(quiz => quiz.id !== id));
      toast.success('Quiz deleted successfully!');
      return true;
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error('Failed to delete quiz');
      return false;
    }
  };

  const publishQuiz = async (id: string, status: 'published' | 'draft' = 'published'): Promise<boolean> => {
    try {
      console.log(`Publishing quiz ${id} with status ${status}`);
      
      const { error } = await supabase
        .from('quizzes')
        .update({ status })
        .eq('id', id);

      if (error) {
        console.error('Supabase error updating quiz status:', error);
        throw error;
      }
      
      console.log('Quiz status updated successfully');
      await fetchQuizzes();
      toast.success(`Quiz ${status === 'published' ? 'published' : 'unpublished'} successfully!`);
      return true;
    } catch (error) {
      console.error('Error updating quiz status:', error);
      toast.error(`Failed to ${status === 'published' ? 'publish' : 'unpublish'} quiz: ${(error as any)?.message || 'Unknown error'}`);
      return false;
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  return {
    quizzes,
    loading,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    publishQuiz,
    refetch: fetchQuizzes
  };
}

export function useQuizQuestions(quizId: string) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = async () => {
    if (!quizId) return;
    
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setQuestions(data as Question[] || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const createQuestion = async (questionData: CreateQuestionData): Promise<Question | null> => {
    try {
      const insertData = {
        ...questionData,
        correct_answer: questionData.correct_answer || ''
      };
      
      const { data, error } = await supabase
        .from('questions')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      
      setQuestions(prev => [...prev, data as Question].sort((a, b) => a.order_index - b.order_index));
      toast.success('Question added successfully!');
      return data as Question;
    } catch (error) {
      console.error('Error creating question:', error);
      toast.error('Failed to create question');
      return null;
    }
  };

  const updateQuestion = async (id: string, updates: Partial<CreateQuestionData>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      setQuestions(prev => prev.map(question => 
        question.id === id ? { ...question, ...updates } : question
      ));
      return true;
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error('Failed to update question');
      return false;
    }
  };

  const deleteQuestion = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setQuestions(prev => prev.filter(question => question.id !== id));
      toast.success('Question deleted successfully!');
      return true;
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
      return false;
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [quizId]);

  return {
    questions,
    loading,
    fetchQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    refetch: fetchQuestions
  };
}