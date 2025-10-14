import { supabase } from "@/integrations/supabase/client";
import { RealPDFParser } from "./realPdfParser";
import { toast } from "sonner";

export class AutoCreateQuizService {
  static async createDummy2Quiz(): Promise<string | null> {
    try {
      toast.loading("Checking for existing Dummy-2 quiz...");
      
      // Check if quiz already exists
      const { data: existingQuiz } = await supabase
        .from('quizzes')
        .select('id, title')
        .eq('title', 'Dummy-2 (Dallas ISD)')
        .maybeSingle();

      if (existingQuiz) {
        // Check if it has questions
        const { data: questions } = await supabase
          .from('questions')
          .select('id')
          .eq('quiz_id', existingQuiz.id);

        if (questions && questions.length > 0) {
          toast.dismiss();
          console.log('Dummy-2 quiz already exists with questions:', existingQuiz.id);
          toast.success('Dummy-2 quiz already exists!', {
            duration: 3000,
            action: {
              label: 'Open Direct Link',
              onClick: () => {
                const directUrl = `${window.location.origin}/quiz/${existingQuiz.id}/direct`;
                navigator.clipboard.writeText(directUrl);
                toast.success('Direct link copied to clipboard!');
                window.open(directUrl, '_blank');
              }
            }
          });
          return existingQuiz.id;
        } else {
          // Quiz exists but has 0 questions - delete and recreate
          toast.dismiss();
          toast.loading("Found incomplete quiz, recreating...");
          await supabase.from('quizzes').delete().eq('id', existingQuiz.id);
        }
      }

      toast.dismiss();
      toast.loading("Parsing PDF (this may take up to 2 minutes)...");

      // Parse the PDF from public folder (increased timeout to 120s)
      const parsedQuiz = await Promise.race([
        RealPDFParser.parseQuizFromPDF(
          '/Dummy-2.pdf',
          'Dummy-2 (Dallas ISD)',
          'Dallas ISD Geometry Assessment - Imported from PDF'
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PDF parsing timed out after 2 minutes.')), 120000)
        )
      ]);

      toast.dismiss();
      toast.loading("Creating quiz and uploading images...");

      // Create the quiz with password protection (increased timeout to 120s)
      const quizId = await Promise.race([
        RealPDFParser.createQuizFromParsedData(
          parsedQuiz,
          true, // published
          'Exam2025' // password
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Quiz creation timed out after 2 minutes.')), 120000)
        )
      ]);

      toast.dismiss();
      toast.success(`Created Dummy-2 quiz with ${parsedQuiz.questions.length} questions!`, {
        duration: 5000,
        action: {
          label: 'Open Direct Link',
          onClick: () => {
            const directUrl = `${window.location.origin}/quiz/${quizId}/direct`;
            navigator.clipboard.writeText(directUrl);
            toast.success('Direct link copied to clipboard!');
            window.open(directUrl, '_blank');
          }
        }
      });

      return quizId;
    } catch (error) {
      toast.dismiss();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to create Dummy-2 quiz: ${errorMessage}`);
      console.error('Auto-create quiz error:', error);
      return null;
    }
  }
}