import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExportResultsProps {
  quizzes: Array<{ id: string; title: string }>;
}

const ExportResults = ({ quizzes }: ExportResultsProps) => {
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [studentEmail, setStudentEmail] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);

    try {
      // Build query
      let query = supabase
        .from('quiz_attempts')
        .select(`
          id,
          student_name,
          student_email,
          score,
          max_score,
          submitted_at,
          status,
          quizzes!inner(id, title)
        `)
        .in('status', ['submitted', 'graded']);

      // Apply filters
      if (selectedQuizId) {
        query = query.eq('quiz_id', selectedQuizId);
      }

      if (studentEmail) {
        query = query.ilike('student_email', `%${studentEmail}%`);
      }

      if (dateFrom) {
        query = query.gte('submitted_at', new Date(dateFrom).toISOString());
      }

      if (dateTo) {
        query = query.lte('submitted_at', new Date(dateTo).toISOString());
      }

      if (minScore) {
        query = query.gte('score', parseFloat(minScore));
      }

      if (maxScore) {
        query = query.lte('score', parseFloat(maxScore));
      }

      const { data: attempts, error } = await query.order('submitted_at', { ascending: false });

      if (error) throw error;

      if (!attempts || attempts.length === 0) {
        toast.error("No results found matching the criteria");
        return;
      }

      // Fetch answers for each attempt
      const attemptsWithAnswers = await Promise.all(
        attempts.map(async (attempt) => {
          const { data: answers } = await supabase
            .from('attempt_answers')
            .select(`
              answer_text,
              is_correct,
              points_earned,
              questions!inner(question_text, correct_answer)
            `)
            .eq('attempt_id', attempt.id);

          return {
            ...attempt,
            answers: answers || []
          };
        })
      );

      // Convert to CSV
      const csvRows = [];
      
      // Header
      csvRows.push([
        "Student Name",
        "Email",
        "Quiz Title",
        "Score",
        "Max Score",
        "Percentage",
        "Submission Date",
        "Status",
        "Question",
        "Student Answer",
        "Correct Answer",
        "Is Correct",
        "Points Earned"
      ].join(","));

      // Data rows
      attemptsWithAnswers.forEach((attempt) => {
        const baseInfo = [
          `"${attempt.student_name}"`,
          `"${attempt.student_email}"`,
          `"${(attempt.quizzes as any).title}"`,
          attempt.score || 0,
          attempt.max_score || 0,
          attempt.max_score ? ((attempt.score || 0) / attempt.max_score * 100).toFixed(2) + "%" : "N/A",
          attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : "N/A",
          attempt.status
        ];

        if (attempt.answers.length > 0) {
          attempt.answers.forEach((answer: any) => {
            csvRows.push([
              ...baseInfo,
              `"${answer.questions.question_text.replace(/"/g, '""')}"`,
              `"${(answer.answer_text || '').replace(/"/g, '""')}"`,
              `"${(answer.questions.correct_answer || '').replace(/"/g, '""')}"`,
              answer.is_correct ? "Yes" : "No",
              answer.points_earned || 0
            ].join(","));
          });
        } else {
          csvRows.push([...baseInfo, "", "", "", "", ""].join(","));
        }
      });

      // Download CSV
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `quiz_results_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${attempts.length} quiz results successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to export results");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Export Quiz Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quiz-select">Quiz (Optional)</Label>
            <Select value={selectedQuizId} onValueChange={setSelectedQuizId}>
              <SelectTrigger id="quiz-select">
                <SelectValue placeholder="All Quizzes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Quizzes</SelectItem>
                {quizzes.map((quiz) => (
                  <SelectItem key={quiz.id} value={quiz.id}>
                    {quiz.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="student-email">Student Email (Optional)</Label>
            <Input
              id="student-email"
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="Filter by email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-from">From Date (Optional)</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-to">To Date (Optional)</Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="min-score">Min Score (Optional)</Label>
            <Input
              id="min-score"
              type="number"
              step="0.1"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              placeholder="Minimum score"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-score">Max Score (Optional)</Label>
            <Input
              id="max-score"
              type="number"
              step="0.1"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              placeholder="Maximum score"
            />
          </div>
        </div>

        <Button
          onClick={handleExport}
          disabled={exporting}
          className="w-full"
          variant="academic"
        >
          <Download className="h-4 w-4 mr-2" />
          {exporting ? "Exporting..." : "Export to CSV"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ExportResults;
