import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Clock, AlertCircle, ChevronLeft, ChevronRight, Flag, Check, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useQuizzes } from "@/hooks/useQuizzes";
import ImageZoom from "./ImageZoom";
import { toast } from "sonner";

interface Question {
  id: string;
  question_text: string;
  question_type: "multiple-choice" | "fill-blank" | "short-answer";
  options: string[] | null;
  has_image: boolean;
  image_url: string | null;
  points: number;
  order_index: number;
}

interface QuizData {
  id: string;
  title: string;
  description: string;
  duration: number;
  questions: Question[];
}

const QuizTaking = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(3600);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (quizId) {
      fetchQuizData();
    }
  }, [quizId]);

  // Timer effect - must be before any early returns
  useEffect(() => {
    if (!loading && quizData && quizData.questions.length > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [loading, quizData]);

  const fetchQuizData = async () => {
    try {
      // Fetch quiz details
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('id, title, description, duration, status')
        .eq('id', quizId)
        .maybeSingle();

      if (quizError) throw quizError;
      if (!quiz) {
        console.warn('Quiz not found or not available', { quizId });
        toast.error('Quiz not found or not available');
        navigate(`/quiz/${quizId}/direct`);
        return;
      }

      // Check if quiz is published or if user is the creator
      if (quiz.status !== 'published') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Quiz not available");
          navigate('/auth');
          return;
        }
      }

      // Fetch questions
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index');

      if (questionsError) throw questionsError;

      setQuizData({
        ...quiz,
        questions: questions?.map(q => ({
          ...q,
          options: q.options ? (q.options as string[]) : null
        })) || []
      });

      setTimeRemaining(quiz.duration * 60); // Convert minutes to seconds

      // Create or find attempt
      if (token) {
        // Anonymous attempt with token
        const { data: attempt, error: attemptError } = await supabase
          .from('quiz_attempts')
          .select('id')
          .eq('quiz_id', quizId)
          .eq('access_token', token)
          .maybeSingle();

        if (attemptError || !attempt) {
          console.warn('Invalid or expired quiz access token', { quizId, token });
          toast.error("Invalid or expired access link");
          navigate(`/quiz/${quizId}/direct`);
          return;
        }
        setAttemptId(attempt.id);
      } else {
        // Authenticated user attempt
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.info('Unauthenticated user attempting to take quiz; redirecting to direct access', { quizId });
          navigate(`/quiz/${quizId}/direct`);
          return;
        }

        const { data: attempt, error: attemptError } = await supabase
          .from('quiz_attempts')
          .insert({
            quiz_id: quizId,
            user_id: user.id,
            status: 'in_progress'
          })
          .select()
          .single();

        if (attemptError) throw attemptError;
        setAttemptId(attempt.id);
      }

    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast.error("Failed to load quiz");
      navigate('/');
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
              <p className="text-muted-foreground">Loading quiz...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quizData) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="w-full max-w-md shadow-card">
          <CardContent className="p-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">Quiz Not Found</h2>
              <p className="text-muted-foreground mb-4">The quiz you're looking for is not available.</p>
              <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (quizData.questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="w-full max-w-md shadow-card">
          <CardContent className="p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold text-foreground">No Questions Available</h2>
            <p className="text-muted-foreground">This quiz doesn't have any questions yet.</p>
            <Button variant="outline" onClick={() => navigate(`/quiz/${quizData.id}/direct`)}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quizData.questions.length) * 100;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleFlagQuestion = (questionId: string) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!attemptId || !quizData) return;
    
    setIsSubmitting(true);
    
    try {
      // Calculate grade
      let totalScore = 0;
      let maxScore = 0;
      
      // First, fetch questions with correct answers for grading
      const { data: questionsWithAnswers, error: questionsError } = await supabase
        .from('questions')
        .select('id, correct_answer, points, question_type')
        .eq('quiz_id', quizId);

      if (questionsError) throw questionsError;

      // Save all answers with grading
      const answerData = Object.entries(answers).map(([questionId, answer]) => {
        const question = questionsWithAnswers?.find(q => q.id === questionId);
        let isCorrect = false;
        let pointsEarned = 0;

        if (question) {
          maxScore += question.points;
          
          if (question.question_type === 'multiple-choice') {
            isCorrect = answer === question.correct_answer;
          } else if (question.question_type === 'fill-blank') {
            // Case-insensitive comparison for fill-in-the-blank
            isCorrect = answer.toLowerCase().trim() === question.correct_answer?.toLowerCase().trim();
          } else {
            // For short-answer, mark as needing manual review
            isCorrect = false;
          }
          
          pointsEarned = isCorrect ? question.points : 0;
          totalScore += pointsEarned;
        }

        return {
          attempt_id: attemptId,
          question_id: questionId,
          answer_text: answer,
          is_correct: isCorrect,
          points_earned: pointsEarned
        };
      });

      if (answerData.length > 0) {
        const { error: answersError } = await supabase
          .from('attempt_answers')
          .upsert(answerData);

        if (answersError) throw answersError;
      }

      // Update attempt with score and completion status
      const { error: attemptError } = await supabase
        .from('quiz_attempts')
        .update({
          status: 'graded',
          submitted_at: new Date().toISOString(),
          time_spent: (quizData.duration * 60) - timeRemaining,
          score: totalScore,
          max_score: maxScore
        })
        .eq('id', attemptId);

      if (attemptError) throw attemptError;

      toast.success("Quiz submitted and graded successfully!");
      navigate("/student");
      
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error("Failed to submit quiz");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTimerColor = () => {
    if (timeRemaining <= 300) return "text-destructive"; // Last 5 minutes
    if (timeRemaining <= 600) return "text-warning"; // Last 10 minutes
    return "text-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Timer */}
      <header className="border-b border-border bg-card shadow-card sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground">{quizData.title}</h1>
              <p className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {quizData.questions.length}
              </p>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Clock className={`h-4 w-4 ${getTimerColor()}`} />
                <span className={`font-mono text-lg font-semibold ${getTimerColor()}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              
              <Button 
                onClick={handleSubmitQuiz}
                disabled={isSubmitting}
                className="bg-gradient-accent text-accent-foreground shadow-elegant"
              >
                {isSubmitting ? "Submitting..." : "Submit Quiz"}
              </Button>
            </div>
          </div>
          
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Question Navigation */}
          <aside className="lg:col-span-1">
            <Card className="shadow-card sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Question Navigator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  {quizData.questions.map((question, index) => {
                    const isAnswered = answers[question.id];
                    const isFlagged = flaggedQuestions.has(question.id);
                    const isCurrent = index === currentQuestionIndex;
                    
                    return (
                      <button
                        key={question.id}
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`relative w-10 h-10 rounded-lg text-sm font-medium transition-smooth ${
                          isCurrent
                            ? "bg-primary text-primary-foreground shadow-elegant"
                            : isAnswered
                            ? "bg-accent text-accent-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-muted"
                        }`}
                      >
                        {index + 1}
                        {isFlagged && (
                          <Flag className="absolute -top-1 -right-1 h-3 w-3 text-warning fill-current" />
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <div className="space-y-2 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Answered:</span>
                    <Badge variant="outline">{Object.keys(answers).length}/{quizData.questions.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Flagged:</span>
                    <Badge variant="outline">{flaggedQuestions.size}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Question Area */}
          <main className="lg:col-span-3">
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="secondary">
                        {currentQuestion.question_type.replace('-', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg leading-relaxed">
                      {currentQuestion.question_text}
                    </CardTitle>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFlagQuestion(currentQuestion.id)}
                    className={flaggedQuestions.has(currentQuestion.id) ? "bg-warning/10 border-warning text-warning" : ""}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Image Display */}
                {currentQuestion.has_image && currentQuestion.image_url && (
                  <div className="rounded-lg border border-border p-4 bg-muted/30">
                    <div className="relative group">
                      <img
                        src={currentQuestion.image_url}
                        alt={`Question ${currentQuestionIndex + 1} diagram`}
                        className="w-full max-w-2xl mx-auto rounded cursor-pointer hover:scale-105 transition-smooth"
                        onClick={() => setZoomedImage({
                          src: currentQuestion.image_url!,
                          alt: `Question ${currentQuestionIndex + 1} diagram`
                        })}
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="secondary" size="sm" className="shadow-lg">
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Click image to zoom and examine details
                    </p>
                  </div>
                )}

                {/* Answer Input */}
                <div className="space-y-4">
                  {currentQuestion.question_type === "multiple-choice" && currentQuestion.options && (
                    <RadioGroup
                      value={answers[currentQuestion.id] || ""}
                      onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                      className="space-y-3"
                    >
                      {currentQuestion.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-smooth">
                          <RadioGroupItem value={option} id={`${currentQuestion.id}-${index}`} />
                          <Label
                            htmlFor={`${currentQuestion.id}-${index}`}
                            className="flex-1 cursor-pointer"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {currentQuestion.question_type === "fill-blank" && (
                    <div className="space-y-2">
                      <Label htmlFor="fill-answer">Your Answer:</Label>
                      <Input
                        id="fill-answer"
                        value={answers[currentQuestion.id] || ""}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        placeholder="Enter your answer..."
                        className="text-lg"
                      />
                    </div>
                  )}

                  {currentQuestion.question_type === "short-answer" && (
                    <div className="space-y-2">
                      <Label htmlFor="short-answer">Your Answer:</Label>
                      <Textarea
                        id="short-answer"
                        value={answers[currentQuestion.id] || ""}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        placeholder="Enter your detailed answer..."
                        rows={6}
                        className="resize-none"
                      />
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    {answers[currentQuestion.id] && (
                      <Badge className="bg-accent text-accent-foreground">
                        <Check className="h-3 w-3 mr-1" />
                        Answered
                      </Badge>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={handleNext}
                    disabled={currentQuestionIndex === quizData.questions.length - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Time Warning */}
            {timeRemaining <= 600 && (
              <Alert className="mt-4 border-warning bg-warning/10">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning">
                  {timeRemaining <= 300
                    ? "⚠️ Only 5 minutes remaining! Please submit your quiz soon."
                    : "⏰ 10 minutes remaining. Please review your answers."
                  }
                </AlertDescription>
              </Alert>
            )}
          </main>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <ImageZoom
          src={zoomedImage.src}
          alt={zoomedImage.alt}
          isOpen={!!zoomedImage}
          onClose={() => setZoomedImage(null)}
        />
      )}
    </div>
  );
};

export default QuizTaking;