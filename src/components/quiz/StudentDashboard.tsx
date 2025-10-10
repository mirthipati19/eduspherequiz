import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, BookOpen, Award, TrendingUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface Quiz {
  id: string;
  title: string;
  description: string;
  duration: number;
  require_seb: boolean;
  created_at: string;
}

interface QuizAttempt {
  id: string;
  quiz_id: string;
  score: number;
  max_score: number;
  status: string;
}

const StudentDashboard = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
    fetchAttempts();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('id, title, description, duration, require_seb, created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuizzes(data || []);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    }
  };

  const fetchAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('id, quiz_id, score, max_score, status')
        .eq('status', 'submitted');

      if (error) throw error;
      setAttempts(data || []);
    } catch (error) {
      console.error('Error fetching attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuizAttempt = (quizId: string) => {
    return attempts.find(attempt => attempt.quiz_id === quizId);
  };

  const calculateStats = () => {
    const completedQuizzes = attempts.length;
    const totalQuizzes = quizzes.length;
    const averageScore = attempts.length > 0 
      ? attempts.reduce((sum, attempt) => sum + ((attempt.score / attempt.max_score) * 100), 0) / attempts.length
      : 0;
    
    return { completedQuizzes, totalQuizzes, averageScore: Math.round(averageScore * 10) / 10 };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-card">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Student Portal</h1>
                  <p className="text-sm text-muted-foreground">Available Quizzes</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link to="/admin">
                <Button variant="outline" size="sm">
                  Admin Panel
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Award className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold text-foreground">{stats.averageScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Progress</p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.completedQuizzes}/{stats.totalQuizzes}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <div className="flex items-center space-x-2">
                    <Progress 
                      value={stats.totalQuizzes > 0 ? (stats.completedQuizzes / stats.totalQuizzes) * 100 : 0} 
                      className="w-16 h-2"
                    />
                    <span className="text-sm font-medium">
                      {stats.totalQuizzes > 0 ? Math.round((stats.completedQuizzes / stats.totalQuizzes) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Quizzes */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Available Quizzes</h2>
            <p className="text-muted-foreground">Complete your assigned quizzes</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : quizzes.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Quizzes Available</h3>
                <p className="text-muted-foreground">There are no published quizzes at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
              {quizzes.map((quiz) => {
                const attempt = getQuizAttempt(quiz.id);
                const isCompleted = !!attempt;
                
                return (
                  <Card key={quiz.id} className="shadow-card hover:shadow-hover transition-smooth">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">{quiz.title}</h3>
                            <Badge className={isCompleted ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}>
                              {isCompleted ? "Completed" : "Available"}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-4">{quiz.description}</p>
                          
                          <div className="flex items-center space-x-6 text-sm text-muted-foreground mb-4">
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {quiz.duration} minutes
                            </span>
                            {quiz.require_seb && (
                              <Badge variant="outline" className="text-xs">
                                Requires SEB
                              </Badge>
                            )}
                          </div>

                          {isCompleted && attempt && (
                            <div className="flex items-center space-x-4 mb-4">
                              <div className="flex items-center space-x-2">
                                <Award className="h-4 w-4 text-accent" />
                                <span className="font-medium text-accent">
                                  Score: {attempt.score}/{attempt.max_score} ({((attempt.score / attempt.max_score) * 100).toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Created: {new Date(quiz.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {!isCompleted && (
                                <Link to={`/quiz/${quiz.id}/direct`}>
                                  <Button variant="academic" className="shadow-elegant">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Start Quiz
                                  </Button>
                                </Link>
                              )}
                              {isCompleted && (
                                <Button variant="outline" disabled>
                                  Completed
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;