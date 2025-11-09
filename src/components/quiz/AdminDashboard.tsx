import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Plus, BookOpen, FileText, BarChart3, Settings, Users, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { AdminGuard } from "@/components/auth/AdminGuard";
import QuizList from "./QuizList";
import FavoriteQuestions from "./FavoriteQuestions";
import SettingsPage from "./Settings";
import CreateQuiz from "./CreateQuiz";
import EditQuiz from "./EditQuiz";
import Results from "./Results";
import QuizResultDetail from "./QuizResultDetail";

const AdminDashboard = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  
  const navigation = [
    { name: "Quizzes", href: "/admin/quizzes", icon: BookOpen },
    { name: "Favorites", href: "/admin/favorites", icon: FileText },
    { name: "Results", href: "/admin/results", icon: BarChart3 },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <AdminGuard>
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
                <h1 className="text-xl font-semibold text-foreground">Quiz Master</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link to="/admin/create">
                <Button variant="academic" className="shadow-elegant">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quiz
                </Button>
              </Link>
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Students
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex space-x-8">
          {/* Sidebar Navigation */}
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-lg transition-smooth ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-elegant"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<QuizList />} />
              <Route path="/quizzes" element={<QuizList />} />
              <Route path="/favorites" element={<FavoriteQuestions />} />
              <Route path="/create" element={<CreateQuiz />} />
              <Route path="/edit/:quizId" element={<EditQuiz />} />
              <Route path="/results" element={<Results />} />
              <Route path="/results/:attemptId" element={<QuizResultDetail />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
    </AdminGuard>
  );
};

export default AdminDashboard;