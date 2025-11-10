import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, Clock, User, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuestionAnswer {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string | null;
  points: number;
  order_index: number;
  has_image: boolean;
  image_url: string | null;
  answer_text: string | null;
  is_correct: boolean | null;
  points_earned: number | null;
  auto_graded_score: number | null;
  requires_manual_review: boolean | null;
}

interface AttemptDetail {
  id: string;
  score: number | null;
  max_score: number | null;
  time_spent: number | null;
  submitted_at: string | null;
  student_name: string | null;
  student_email: string | null;
  quiz_title: string;
  quiz_description: string | null;
  answers: QuestionAnswer[];
}

const QuizResultDetail = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attemptDetail, setAttemptDetail] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (attemptId) {
      fetchAttemptDetail();
    }
  }, [attemptId]);

  const fetchAttemptDetail = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to view results");
        navigate('/auth');
        return;
      }

      // Fetch attempt with quiz details
      const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          quiz_id,
          score,
          max_score,
          time_spent,
          submitted_at,
          student_name,
          student_email
        `)
        .eq('id', attemptId)
        .single();

      if (attemptError) throw attemptError;
      if (!attempt) {
        toast.error("Quiz attempt not found");
        navigate('/admin/results');
        return;
      }

      // Verify user owns this quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('id, title, description, created_by')
        .eq('id', attempt.quiz_id)
        .eq('created_by', user.id)
        .single();

      if (quizError || !quiz) {
        toast.error("You don't have permission to view this result");
        navigate('/admin/results');
        return;
      }

      // Fetch answers with question details
      const { data: answers, error: answersError } = await supabase
        .from('attempt_answers')
        .select(`
          id,
          answer_text,
          is_correct,
          points_earned,
          auto_graded_score,
          requires_manual_review,
          questions (
            id,
            question_text,
            question_type,
            options,
            correct_answer,
            points,
            order_index,
            has_image,
            image_url
          )
        `)
        .eq('attempt_id', attemptId)
        .order('questions(order_index)');

      if (answersError) throw answersError;

      // Transform data
      const transformedAnswers: QuestionAnswer[] = answers?.map(answer => ({
        id: answer.questions.id,
        question_text: answer.questions.question_text,
        question_type: answer.questions.question_type,
        options: answer.questions.options as string[] | null,
        correct_answer: answer.questions.correct_answer,
        points: answer.questions.points,
        order_index: answer.questions.order_index,
        has_image: answer.questions.has_image,
        image_url: answer.questions.image_url,
        answer_text: answer.answer_text,
        is_correct: answer.is_correct,
        points_earned: answer.points_earned || 0,
        auto_graded_score: answer.auto_graded_score,
        requires_manual_review: answer.requires_manual_review
      })) || [];

      setAttemptDetail({
        id: attempt.id,
        score: attempt.score,
        max_score: attempt.max_score,
        time_spent: attempt.time_spent,
        submitted_at: attempt.submitted_at,
        student_name: attempt.student_name,
        student_email: attempt.student_email,
        quiz_title: quiz.title,
        quiz_description: quiz.description,
        answers: transformedAnswers
      });

    } catch (error) {
      console.error('Error fetching attempt detail:', error);
      toast.error("Failed to fetch attempt details");
      navigate('/admin/results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="w-full max-w-md shadow-card">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading results...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!attemptDetail) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="w-full max-w-md shadow-card">
          <CardContent className="p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Result Not Found</h2>
            <p className="text-muted-foreground">The quiz result you're looking for could not be found.</p>
            <Button variant="outline" onClick={() => navigate("/admin/results")}>
              Back to Results
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number | null, total: number | null) => {
    if (!score || !total) return "text-muted-foreground";
    const percentage = (score / total) * 100;
    if (percentage >= 90) return "text-accent";
    if (percentage >= 70) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/results")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Results
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Quiz Result Details</h1>
            <p className="text-muted-foreground">{attemptDetail.quiz_title}</p>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="shadow-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Student Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Student Name</p>
                <p className="text-lg font-semibold">{attemptDetail.student_name || 'Anonymous'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-lg">{attemptDetail.student_email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Score</p>
                <p className={`text-lg font-semibold ${getScoreColor(attemptDetail.score, attemptDetail.max_score)}`}>
                  {attemptDetail.score || 0}/{attemptDetail.max_score || 0}
                  {attemptDetail.max_score && attemptDetail.max_score > 0 && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({(((attemptDetail.score || 0) / attemptDetail.max_score) * 100).toFixed(1)}%)
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time Spent</p>
                <p className="text-lg font-semibold flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatTime(attemptDetail.time_spent)}
                </p>
              </div>
            </div>
            
            {attemptDetail.submitted_at && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Submitted At</p>
                  <p className="text-lg">
                    {new Date(attemptDetail.submitted_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Questions and Answers */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Question Responses ({attemptDetail.answers.length} questions)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {attemptDetail.answers.map((answer, index) => (
              <div key={answer.id} className="border border-border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="secondary">Question {index + 1}</Badge>
                      <Badge variant="outline">{answer.points} points</Badge>
                      {answer.is_correct !== null && (
                        <Badge 
                          className={answer.is_correct ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground"}
                        >
                          {answer.is_correct ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Correct
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Incorrect
                            </>
                          )}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-medium leading-relaxed mb-4">{answer.question_text}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Points Earned</p>
                    <p className="text-lg font-semibold">
                      {answer.points_earned || 0}/{answer.points}
                    </p>
                  </div>
                </div>

                {/* Image if present */}
                {answer.has_image && answer.image_url && (
                  <div className="mb-4">
                    <img 
                      src={answer.image_url} 
                      alt={`Question ${index + 1} diagram`}
                      className="max-w-2xl mx-auto rounded border border-border"
                    />
                  </div>
                )}

                {/* Student's Answer */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Student's Answer:</p>
                  <div className="bg-muted/50 rounded p-3">
                    {answer.answer_text ? (
                      <p className="text-foreground whitespace-pre-wrap">{answer.answer_text}</p>
                    ) : (
                      <p className="text-muted-foreground italic">No answer provided</p>
                    )}
                  </div>
                  {/* Show correct answer for wrong fill-in-blank */}
                  {answer.question_type === 'fill-blank' && !answer.is_correct && answer.correct_answer && (
                    <div className="mt-2 p-3 bg-accent/10 rounded border border-accent/20">
                      <p className="text-sm font-medium text-muted-foreground">Correct Answer:</p>
                      <p className="text-foreground font-medium">{answer.correct_answer}</p>
                    </div>
                  )}
                  
                  {/* Auto-grading info for short answer */}
                  {answer.question_type === 'short-answer' && answer.auto_graded_score !== null && (
                    <div className="mt-2 p-3 bg-primary/5 rounded border border-primary/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Auto-Graded Score:</p>
                          <p className="text-xs text-muted-foreground">Based on keyword matching</p>
                        </div>
                        <Badge variant="outline" className="text-base">
                          {answer.auto_graded_score.toFixed(2)} / {answer.points} pts
                        </Badge>
                      </div>
                      {answer.requires_manual_review && (
                        <div className="mt-2 flex items-start gap-2 text-xs text-warning">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>This answer may require manual review for final grading</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Correct Answer (if available) */}
                {answer.correct_answer && (
                  <div className="space-y-2 mt-4">
                    <p className="text-sm font-medium text-muted-foreground">Correct Answer:</p>
                    <div className="bg-accent/10 rounded p-3">
                      <p className="text-foreground">{answer.correct_answer}</p>
                    </div>
                  </div>
                )}

                {/* Options for multiple choice */}
                {answer.question_type === 'multiple-choice' && answer.options && (
                  <div className="space-y-2 mt-4">
                    <p className="text-sm font-medium text-muted-foreground">Options:</p>
                    <div className="grid gap-2">
                      {answer.options.map((option, optionIndex) => {
                        const letter = String.fromCharCode(65 + optionIndex); // A, B, C, D
                        const isSelected = answer.answer_text === option;
                        const isCorrect = answer.correct_answer === option;
                        
                        return (
                          <div 
                            key={optionIndex}
                            className={`p-2 rounded border ${
                              isSelected && isCorrect ? 'bg-accent/20 border-accent' :
                              isSelected && !isCorrect ? 'bg-destructive/20 border-destructive' :
                              !isSelected && isCorrect ? 'bg-accent/10 border-accent/50' :
                              'bg-background border-border'
                            }`}
                          >
                            <span className="font-mono text-sm mr-2">{letter}.</span>
                            <span>{option}</span>
                            {isSelected && (
                              <Badge className="ml-2">Selected</Badge>
                            )}
                            {isCorrect && (
                              <Badge variant="secondary" className="ml-2">Correct</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuizResultDetail;