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
      
      // Parse each page looking for questions
      for (let pageNum = 2; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .filter((item): item is any => 'str' in item)
          .map((item) => item.str)
          .join(' ');

        // Look for question pattern and extract content more precisely
        const lines = pageText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        // Find question number at start of page
        let questionNum: number | null = null;
        let questionText = '';
        let questionStartIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const questionMatch = line.match(/^\s*(\d+)\.\s*(.*)$/);
          if (questionMatch) {
            questionNum = parseInt(questionMatch[1]);
            questionText = questionMatch[2].trim();
            questionStartIndex = i;
            break;
          }
        }
        
        if (!questionNum || questionStartIndex === -1) continue;
        
        // Collect question text until we hit options (A., B., C., D.) or next question
        for (let i = questionStartIndex + 1; i < lines.length; i++) {
          const line = lines[i];
          // Stop if we hit options or another question number
          if (line.match(/^[A-D]\.\s/) || line.match(/^\s*\d+\.\s/)) {
            break;
          }
          questionText += ' ' + line;
        }
        
        questionText = questionText.trim();
        if (!questionText) continue;

        // Extract options A, B, C, D - more precise matching
        const options: string[] = [];
        for (const letter of ['A', 'B', 'C', 'D']) {
          const optionRegex = new RegExp(`${letter}\\\.\\s*([^A-D]*?)(?=${letter === 'D' ? '$' : '[A-D]\\.|$'})`, 's');
          const optionMatch = pageText.match(optionRegex);
          if (optionMatch) {
            const cleanOption = optionMatch[1].trim().replace(/\s+/g, ' ');
            if (cleanOption && !cleanOption.match(/^\d+\./)) { // Don't include next question numbers
              options.push(cleanOption);
            }
          }
        }

        if (options.length !== 4) {
          console.warn(`Question ${questionNum}: Expected 4 options, found ${options.length}`, options);
          // Continue with available options or use fallback
        }

        // Render page as image (reduced scale for faster processing)
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        const viewport = page.getViewport({ scale: 1.0 });
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        }).promise;

        // Convert canvas to blob
        const imageBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), 'image/png', 0.9);
        });

        questions.push({
          question_text: questionText,
          question_type: 'multiple-choice',
          options: options.length === 4 ? options : ['A', 'B', 'C', 'D'], // Fallback
          correct_answer: '', // Empty string to satisfy NOT NULL constraint
          points: 2,
          order_index: questionNum - 1,
          has_image: true,
          image_data: {
            blob: imageBlob,
            filename: `question_${questionNum}.png`
          }
        });
      }

      if (questions.length === 0) {
        throw new Error('No questions detected in the PDF. Ensure it has selectable text and clearly labeled options (A., B., C., D.).');
      }

      return {
        title: quizTitle || "Dummy-2 (Dallas ISD)",
        description: quizDescription || "Imported geometry assessment from Dallas ISD",
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