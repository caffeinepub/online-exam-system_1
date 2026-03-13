import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  Loader2,
  Mail,
  Send,
  User,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { PublicExam } from "../backend.d";
import { useActor } from "../hooks/useActor";

interface Props {
  exam: PublicExam;
  onSubmitted: (result: { score: bigint; totalQuestions: bigint }) => void;
  onBack: () => void;
}

type Phase = "student-info" | "taking";

export default function TakeExam({ exam, onSubmitted, onBack }: Props) {
  const { actor } = useActor();
  const [phase, setPhase] = useState<Phase>("student-info");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  // answers[i] = set of selected option indices for question i
  const [answers, setAnswers] = useState<Set<number>[]>(
    exam.questions.map(() => new Set<number>()),
  );
  const [timeLeft, setTimeLeft] = useState(Number(exam.timeLimitMinutes) * 60);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const handleSubmit = useCallback(async () => {
    if (!actor) return;
    setSubmitting(true);
    try {
      const answersPayload: Array<Array<bigint>> = answers.map((answerSet) =>
        Array.from(answerSet).map(BigInt),
      );
      const result = await actor.submitExamResult(
        exam.id,
        studentName,
        studentEmail,
        answersPayload,
      );
      onSubmitted(result);
    } catch {
      toast.error("Failed to submit exam. Please try again.");
      setSubmitting(false);
    }
  }, [actor, answers, exam.id, studentEmail, studentName, onSubmitted]);

  // Countdown timer
  useEffect(() => {
    if (phase !== "taking") return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, timeLeft, handleSubmit]);

  function handleStartExam(e: React.FormEvent) {
    e.preventDefault();
    if (!studentName.trim() || !studentEmail.trim()) {
      toast.error("Please fill in your name and email.");
      return;
    }
    setPhase("taking");
  }

  function toggleAnswer(
    questionIndex: number,
    optionIndex: number,
    allowMultiple: boolean,
  ) {
    setAnswers((prev) => {
      const next = prev.map((s) => new Set(s));
      if (allowMultiple) {
        if (next[questionIndex].has(optionIndex)) {
          next[questionIndex].delete(optionIndex);
        } else {
          next[questionIndex].add(optionIndex);
        }
      } else {
        next[questionIndex] = new Set([optionIndex]);
      }
      return next;
    });
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timePercent = (timeLeft / (Number(exam.timeLimitMinutes) * 60)) * 100;
  const isTimeLow = timeLeft < 60;

  if (phase === "student-info") {
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors"
          data-ocid="take-exam.back.button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to exams
        </button>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card card-glow rounded-2xl p-8"
        >
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-foreground mb-1">
              {exam.title}
            </h2>
            <p className="text-muted-foreground text-sm">{exam.description}</p>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-8">
            <Clock className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">
                {Number(exam.timeLimitMinutes)} minute
              </span>{" "}
              time limit · {exam.questions.length} questions
            </p>
          </div>

          <form onSubmit={handleStartExam} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="student-name"
                className="text-foreground font-medium"
              >
                <User className="w-3.5 h-3.5 inline mr-1.5" />
                Full Name
              </Label>
              <Input
                id="student-name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter your full name"
                required
                data-ocid="take-exam.name.input"
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="student-email"
                className="text-foreground font-medium"
              >
                <Mail className="w-3.5 h-3.5 inline mr-1.5" />
                Email Address
              </Label>
              <Input
                id="student-email"
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="Enter your email"
                required
                data-ocid="take-exam.email.input"
                className="bg-input border-border"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              data-ocid="take-exam.start.button"
            >
              Begin Examination
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Taking phase
  const q = exam.questions[currentQuestion];
  const totalQ = exam.questions.length;
  const answered = answers.filter((s) => s.size > 0).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Timer + progress */}
      <div className="mb-6 bg-card card-glow rounded-xl p-4 sticky top-20 z-40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Question {currentQuestion + 1} of {totalQ} · {answered} answered
          </span>
          <span
            className={`font-mono font-bold text-sm flex items-center gap-1.5 ${
              isTimeLow ? "text-destructive" : "text-primary"
            }`}
          >
            {isTimeLow && <AlertCircle className="w-3.5 h-3.5" />}
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </span>
        </div>
        <Progress
          value={timePercent}
          className={`h-1.5 ${isTimeLow ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"}`}
          data-ocid="take-exam.timer.loading_state"
        />
      </div>

      {/* Question */}
      <motion.div
        key={currentQuestion}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-card card-glow rounded-2xl p-8 mb-6"
        data-ocid="take-exam.question.panel"
      >
        <div className="flex items-start gap-3 mb-6">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
            {currentQuestion + 1}
          </span>
          <div>
            <p className="text-foreground font-medium text-lg leading-relaxed">
              {q.text}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {q.allowMultiple ? "Select all that apply" : "Select one answer"}
            </p>
          </div>
        </div>

        {q.allowMultiple ? (
          <div className="space-y-3">
            {q.options.map((opt, oi) => (
              <div
                key={opt || `opt-${oi}`}
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                  answers[currentQuestion].has(oi)
                    ? "border-primary/50 bg-primary/8"
                    : "border-border hover:border-primary/30 hover:bg-muted/30"
                }`}
                data-ocid={`take-exam.option.checkbox.${oi + 1}`}
                onClick={() => toggleAnswer(currentQuestion, oi, true)}
                onKeyDown={(e) =>
                  e.key === "Enter" || e.key === " "
                    ? toggleAnswer(currentQuestion, oi, true)
                    : null
                }
              >
                <Checkbox
                  checked={answers[currentQuestion].has(oi)}
                  onCheckedChange={() =>
                    toggleAnswer(currentQuestion, oi, true)
                  }
                />
                <span className="text-foreground text-sm">{opt}</span>
              </div>
            ))}
          </div>
        ) : (
          <RadioGroup
            value={
              answers[currentQuestion].size > 0
                ? String([...answers[currentQuestion]][0])
                : ""
            }
            onValueChange={(val) =>
              toggleAnswer(currentQuestion, Number(val), false)
            }
            className="space-y-3"
          >
            {q.options.map((opt, oi) => (
              <div
                key={opt || `opt-${oi}`}
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                  answers[currentQuestion].has(oi)
                    ? "border-primary/50 bg-primary/8"
                    : "border-border hover:border-primary/30 hover:bg-muted/30"
                }`}
                data-ocid={`take-exam.option.radio.${oi + 1}`}
              >
                <RadioGroupItem value={String(oi)} id={`opt-${oi}`} />
                <span className="text-foreground text-sm">{opt}</span>
              </div>
            ))}
          </RadioGroup>
        )}
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
            data-ocid="take-exam.prev.button"
          >
            Previous
          </Button>
          {currentQuestion < totalQ - 1 && (
            <Button
              variant="outline"
              onClick={() =>
                setCurrentQuestion((q) => Math.min(totalQ - 1, q + 1))
              }
              data-ocid="take-exam.next.button"
            >
              Next
            </Button>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          data-ocid="take-exam.submit.button"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          {submitting ? "Submitting..." : "Submit Exam"}
        </Button>
      </div>

      {/* Question nav dots */}
      <div className="mt-6 flex flex-wrap gap-1.5">
        {exam.questions.map((q, idx) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setCurrentQuestion(idx)}
            className={`w-7 h-7 rounded text-xs font-medium transition-all ${
              idx === currentQuestion
                ? "bg-primary text-primary-foreground"
                : answers[idx].size > 0
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            data-ocid={`take-exam.question.${idx + 1}`}
          >
            {idx + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
