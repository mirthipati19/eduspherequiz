import { useState, useEffect } from "react";
import { Star, Search, Trash2, Plus, CheckSquare, Type, FileText, Heart } from "lucide-react";
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

interface FavoriteQuestion {
  id: string;
  question_id: string;
  notes: string;
  created_at: string;
  question: {
    question_text: string;
    question_type: "multiple-choice" | "fill-blank" | "short-answer";
    points: number;
    has_image: boolean;
  };
}

const FavoriteQuestions = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [favorites, setFavorites] = useState<FavoriteQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFavorite, setSelectedFavorite] = useState<FavoriteQuestion | null>(null);
  const [editingNotes, setEditingNotes] = useState("");

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('favorite_questions')
        .select(`
          id,
          question_id,
          notes,
          created_at,
          question:questions(
            question_text,
            question_type,
            points,
            has_image
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast.error("Failed to load favorite questions");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from('favorite_questions')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      setFavorites(favorites.filter(f => f.id !== favoriteId));
      toast.success("Removed from favorites");
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error("Failed to remove favorite");
    }
  };

  const handleUpdateNotes = async () => {
    if (!selectedFavorite) return;

    try {
      const { error } = await supabase
        .from('favorite_questions')
        .update({ notes: editingNotes })
        .eq('id', selectedFavorite.id);

      if (error) throw error;

      setFavorites(favorites.map(f => 
        f.id === selectedFavorite.id ? { ...f, notes: editingNotes } : f
      ));
      setSelectedFavorite(null);
      toast.success("Notes updated");
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error("Failed to update notes");
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

  const filteredFavorites = favorites.filter(fav =>
    fav.question.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fav.notes?.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground flex items-center space-x-2">
            <Heart className="h-6 w-6 text-destructive fill-destructive" />
            <span>Favorite Questions</span>
          </h2>
          <p className="text-muted-foreground">Your saved questions for quick review</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {favorites.length} Saved
        </Badge>
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

      {/* Favorites List */}
      <div className="space-y-4">
        {filteredFavorites.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchTerm ? "No matching questions found" : "No favorite questions yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? "Try adjusting your search terms" 
                  : "Start adding questions to your favorites while creating quizzes"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFavorites.map((favorite) => {
            const TypeIcon = getTypeIcon(favorite.question.question_type);
            return (
              <Card key={favorite.id} className="shadow-card hover:shadow-hover transition-smooth">
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
                            {favorite.question.question_text}
                          </p>
                          {favorite.notes && (
                            <div className="bg-muted/30 rounded-lg p-3 mt-2">
                              <p className="text-sm text-muted-foreground">
                                <strong>Notes:</strong> {favorite.notes}
                              </p>
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="ml-4">
                          {favorite.question.points} pts
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {favorite.question.question_type.replace('-', ' ')}
                        </Badge>
                        
                        <div className="flex items-center space-x-2">
                          <Dialog 
                            open={selectedFavorite?.id === favorite.id}
                            onOpenChange={(open) => {
                              if (open) {
                                setSelectedFavorite(favorite);
                                setEditingNotes(favorite.notes || "");
                              } else {
                                setSelectedFavorite(null);
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Edit Notes
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Notes</DialogTitle>
                                <DialogDescription>
                                  Add personal notes about this question
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea
                                  value={editingNotes}
                                  onChange={(e) => setEditingNotes(e.target.value)}
                                  placeholder="Add your notes here..."
                                  rows={4}
                                />
                                <Button onClick={handleUpdateNotes} className="w-full">
                                  Save Notes
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFavorite(favorite.id)}
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
    </div>
  );
};

export default FavoriteQuestions;
