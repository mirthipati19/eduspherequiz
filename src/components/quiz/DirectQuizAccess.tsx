import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, User, Mail, Lock } from "lucide-react";
import { toast } from "sonner";

interface Quiz {
  id: string;
  title: string;
  description: string;
  password_protected: boolean;
  access_password: string | null;
  duration: number;
  allow_multiple_attempts: boolean;
  max_attempts: number | null;
  require_seb: boolean;
  shuffle_questions: boolean;
  show_results_immediately: boolean;
}

const DirectQuizAccess = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quizId) {
      fetchQuiz();
    }
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('id, title, description, password_protected, access_password, duration, allow_multiple_attempts, max_attempts, require_seb, shuffle_questions, show_results_immediately')
        .eq('id', quizId)
        .eq('status', 'published')
        .maybeSingle();

      if (error || !data) {
        setError("Quiz not found or not available");
        return;
      }

      setQuiz(data as any);
    } catch (err) {
      setError("Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!quiz) return;
    
    setError(null);
    
    // Validate student information
    if (!studentName.trim()) {
      setError("Please enter your name");
      return;
    }
    
    if (!studentEmail.trim()) {
      setError("Please enter your email");
      return;
    }

    // Validate password if required
    if (quiz.password_protected) {
      if (!password.trim()) {
        setError("Please enter the quiz password");
        return;
      }
      
      if (password !== quiz.access_password) {
        setError("Incorrect password. Please try again.");
        setPassword(""); // Clear password field
        return;
      }
    }

    setIsStarting(true);

    try {
      // Check attempt limits if not allowing multiple attempts
      if (!quiz.allow_multiple_attempts || (quiz.max_attempts && quiz.max_attempts > 0)) {
        const { data: existingAttempts, error: countError } = await supabase
          .from('quiz_attempts')
          .select('id, status')
          .eq('quiz_id', quiz.id)
          .eq('student_email', studentEmail.trim());

        if (countError) throw countError;

        if (existingAttempts && existingAttempts.length > 0) {
          if (!quiz.allow_multiple_attempts) {
            setError("You have already attempted this quiz. Multiple attempts are not allowed.");
            setIsStarting(false);
            return;
          }

          const completedAttempts = existingAttempts.filter(a => a.status === 'graded' || a.status === 'submitted');
          if (quiz.max_attempts && completedAttempts.length >= quiz.max_attempts) {
            setError(`You have reached the maximum number of attempts (${quiz.max_attempts}) for this quiz.`);
            setIsStarting(false);
            return;
          }
        }
      }

      // Create anonymous quiz attempt
      const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quiz.id,
          student_name: studentName.trim(),
          student_email: studentEmail.trim(),
          access_token: crypto.randomUUID(), // Generate unique access token
          status: 'in_progress'
        })
        .select()
        .single();

      if (attemptError) throw attemptError;

      // Check if SEB is required and trigger download
      if ((quiz as any).require_seb) {
        // Trigger SEB file download
        const link = document.createElement('a');
        link.href = '/SebClientSettings.seb';
        link.download = `${quiz.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_seb_config.seb`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("SEB config downloaded! Please open it to start the quiz.");
        
        // Wait a moment for the download to start
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      toast.success("Quiz started successfully!");
      
      // Navigate to quiz taking with attempt token
      navigate(`/quiz/${quiz.id}/take?token=${attempt.access_token}`);
      
    } catch (err) {
      console.error('Error starting quiz:', err);
      setError("Failed to start quiz. Please try again.");
    } finally {
      setIsStarting(false);
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

  if (!quiz || error) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="w-full max-w-md shadow-card">
          <CardContent className="p-8">
            <div className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Quiz Not Available</h2>
              <p className="text-muted-foreground mb-4">
                {error || "The quiz you're looking for is not available."}
              </p>
              <Button variant="outline" onClick={() => navigate("/")}>
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
      <Card className="w-full max-w-lg shadow-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-foreground">{quiz.title}</CardTitle>
          <p className="text-muted-foreground">{quiz.description}</p>
           <div className="flex items-center justify-center space-x-4 mt-4 text-sm text-muted-foreground">
             <span>Duration: {quiz.duration} minutes</span>
             {quiz.password_protected && (
               <span className="flex items-center">
                 <Lock className="h-4 w-4 mr-1" />
                 Password Protected
               </span>
             )}
           </div>
           
           {(quiz as any).require_seb && (
             <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
               <div className="flex items-center space-x-2 text-sm text-warning">
                 <Shield className="h-4 w-4" />
                 <span className="font-medium">Safe Exam Browser Required</span>
               </div>
               <p className="text-xs text-muted-foreground mt-1">
                 This quiz requires Safe Exam Browser. The .seb file will download automatically when you start.
               </p>
             </div>
           )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert className="border-destructive bg-destructive/10">
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student-name" className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                Full Name
              </Label>
              <Input
                id="student-name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter your full name"
                disabled={isStarting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="student-email" className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                Email Address
              </Label>
              <Input
                id="student-email"
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="Enter your email address"
                disabled={isStarting}
              />
            </div>
            
            {quiz.password_protected && (
              <div className="space-y-2">
                <Label htmlFor="quiz-password" className="flex items-center">
                  <Lock className="h-4 w-4 mr-2" />
                  Quiz Password
                </Label>
                <Input
                  id="quiz-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter quiz password"
                  disabled={isStarting}
                />
              </div>
            )}
          </div>
          
          <Alert className="border-primary bg-primary/10">
            <Shield className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary">
              <strong>Important:</strong> Once you start the quiz, you cannot pause or restart it. 
              Make sure you have a stable internet connection and {quiz.duration} minutes available.
            </AlertDescription>
          </Alert>
          
           <Button 
             onClick={handleStartQuiz}
             disabled={isStarting}
             className="w-full bg-gradient-accent text-accent-foreground shadow-elegant"
             size="lg"
           >
             {isStarting ? "Starting Quiz..." : (quiz as any).require_seb ? "Download SEB & Start Quiz" : "Start Quiz"}
           </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DirectQuizAccess;