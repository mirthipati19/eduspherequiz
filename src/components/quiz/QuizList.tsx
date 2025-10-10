import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Filter, Clock, Users, MoreHorizontal, Eye, Edit, Trash2 as Trash, BookOpen, Shield, Play, Share, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useQuizzes } from "@/hooks/useQuizzes";

const QuizList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { quizzes, loading, deleteQuiz, publishQuiz, refetch } = useQuizzes();

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (quiz.description && quiz.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      await deleteQuiz(id);
    }
  };

  const handleTogglePublish = async (quiz: any) => {
    try {
      const newStatus = quiz.status === 'published' ? 'draft' : 'published';
      console.log(`Toggling quiz ${quiz.id} from ${quiz.status} to ${newStatus}`);
      
      const success = await publishQuiz(quiz.id, newStatus);
      if (success) {
        console.log("Toggle successful, refetching quizzes");
        refetch();
      }
    } catch (error) {
      console.error("Toggle error:", error);
      toast.error("Failed to update quiz status");
    }
  };

  const handleCopyLink = (quizId: string) => {
    const shareableLink = `${window.location.origin}/quiz/${quizId}/direct`;
    navigator.clipboard.writeText(shareableLink).then(() => {
      toast.success("Quiz link copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-accent text-accent-foreground";
      case "draft":
        return "bg-warning text-warning-foreground";
      case "archived":
        return "bg-secondary text-secondary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Quiz Library</h2>
          <p className="text-muted-foreground">Manage and organize your quiz collection</p>
        </div>
        <Link to="/admin/create">
          <Button variant="academic" className="shadow-elegant">
            <Plus className="h-4 w-4 mr-2" />
            New Quiz
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quizzes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quiz Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredQuizzes.map((quiz) => (
              <Card key={quiz.id} className="shadow-card hover:shadow-hover transition-smooth group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg group-hover:text-primary transition-smooth">
                        {quiz.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {quiz.description || "No description provided"}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {quiz.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handleTogglePublish(quiz)}>
                            <Play className="h-4 w-4 mr-2" />
                            Publish
                          </DropdownMenuItem>
                        )}
                        {quiz.status === 'published' && (
                          <DropdownMenuItem onClick={() => handleTogglePublish(quiz)}>
                            <Play className="h-4 w-4 mr-2" />
                            Unpublish
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDelete(quiz.id, quiz.title)}
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {quiz.duration}m
                      </span>
                      {quiz.require_seb && (
                        <span className="flex items-center text-primary">
                          <Shield className="h-4 w-4 mr-1" />
                          SEB
                        </span>
                      )}
                    </div>
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      0 {/* TODO: Add attempts count from quiz_attempts table */}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {quiz.max_attempts && (
                        <Badge variant="secondary" className="text-xs">
                          Max {quiz.max_attempts} attempts
                        </Badge>
                      )}
                      {quiz.shuffle_questions && (
                        <Badge variant="secondary" className="text-xs">
                          Shuffled
                        </Badge>
                      )}
                    </div>
                    <Badge className={getStatusColor(quiz.status)}>
                      {quiz.status}
                    </Badge>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Created {formatDate(quiz.created_at)}
                      </span>
                      {quiz.status === 'published' && (
                        <Badge variant="secondary" className="text-xs">
                          <Share className="h-3 w-3 mr-1" />
                          Ready to share
                        </Badge>
                      )}
                    </div>
                    
                    {quiz.status === 'published' ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-muted/30 rounded border text-xs">
                          <span className="text-muted-foreground font-mono truncate flex-1 mr-2">
                            {window.location.origin}/quiz/{quiz.id}/direct
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 shrink-0"
                            onClick={() => handleCopyLink(quiz.id)}
                            title="Copy student link"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleCopyLink(quiz.id)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Link
                          </Button>
                          <Link to={`/quiz/${quiz.id}/direct`}>
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" disabled className="w-full">
                        Publish to share
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredQuizzes.length === 0 && !loading && (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No quizzes found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "Try adjusting your search terms" : "Get started by creating your first quiz"}
                </p>
                <Link to="/admin/create">
                  <Button variant="academic">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Quiz
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default QuizList;