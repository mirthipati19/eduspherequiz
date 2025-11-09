import { useState, useEffect } from "react";
import { Star, Search, Trash2, Plus, CheckSquare, Type, FileText, Heart, Edit, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QuestionBankItem {
  id: string;
  question_id?: string;
  notes: string;
  created_at: string;
  question_text: string;
  question_type: "multiple-choice" | "fill-blank" | "short-answer";
  points: number;
  options?: string[];
  correct_answer?: string;
}

const QuestionBank = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionBankItem | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question_text: "",
    question_type: "multiple-choice" as "multiple-choice" | "fill-blank" | "short-answer",
    points: 1,
    notes: "",
    options: ["", "", "", ""],
    correct_answer: ""
  });

  useEffect(() => {
    if (user) {
      fetchQuestions();
    }
  }, [user]);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('favorite_questions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedData = data?.map(item => ({
        id: item.id,
        question_id: item.question_id,
        notes: item.notes || "",
        created_at: item.created_at,
        question_text: item.question_text || "",
        question_type: item.question_type || "short-answer",
        points: item.points || 1,
        options: item.options ? JSON.parse(item.options as any) : [],
        correct_answer: item.correct_answer || ""
      })) || [];
      
      setQuestions(formattedData);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error("Failed to load question bank");
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.question_text.trim()) {
      toast.error("Question text is required");
      return;
    }

    try {
      const { error } = await supabase
        .from('favorite_questions')
        .insert({
          user_id: user?.id,
          question_text: newQuestion.question_text,
          question_type: newQuestion.question_type,
          points: newQuestion.points,
          notes: newQuestion.notes,
          options: newQuestion.question_type === 'multiple-choice' ? JSON.stringify(newQuestion.options.filter(o => o.trim())) : null,
          correct_answer: newQuestion.correct_answer
        });

      if (error) throw error;

      toast.success("Question added to bank!");
      setIsAddDialogOpen(false);
      setNewQuestion({
        question_text: "",
        question_type: "multiple-choice",
        points: 1,
        notes: "",
        options: ["", "", "", ""],
        correct_answer: ""
      });
      fetchQuestions();
    } catch (error) {
      console.error('Error adding question:', error);
      toast.error("Failed to add question");
    }
  };

  const handleUpdateQuestion = async () => {
    if (!selectedQuestion) return;

    try {
      const { error } = await supabase
        .from('favorite_questions')
        .update({
          question_text: selectedQuestion.question_text,
          question_type: selectedQuestion.question_type,
          points: selectedQuestion.points,
          notes: selectedQuestion.notes,
          options: selectedQuestion.question_type === 'multiple-choice' ? JSON.stringify(selectedQuestion.options?.filter(o => o.trim())) : null,
          correct_answer: selectedQuestion.correct_answer
        })
        .eq('id', selectedQuestion.id);

      if (error) throw error;

      toast.success("Question updated!");
      setIsEditDialogOpen(false);
      setSelectedQuestion(null);
      fetchQuestions();
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error("Failed to update question");
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('favorite_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      setQuestions(questions.filter(q => q.id !== questionId));
      toast.success("Question deleted");
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error("Failed to delete question");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "multiple-choice":
        return CheckSquare;
      case "fill-blank":
        return Type;
      case "short-answer":
        return FileText;
      default:
        return FileText;
    }
  };

  const filteredQuestions = questions.filter(q =>
    q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground flex items-center space-x-2">
            <Library className="h-6 w-6 text-primary" />
            <span>Question Bank</span>
          </h2>
          <p className="text-muted-foreground">Your personal collection of questions</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {questions.length} Questions
          </Badge>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Question</DialogTitle>
                <DialogDescription>
                  Create a new question for your personal bank
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="question_text">Question Text</Label>
                  <Textarea
                    id="question_text"
                    value={newQuestion.question_text}
                    onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                    placeholder="Enter your question..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Question Type</Label>
                    <Select
                      value={newQuestion.question_type}
                      onValueChange={(value: any) => setNewQuestion({ ...newQuestion, question_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                        <SelectItem value="fill-blank">Fill in the Blank</SelectItem>
                        <SelectItem value="short-answer">Short Answer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="points">Points</Label>
                    <Input
                      id="points"
                      type="number"
                      min="1"
                      value={newQuestion.points}
                      onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                {newQuestion.question_type === 'multiple-choice' && (
                  <div className="space-y-2">
                    <Label>Options</Label>
                    {newQuestion.options.map((option, index) => (
                      <Input
                        key={index}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...newQuestion.options];
                          newOptions[index] = e.target.value;
                          setNewQuestion({ ...newQuestion, options: newOptions });
                        }}
                        placeholder={`Option ${index + 1}`}
                      />
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="correct_answer">Correct Answer</Label>
                  <Input
                    id="correct_answer"
                    value={newQuestion.correct_answer}
                    onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                    placeholder="Enter correct answer..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={newQuestion.notes}
                    onChange={(e) => setNewQuestion({ ...newQuestion, notes: e.target.value })}
                    placeholder="Add any notes about this question..."
                    rows={2}
                  />
                </div>

                <Button onClick={handleAddQuestion} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search favorite questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Library className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchTerm ? "No matching questions found" : "No questions in your bank yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? "Try adjusting your search terms" 
                  : "Click 'Add Question' to start building your question bank"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredQuestions.map((question) => {
            const TypeIcon = getTypeIcon(question.question_type);
            return (
              <Card key={question.id} className="shadow-card hover:shadow-hover transition-smooth">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <TypeIcon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-foreground font-medium leading-relaxed mb-2">
                            {question.question_text}
                          </p>
                          {question.correct_answer && (
                            <div className="bg-success/10 rounded-lg p-3 mt-2">
                              <p className="text-sm text-foreground">
                                <strong>Answer:</strong> {question.correct_answer}
                              </p>
                            </div>
                          )}
                          {question.notes && (
                            <div className="bg-muted/30 rounded-lg p-3 mt-2">
                              <p className="text-sm text-muted-foreground">
                                <strong>Notes:</strong> {question.notes}
                              </p>
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="ml-4">
                          {question.points} pts
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {question.question_type.replace('-', ' ')}
                        </Badge>
                        
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedQuestion(question);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteQuestion(question.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Question Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>
              Update your question details
            </DialogDescription>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_question_text">Question Text</Label>
                <Textarea
                  id="edit_question_text"
                  value={selectedQuestion.question_text}
                  onChange={(e) => setSelectedQuestion({ ...selectedQuestion, question_text: e.target.value })}
                  placeholder="Enter your question..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select
                    value={selectedQuestion.question_type}
                    onValueChange={(value: any) => setSelectedQuestion({ ...selectedQuestion, question_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                      <SelectItem value="fill-blank">Fill in the Blank</SelectItem>
                      <SelectItem value="short-answer">Short Answer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_points">Points</Label>
                  <Input
                    id="edit_points"
                    type="number"
                    min="1"
                    value={selectedQuestion.points}
                    onChange={(e) => setSelectedQuestion({ ...selectedQuestion, points: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              {selectedQuestion.question_type === 'multiple-choice' && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  {(selectedQuestion.options || ["", "", "", ""]).map((option, index) => (
                    <Input
                      key={index}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(selectedQuestion.options || ["", "", "", ""])];
                        newOptions[index] = e.target.value;
                        setSelectedQuestion({ ...selectedQuestion, options: newOptions });
                      }}
                      placeholder={`Option ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit_correct_answer">Correct Answer</Label>
                <Input
                  id="edit_correct_answer"
                  value={selectedQuestion.correct_answer || ""}
                  onChange={(e) => setSelectedQuestion({ ...selectedQuestion, correct_answer: e.target.value })}
                  placeholder="Enter correct answer..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_notes">Notes (Optional)</Label>
                <Textarea
                  id="edit_notes"
                  value={selectedQuestion.notes}
                  onChange={(e) => setSelectedQuestion({ ...selectedQuestion, notes: e.target.value })}
                  placeholder="Add any notes about this question..."
                  rows={2}
                />
              </div>

              <Button onClick={handleUpdateQuestion} className="w-full">
                <Edit className="h-4 w-4 mr-2" />
                Update Question
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionBank;
