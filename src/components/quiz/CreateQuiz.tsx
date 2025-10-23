import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, Eye, Plus, Image, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuizzes, CreateQuizData } from "@/hooks/useQuizzes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QuizImport from "./QuizImport";

interface LocalQuestion {
  id: string;
  type: "multiple-choice" | "fill-blank" | "short-answer";
  text: string;
  options: string[];
  correctAnswer: number;
  hasImage: boolean;
  points: number;
}

const CreateQuiz = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createQuiz } = useQuizzes();
  
  const [saving, setSaving] = useState(false);
  
  // Quiz settings
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [duration, setDuration] = useState("60");
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [showResultsImmediately, setShowResultsImmediately] = useState(true);
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("1");
  
  // SEB settings
  const [requireSeb, setRequireSeb] = useState(false);
  const [sebConfigKey, setSebConfigKey] = useState("");
  const [sebBrowserExamKey, setSebBrowserExamKey] = useState("");
  const [sebQuitUrl, setSebQuitUrl] = useState("");

  // Local questions state for editing
  const [localQuestions, setLocalQuestions] = useState<LocalQuestion[]>([
    {
      id: "temp-1",
      type: "multiple-choice",
      text: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      hasImage: false,
      points: 1
    }
  ]);

  const addQuestion = () => {
    const newQuestion: LocalQuestion = {
      id: `temp-${Date.now()}`,
      type: "multiple-choice",
      text: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      hasImage: false,
      points: 1
    };
    setLocalQuestions([...localQuestions, newQuestion]);
  };

  const updateLocalQuestion = (id: string, field: keyof LocalQuestion, value: any) => {
    setLocalQuestions(localQuestions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const removeQuestion = (id: string) => {
    if (localQuestions.length > 1) {
      setLocalQuestions(localQuestions.filter(q => q.id !== id));
    }
  };

  const handleSaveQuiz = async () => {
    console.log("handleSaveQuiz called");
    console.log("User:", user);
    console.log("Quiz title:", quizTitle);
    
    if (!user) {
      toast.error("You must be logged in to create a quiz");
      return;
    }

    if (!quizTitle.trim()) {
      toast.error("Please enter a quiz title");
      return;
    }

    if (localQuestions.some(q => !q.text.trim())) {
      toast.error("Please fill in all question texts");
      return;
    }

    setSaving(true);

    try {
      // Create quiz data
      const quizData: CreateQuizData = {
        title: quizTitle,
        description: quizDescription || undefined,
        duration: parseInt(duration),
        allow_multiple_attempts: allowMultipleAttempts,
        shuffle_questions: shuffleQuestions,
        show_results_immediately: showResultsImmediately,
        password_protected: passwordProtected,
        access_password: passwordProtected ? accessPassword : undefined,
        max_attempts: maxAttempts ? parseInt(maxAttempts) : undefined,
        require_seb: requireSeb,
        seb_config_key: sebConfigKey || undefined,
        seb_browser_exam_key: sebBrowserExamKey || undefined,
        seb_quit_url: sebQuitUrl || undefined
      };

      console.log("Quiz data to create:", quizData);

      const createdQuiz = await createQuiz(quizData);
      
      console.log("Created quiz result:", createdQuiz);
      
      if (createdQuiz) {
        // Now create the questions for the quiz
        console.log("Creating questions for quiz:", createdQuiz.id);
        
        for (let i = 0; i < localQuestions.length; i++) {
          const question = localQuestions[i];
          
          if (!question.text.trim()) continue; // Skip empty questions
          
          const questionData = {
            quiz_id: createdQuiz.id,
            question_text: question.text,
            question_type: question.type,
            options: question.type === 'multiple-choice' ? question.options : null,
            correct_answer: question.type === 'multiple-choice' ? question.options[question.correctAnswer] : null,
            points: question.points,
            order_index: i + 1,
            has_image: question.hasImage,
            image_url: null // TODO: Handle image uploads later
          };
          
          console.log("Creating question:", questionData);
          
          const { error: questionError } = await supabase
            .from('questions')
            .insert([questionData]);
          
          if (questionError) {
            console.error("Error creating question:", questionError);
            toast.error(`Failed to create question ${i + 1}`);
          } else {
            console.log("Question created successfully");
          }
        }
        
        toast.success(`Quiz created successfully with ${localQuestions.length} questions!`);
        navigate("/admin/quizzes");
      } else {
        toast.error("Failed to create quiz - no data returned");
      }
    } catch (error) {
      console.error("Error saving quiz:", error);
      toast.error("Failed to save quiz");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/admin/quizzes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quizzes
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Create New Quiz</h2>
            <p className="text-muted-foreground">Build your quiz manually or upload from PDF</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <QuizImport onImportComplete={(quizId) => navigate("/admin/quizzes")} />
          <Button variant="outline" disabled>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button 
            variant="academic" 
            className="shadow-elegant"
            onClick={handleSaveQuiz}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Quiz"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quiz Settings */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                Quiz Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title</Label>
                <Input
                  id="title"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="Enter quiz title..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  placeholder="Brief description of the quiz..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                    <SelectItem value="120">120 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label htmlFor="multiple-attempts">Multiple Attempts</Label>
                  <Switch
                    id="multiple-attempts"
                    checked={allowMultipleAttempts}
                    onCheckedChange={setAllowMultipleAttempts}
                  />
                </div>

                {allowMultipleAttempts && (
                  <div className="space-y-2">
                    <Label htmlFor="max-attempts">Max Attempts</Label>
                    <Input
                      id="max-attempts"
                      type="number"
                      min="1"
                      value={maxAttempts}
                      onChange={(e) => setMaxAttempts(e.target.value)}
                      placeholder="Enter max attempts"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="shuffle">Shuffle Questions</Label>
                  <Switch
                    id="shuffle"
                    checked={shuffleQuestions}
                    onCheckedChange={setShuffleQuestions}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="immediate-results">Show Results Immediately</Label>
                  <Switch
                    id="immediate-results"
                    checked={showResultsImmediately}
                    onCheckedChange={setShowResultsImmediately}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="password-protected">Password Protected</Label>
                  <Switch
                    id="password-protected"
                    checked={passwordProtected}
                    onCheckedChange={setPasswordProtected}
                  />
                </div>

                {passwordProtected && (
                  <div className="space-y-2">
                    <Label htmlFor="access-password">Access Password</Label>
                    <Input
                      id="access-password"
                      type="password"
                      value={accessPassword}
                      onChange={(e) => setAccessPassword(e.target.value)}
                      placeholder="Enter quiz password"
                    />
                  </div>
                )}
              </div>

              {/* SEB Settings */}
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <Label className="text-base font-medium">Safe Exam Browser (SEB)</Label>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="require-seb">Require SEB</Label>
                  <Switch
                    id="require-seb"
                    checked={requireSeb}
                    onCheckedChange={setRequireSeb}
                  />
                </div>

                {requireSeb && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="seb-config-key">SEB Config Key</Label>
                      <Input
                        id="seb-config-key"
                        value={sebConfigKey}
                        onChange={(e) => setSebConfigKey(e.target.value)}
                        placeholder="Enter SEB Config Key..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="seb-browser-key">SEB Browser Exam Key</Label>
                      <Input
                        id="seb-browser-key"
                        value={sebBrowserExamKey}
                        onChange={(e) => setSebBrowserExamKey(e.target.value)}
                        placeholder="Enter Browser Exam Key..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="seb-quit-url">SEB Quit URL</Label>
                      <Input
                        id="seb-quit-url"
                        value={sebQuitUrl}
                        onChange={(e) => setSebQuitUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Questions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Questions ({localQuestions.length})
            </h3>
            <Button onClick={addQuestion} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>

          <div className="space-y-4">
            {localQuestions.map((question, index) => (
              <Card key={question.id} className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Question {index + 1}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Select
                        value={question.type}
                        onValueChange={(value) => updateLocalQuestion(question.id, "type", value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                          <SelectItem value="fill-blank">Fill-in-Blank</SelectItem>
                          <SelectItem value="short-answer">Short Answer</SelectItem>
                        </SelectContent>
                      </Select>
                      {localQuestions.length > 1 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeQuestion(question.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question Text</Label>
                    <Textarea
                      value={question.text}
                      onChange={(e) => updateLocalQuestion(question.id, "text", e.target.value)}
                      placeholder="Enter your question here..."
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <Button variant="outline" size="sm" disabled>
                      <Image className="h-4 w-4 mr-2" />
                      Add Image
                    </Button>
                    <Badge variant="outline">
                      Points: {question.points}
                    </Badge>
                  </div>

                  {question.type === "multiple-choice" && (
                    <div className="space-y-2">
                      <Label>Answer Options</Label>
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <Input
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...question.options];
                              newOptions[optionIndex] = e.target.value;
                              updateLocalQuestion(question.id, "options", newOptions);
                            }}
                            placeholder={`Option ${optionIndex + 1}`}
                            className="flex-1"
                          />
                          <Button
                            variant={question.correctAnswer === optionIndex ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateLocalQuestion(question.id, "correctAnswer", optionIndex)}
                          >
                            {question.correctAnswer === optionIndex ? "Correct" : "Mark"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {question.type === "fill-blank" && (
                    <div className="space-y-2">
                      <Label>Correct Answer</Label>
                      <Input placeholder="Enter the correct answer..." />
                    </div>
                  )}

                  {question.type === "short-answer" && (
                    <div className="space-y-2">
                      <Label>Answer Guidelines (for manual grading)</Label>
                      <Textarea 
                        placeholder="Provide key points that should be included in the answer..."
                        rows={3}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateQuiz;