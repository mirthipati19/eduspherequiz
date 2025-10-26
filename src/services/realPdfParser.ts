import { supabase } from "@/integrations/supabase/client";
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { toast } from "sonner";

// Configure local PDF.js worker (avoids CDN/CORS issues)
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc as unknown as string;

export interface ParsedQuestion {
  question_text: string;
  question_type: 'multiple-choice';
  options: string[];
  correct_answer: string | null;
  points: number;
  order_index: number;
  has_image: boolean;
  image_data?: {
    blob: Blob;
    filename: string;
  };
}

export interface ParsedQuiz {
  title: string;
  description: string;
  duration: number;
  questions: ParsedQuestion[];
}

export class RealPDFParser {
  static async parseQuizFromPDF(
    pdfFile: File | string,
    quizTitle?: string,
    quizDescription?: string
  ): Promise<ParsedQuiz> {
    try {
      let pdfData: ArrayBuffer;
      
      if (typeof pdfFile === 'string') {
        // URL to PDF file
        const response = await fetch(pdfFile);
        pdfData = await response.arrayBuffer();
      } else {
        // File object
        pdfData = await pdfFile.arrayBuffer();
      }

      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const questions: ParsedQuestion[] = [];
      let allText = '';
      
      // Extract all text from PDF first
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .filter((item): item is any => 'str' in item)
          .map((item) => item.str)
          .join(' ');
        allText += pageText + '\n';
      }

      // Enhanced pattern to match questions with format:
      // 1. Question text
      //  A. option
      //  B. option
      //  C. option
      //  D. option
      //  Answer: A
      
      // First, split by question numbers to handle line breaks better
      const questionBlocks = allText.split(/(?=^\d+\.\s)/m);
      
      for (const block of questionBlocks) {
        if (!block.trim()) continue;
        
        // Extract question number
        const numMatch = block.match(/^(\d+)\./);
        if (!numMatch) continue;
        
        const questionNum = numMatch[1];
        
        // Extract question text (everything between number and first option)
        const questionTextMatch = block.match(/^\d+\.\s*(.+?)(?=\s*[A-D]\.|$)/s);
        if (!questionTextMatch) continue;
        
        const questionText = questionTextMatch[1].trim().replace(/\s+/g, ' ');
        
        // Extract options A-D (more flexible with whitespace and line breaks)
        const optionA = block.match(/[A][\.\)]\s*(.+?)(?=\s*[B][\.\)]|Answer|$)/s)?.[1]?.trim().replace(/\s+/g, ' ') || '';
        const optionB = block.match(/[B][\.\)]\s*(.+?)(?=\s*[C][\.\)]|Answer|$)/s)?.[1]?.trim().replace(/\s+/g, ' ') || '';
        const optionC = block.match(/[C][\.\)]\s*(.+?)(?=\s*[D][\.\)]|Answer|$)/s)?.[1]?.trim().replace(/\s+/g, ' ') || '';
        const optionD = block.match(/[D][\.\)]\s*(.+?)(?=\s*(?:Answer|Correct|\d+\.)|$)/s)?.[1]?.trim().replace(/\s+/g, ' ') || '';
        
        const options = [optionA, optionB, optionC, optionD];
        
        // Validate we got good data
        if (!questionText || options.some(opt => !opt || opt.length < 1)) {
          console.warn(`Skipping question ${questionNum} - incomplete data`);
          continue;
        }
        
        // Extract answer (look for "Answer: A" or "Answer:A" or "Correct: B")
        const answerMatch = block.match(/(?:Answer|Correct)\s*:?\s*([A-D])/i);
        
        let correctAnswer = '';
        if (answerMatch) {
          const answerLetter = answerMatch[1].toUpperCase();
          const answerIndex = answerLetter.charCodeAt(0) - 'A'.charCodeAt(0);
          if (answerIndex >= 0 && answerIndex < options.length) {
            correctAnswer = options[answerIndex];
          }
        }
        
        questions.push({
          question_text: questionText,
          question_type: 'multiple-choice',
          options: options,
          correct_answer: correctAnswer || options[0], // Default to first option if no answer found
          points: 1,
          order_index: parseInt(questionNum) - 1,
          has_image: false
        });
      }

      if (questions.length === 0) {
        throw new Error('No questions detected in the PDF. Ensure the PDF contains questions in format: "1. Question text A. option B. option C. option D. option"');
      }

      console.log(`Successfully extracted ${questions.length} questions from PDF`);

      return {
        title: quizTitle || "Imported Quiz",
        description: quizDescription || "Quiz imported from PDF",
        duration: 90,
        questions: questions.sort((a, b) => a.order_index - b.order_index)
      };
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async uploadQuizImage(
    quizId: string, 
    questionIndex: number, 
    imageBlob: Blob, 
    filename: string
  ): Promise<string> {
    const fileName = `quiz-${quizId}/question-${questionIndex}.png`;
    
    const { data, error } = await supabase.storage
      .from('quiz-images')
      .upload(fileName, imageBlob, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error('Error uploading image:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('quiz-images')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  static async createQuizFromParsedData(
    parsedQuiz: ParsedQuiz,
    isPublished: boolean = true,
    password?: string
  ): Promise<string> {
    try {
      toast.loading('Creating quiz...');
      
      // Create quiz in database
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: parsedQuiz.title,
          description: parsedQuiz.description,
          duration: parsedQuiz.duration,
          status: isPublished ? 'published' : 'draft',
          password_protected: !!password,
          access_password: password,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (quizError) throw quizError;
      if (!quiz) throw new Error('Failed to create quiz');

      toast.dismiss();
      toast.loading(`Inserting ${parsedQuiz.questions.length} questions...`);

      // Insert questions WITHOUT images first (for speed)
      const questionsToInsert = parsedQuiz.questions.map(question => ({
        quiz_id: quiz.id,
        question_text: question.question_text,
        question_type: question.question_type,
        options: question.options,
        correct_answer: question.correct_answer || '',
        points: question.points,
        order_index: question.order_index,
        has_image: question.has_image,
        image_url: null // Will be updated after upload
      }));

      const { data: insertedQuestions, error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert)
        .select('id, order_index');

      if (questionsError) {
        toast.dismiss();
        toast.error(`Questions insert failed: ${questionsError.message}`);
        throw questionsError;
      }

      if (!insertedQuestions || insertedQuestions.length === 0) {
        toast.dismiss();
        toast.error('No questions were created');
        throw new Error('No questions were created');
      }

      toast.dismiss();
      toast.loading('Uploading images in background...');

      // Upload images and patch questions in parallel (non-blocking)
      const imageUploadPromises = parsedQuiz.questions.map(async (question, index) => {
        if (!question.has_image || !question.image_data) return;

        const insertedQuestion = insertedQuestions.find(q => q.order_index === question.order_index);
        if (!insertedQuestion) return;

        try {
          const imageUrl = await this.uploadQuizImage(
            quiz.id,
            index,
            question.image_data.blob,
            question.image_data.filename
          );

          await supabase
            .from('questions')
            .update({ image_url: imageUrl })
            .eq('id', insertedQuestion.id);
        } catch (error) {
          console.error(`Failed to upload/patch image for question ${index}:`, error);
        }
      });

      // Wait for all uploads to complete
      await Promise.allSettled(imageUploadPromises);

      toast.dismiss();
      return quiz.id;
    } catch (error) {
      toast.dismiss();
      console.error('Quiz creation error:', error);
      throw error;
    }
  }
}