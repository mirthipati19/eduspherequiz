import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Award, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuestionResult {
  question_text: string;
  question_type: string;
  your_answer: string;
  correct_answer: string;
  is_correct: boolean;
  points_earned: number;
  max_points: number;
}

const QuizResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [quizTitle, setQuizTitle] = useState("");
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);

  useEffect(() => {
    if (attemptId) {
      fetchResults();
    }
  }, [attemptId]);

  const fetchResults = async () => {
    try {
      // Fetch attempt data
      const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('quiz_id, score, max_score, time_spent, access_token')
        .eq('id', attemptId)
        .maybeSingle();

      if (attemptError || !attempt) {
        toast.error("Failed to load results");
        navigate('/');
        return;
      }

      // Verify access
      if (token && attempt.access_token !== token) {
        toast.error("Invalid access token");
        navigate('/');
        return;
      }

      setScore(attempt.score || 0);
      setMaxScore(attempt.max_score || 0);
      setTimeSpent(attempt.time_spent || 0);

      // Fetch quiz title
      const { data: quiz } = await supabase
        .from('quizzes')
        .select('title')
        .eq('id', attempt.quiz_id)
        .single();

      if (quiz) setQuizTitle(quiz.title);

      // Fetch question results
      const { data: answers, error: answersError } = await supabase
        .from('attempt_answers')
        .select('question_id, answer_text, is_correct, points_earned')
        .eq('attempt_id', attemptId);

      if (answersError) throw answersError;

      // Fetch questions
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_text, question_type, correct_answer, points')
        .eq('quiz_id', attempt.quiz_id);

      if (questionsError) throw questionsError;

      // Combine data
      const questionResults: QuestionResult[] = questions?.map(q => {
        const answer = answers?.find(a => a.question_id === q.id);
        return {
          question_text: q.question_text,
          question_type: q.question_type,
          your_answer: answer?.answer_text || "Not answered",
          correct_answer: q.correct_answer || "",
          is_correct: answer?.is_correct || false,
          points_earned: answer?.points_earned || 0,
          max_points: q.points
        };
      }) || [];

      setResults(questionResults);
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error("Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

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

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-4xl px-6">
        <Button
          variant="outline"
          className="mb-6"
          onClick={() => navigate(token ? '/' : '/student')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Score Summary */}
        <Card className="shadow-card mb-8">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-primary flex items-center justify-center">
              <Award className="h-10 w-10 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl">{quizTitle}</CardTitle>
            <p className="text-muted-foreground">Quiz Results</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">
                {percentage}%
              </div>
              <p className="text-muted-foreground">
                {score} out of {maxScore} points
              </p>
            </div>

            <Progress value={percentage} className="h-4" />

            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-accent/10">
                <div className="text-2xl font-bold text-accent">
                  {results.filter(r => r.is_correct && r.your_answer !== "" && r.your_answer !== "Not answered").length}
                </div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-destructive/10">
                <div className="text-2xl font-bold text-destructive">
                  {results.filter(r => !r.is_correct && r.your_answer !== "" && r.your_answer !== "Not answered").length}
                </div>
                <div className="text-sm text-muted-foreground">Wrong</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-warning/10">
                <div className="text-2xl font-bold text-warning">
                  {results.filter(r => r.your_answer === "" || r.your_answer === "Not answered").length}
                </div>
                <div className="text-sm text-muted-foreground">Unattempted</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-foreground">
                  <Clock className="h-5 w-5 inline mr-1" />
                  {formatTime(timeSpent)}
                </div>
                <div className="text-sm text-muted-foreground">Time Spent</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Results */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Question Details</h2>
          {results.map((result, index) => (
            <Card key={index} className={`shadow-card ${result.is_correct ? 'border-l-4 border-l-accent' : 'border-l-4 border-l-destructive'}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="secondary">Question {index + 1}</Badge>
                      <Badge variant="outline">{result.max_points} points</Badge>
                    </div>
                    <CardTitle className="text-lg">{result.question_text}</CardTitle>
                  </div>
                  {result.is_correct ? (
                    <CheckCircle className="h-6 w-6 text-accent shrink-0 ml-2" />
                  ) : (
                    <XCircle className="h-6 w-6 text-destructive shrink-0 ml-2" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-1">Your Answer:</p>
                  <p className="text-foreground font-medium">{result.your_answer}</p>
                </div>
                {!result.is_correct && result.question_type !== 'short-answer' && (
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="text-sm text-muted-foreground mb-1">Correct Answer:</p>
                    <p className="text-accent font-medium">{result.correct_answer}</p>
                  </div>
                )}
                {result.question_type === 'short-answer' && (
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <p className="text-sm text-warning">
                      This short answer question requires manual grading by your instructor.
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Points Earned:</span>
                  <Badge className={result.is_correct ? "bg-accent" : "bg-destructive"}>
                    {result.points_earned} / {result.max_points}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuizResults;
