import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { Upload, FileText, CheckCircle, Eye, AlertCircle } from "lucide-react";
import { RealPDFParser, ParsedQuiz } from "@/services/realPdfParser";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface QuizImportProps {
  onImportComplete?: (quizId: string) => void;
}

const QuizImport = ({ onImportComplete }: QuizImportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(90);
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedQuiz, setParsedQuiz] = useState<ParsedQuiz | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setParsedQuiz(null); // Reset parsed data
      if (!title) {
        setTitle(selectedFile.name.replace('.pdf', ''));
      }
    } else {
      toast.error("Please select a valid PDF file");
      event.target.value = '';
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setParsedQuiz(null); // Reset parsed data
      if (!title) {
        setTitle(droppedFile.name.replace('.pdf', ''));
      }
    } else {
      toast.error("Please drop a valid PDF file");
    }
  };

  const handleParsePreview = async () => {
    if (!file) return;
    
    setIsParsing(true);
    try {
      const parsed = await RealPDFParser.parseQuizFromPDF(file, title, description);
      setParsedQuiz(parsed);
      setShowPreview(true);
      toast.success(`Successfully parsed ${parsed.questions.length} questions!`);
    } catch (error) {
      console.error("Parse failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to parse PDF");
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parsedQuiz || !title.trim()) {
      toast.error("Please parse the PDF and enter a title first");
      return;
    }
    if (requirePassword && !password.trim()) {
      toast.error("Please enter a password");
      return;
    }

    setIsImporting(true);
    try {
      const quizId = await RealPDFParser.createQuizFromParsedData(
        {
          ...parsedQuiz,
          title: title.trim(),
          description: description.trim(),
          duration: duration
        },
        publishImmediately,
        requirePassword ? password.trim() : undefined
      );
      
      toast.success("Quiz imported successfully!");
      onImportComplete?.(quizId);
      handleClose();
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("Failed to import quiz. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setDuration(90);
    setRequirePassword(false);
    setPassword("");
    setPublishImmediately(false);
    setParsedQuiz(null);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
      else setIsOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import PDF
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Quiz from PDF</DialogTitle>
        </DialogHeader>
        
        {!showPreview ? (
          <div className="space-y-6">
            {/* File Upload */}
            <div className="space-y-2">
              <Label>PDF File</Label>
              <Card
                className={`border-2 border-dashed transition-colors ${
                  file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <CardContent className="p-8 text-center">
                  {file ? (
                    <div className="space-y-2">
                      <CheckCircle className="h-12 w-12 text-primary mx-auto" />
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFile(null);
                            setParsedQuiz(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          Remove File
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleParsePreview}
                          disabled={isParsing}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {isParsing ? "Parsing..." : "Parse & Preview"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                      <div>
                        <p className="font-medium text-foreground mb-1">
                          Drop your PDF here or click to browse
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Format: 1. Question A. Option B. Option C. Option D. Option Answer: A
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Select PDF File
                      </Button>
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </CardContent>
              </Card>
            </div>
            
            {/* Quiz Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quiz-title">Quiz Title *</Label>
                <Input
                  id="quiz-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter quiz title"
                  disabled={isImporting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quiz-description">Description (Optional)</Label>
                <Textarea
                  id="quiz-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter quiz description"
                  rows={3}
                  disabled={isImporting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 90)}
                    disabled={isImporting}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="publish-immediately"
                      checked={publishImmediately}
                      onCheckedChange={setPublishImmediately}
                      disabled={isImporting}
                    />
                    <Label htmlFor="publish-immediately">Publish immediately</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="require-password"
                    checked={requirePassword}
                    onCheckedChange={setRequirePassword}
                    disabled={isImporting}
                  />
                  <Label htmlFor="require-password">Password protect this quiz</Label>
                </div>

                {requirePassword && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Access Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password for quiz access"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isImporting}
                    />
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter className="flex items-center justify-between pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Parse PDF first to preview and verify questions
              </p>
              
              <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h3 className="font-semibold text-lg">Preview: {parsedQuiz?.questions.length || 0} Questions</h3>
                <p className="text-sm text-muted-foreground">Review extracted questions before importing</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>
                Back to Edit
              </Button>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {parsedQuiz?.questions.map((q, idx) => (
                  <Card key={idx} className="p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <Badge variant="secondary">{idx + 1}</Badge>
                      <p className="font-medium flex-1">{q.question_text}</p>
                    </div>
                    <div className="ml-8 space-y-1">
                      {q.options.map((opt, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        const isCorrect = opt === q.correct_answer;
                        return (
                          <div key={optIdx} className={`text-sm flex items-start gap-2 ${isCorrect ? 'text-accent font-medium' : ''}`}>
                            <span className="font-mono">{letter}.</span>
                            <span className="flex-1">{opt}</span>
                            {isCorrect && <CheckCircle className="h-4 w-4 flex-shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-start gap-2 text-sm">
                {parsedQuiz && parsedQuiz.questions.length > 0 ? (
                  <div className="flex items-center gap-2 text-accent">
                    <CheckCircle className="h-4 w-4" />
                    <span>Ready to import</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>No questions found</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={!parsedQuiz || parsedQuiz.questions.length === 0 || !title.trim() || isImporting}
                  className="bg-gradient-accent"
                >
                  {isImporting ? "Importing..." : "Import Quiz"}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuizImport;