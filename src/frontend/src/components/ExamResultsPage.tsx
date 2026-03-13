import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home, RotateCcw, Trophy, XCircle } from "lucide-react";
import { motion } from "motion/react";
import type { PublicExam } from "../backend.d";

interface Props {
  result: { score: bigint; totalQuestions: bigint };
  exam: PublicExam;
  onBack: () => void;
}

export default function ExamResultsPage({ result, exam, onBack }: Props) {
  const score = Number(result.score);
  const total = Number(result.totalQuestions);
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = pct >= 60;

  return (
    <div
      className="container mx-auto px-4 py-12 max-w-2xl"
      data-ocid="results.page"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
      >
        {/* Score card */}
        <div className="bg-card card-glow rounded-2xl p-8 text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
              passed ? "bg-success/10" : "bg-destructive/10"
            }`}
          >
            {passed ? (
              <Trophy className="w-9 h-9 text-success" />
            ) : (
              <XCircle className="w-9 h-9 text-destructive" />
            )}
          </motion.div>

          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            {exam.title}
          </h1>
          <p className="text-muted-foreground mb-6">
            {passed
              ? "Congratulations! You passed."
              : "Keep practising. You can do better!"}
          </p>

          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-6xl font-display font-bold text-primary">
              {score}
            </span>
            <span className="text-3xl text-muted-foreground font-display">
              / {total}
            </span>
          </div>

          <Badge
            className={`text-lg px-4 py-1 ${
              passed
                ? "bg-success/10 text-success border-success/20"
                : "bg-destructive/10 text-destructive border-destructive/20"
            }`}
          >
            {pct}%
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={onBack}
            data-ocid="results.home.button"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Exams
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
