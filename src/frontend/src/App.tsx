import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { BookOpen, GraduationCap, LogOut, Shield } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { ExamResult, PublicExam } from "./backend.d";
import AdminPanel from "./components/AdminPanel";
import ExamList from "./components/ExamList";
import ExamResultsPage from "./components/ExamResultsPage";
import TakeExam from "./components/TakeExam";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";

type View =
  | { type: "exam-list" }
  | { type: "take-exam"; exam: PublicExam }
  | {
      type: "results";
      result: { score: bigint; totalQuestions: bigint };
      exam: PublicExam;
    }
  | { type: "admin" };

export default function App() {
  const [view, setView] = useState<View>({ type: "exam-list" });
  const { identity, clear } = useInternetIdentity();

  const principal = identity?.getPrincipal().toString();
  const shortPrincipal = principal ? `${principal.slice(0, 8)}...` : null;

  function handleStartExam(exam: PublicExam) {
    setView({ type: "take-exam", exam });
  }

  function handleExamSubmitted(
    result: { score: bigint; totalQuestions: bigint },
    exam: PublicExam,
  ) {
    setView({ type: "results", result, exam });
  }

  function handleBackToList() {
    setView({ type: "exam-list" });
  }

  return (
    <div className="min-h-screen bg-background exam-grid-bg flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackToList}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            data-ocid="nav.link"
          >
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display font-semibold text-lg text-foreground tracking-tight">
              ExamPortal
            </span>
          </button>

          <nav className="flex items-center gap-3">
            {identity ? (
              <>
                <span className="text-xs text-muted-foreground hidden sm:block font-mono">
                  {shortPrincipal}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView({ type: "admin" })}
                  data-ocid="nav.admin_panel.link"
                  className="text-primary hover:text-primary"
                >
                  <Shield className="w-4 h-4 mr-1" />
                  Admin
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clear}
                  data-ocid="nav.logout.button"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView({ type: "admin" })}
                data-ocid="nav.admin_panel.button"
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                <Shield className="w-4 h-4 mr-1" />
                Admin Panel
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {view.type === "exam-list" && (
          <motion.div
            key="exam-list"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ExamList onStartExam={handleStartExam} />
          </motion.div>
        )}

        {view.type === "take-exam" && (
          <motion.div
            key="take-exam"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <TakeExam
              exam={view.exam}
              onSubmitted={(result) => handleExamSubmitted(result, view.exam)}
              onBack={handleBackToList}
            />
          </motion.div>
        )}

        {view.type === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ExamResultsPage
              result={view.result}
              exam={view.exam}
              onBack={handleBackToList}
            />
          </motion.div>
        )}

        {view.type === "admin" && (
          <motion.div
            key="admin"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <AdminPanel onBack={handleBackToList} />
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()}. Built with ❤ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}
