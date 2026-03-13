import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Edit2,
  FileText,
  Loader2,
  LogIn,
  Plus,
  Shield,
  ToggleLeft,
  Trash2,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Exam, ExamResult, Question, StudentProfile } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface Props {
  onBack: () => void;
}

type AdminView = "dashboard" | "create-exam" | "edit-exam" | "student-detail";

interface ExamFormQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndices: number[];
  allowMultiple: boolean;
}

interface ExamFormData {
  title: string;
  description: string;
  timeLimitMinutes: number;
  questions: ExamFormQuestion[];
}

function blankForm(): ExamFormData {
  return {
    title: "",
    description: "",
    timeLimitMinutes: 30,
    questions: [],
  };
}

function blankQuestion(): ExamFormQuestion {
  return {
    id: crypto.randomUUID(),
    text: "",
    options: ["", ""],
    correctAnswerIndices: [],
    allowMultiple: false,
  };
}

export default function AdminPanel({ onBack }: Props) {
  const { actor, isFetching } = useActor();
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const queryClient = useQueryClient();

  const [adminView, setAdminView] = useState<AdminView>("dashboard");
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(
    null,
  );
  const [examForm, setExamForm] = useState<ExamFormData>(blankForm());
  const [deleteDialogExamId, setDeleteDialogExamId] = useState<string | null>(
    null,
  );

  // Check admin access
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery<boolean>({
    queryKey: ["isAdmin", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching && !!identity,
  });

  // Exams
  const { data: exams, isLoading: loadingExams } = useQuery<Exam[]>({
    queryKey: ["adminExams"],
    queryFn: async () => {
      if (!actor) return [];
      // We need all exams, but only getActiveExams is public. Admin uses getExam per ID.
      // Actually getActiveExams returns PublicExam. For admin we may need a different approach.
      // We'll use getAllExamResults to get exam IDs and then fetch details.
      // Simpler: use getAllExamResults to get unique examIds, then fetch each.
      // But we don't have a "getAllExams" method. Let's use getActiveExams as PublicExam
      // and for admin editing we'll use getExam(id).
      // We'll store exams as Exam type by converting
      const activeExams = await actor.getActiveExams();
      const fullExams: Exam[] = await Promise.all(
        activeExams.map(async (e) => {
          const full = await actor.getExam(e.id);
          return full ?? { ...e, questions: [] };
        }),
      );
      // Also try to get inactive exams via results
      const results = await actor.getAllExamResults();
      const allIds = [...new Set(results.map((r) => r.examId))];
      const extraExams: Exam[] = [];
      for (const id of allIds) {
        if (!fullExams.find((e) => e.id === id)) {
          const full = await actor.getExam(id);
          if (full) extraExams.push(full);
        }
      }
      return [...fullExams, ...extraExams];
    },
    enabled: !!actor && !isFetching && !!isAdmin,
  });

  const { data: results, isLoading: loadingResults } = useQuery<ExamResult[]>({
    queryKey: ["allResults"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllExamResults();
    },
    enabled: !!actor && !isFetching && !!isAdmin,
  });

  const { data: students, isLoading: loadingStudents } = useQuery<
    StudentProfile[]
  >({
    queryKey: ["allStudents"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllStudentProfiles();
    },
    enabled: !!actor && !isFetching && !!isAdmin,
  });

  const deleteExamMutation = useMutation({
    mutationFn: async (id: string) => {
      await actor!.deleteExam(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminExams"] });
      toast.success("Exam deleted");
      setDeleteDialogExamId(null);
    },
    onError: () => toast.error("Failed to delete exam"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await actor!.toggleExamActive(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminExams"] });
      toast.success("Exam updated");
    },
    onError: () => toast.error("Failed to toggle exam"),
  });

  const saveExamMutation = useMutation({
    mutationFn: async (payload: { isEdit: boolean; exam: Exam }) => {
      if (payload.isEdit) {
        await actor!.updateExam(payload.exam.id, payload.exam);
      } else {
        await actor!.createExam(payload.exam);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminExams"] });
      toast.success(editingExam ? "Exam updated!" : "Exam created!");
      setAdminView("dashboard");
      setExamForm(blankForm());
      setEditingExam(null);
    },
    onError: () => toast.error("Failed to save exam"),
  });

  function startCreate() {
    setExamForm(blankForm());
    setEditingExam(null);
    setAdminView("create-exam");
  }

  function startEdit(exam: Exam) {
    setEditingExam(exam);
    setExamForm({
      title: exam.title,
      description: exam.description,
      timeLimitMinutes: Number(exam.timeLimitMinutes),
      questions: exam.questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: [...q.options],
        correctAnswerIndices: q.correctAnswerIndices.map(Number),
        allowMultiple: q.allowMultiple,
      })),
    });
    setAdminView("edit-exam");
  }

  function handleSaveExam(e: React.FormEvent) {
    e.preventDefault();
    const exam: Exam = {
      id: editingExam?.id ?? crypto.randomUUID(),
      title: examForm.title,
      description: examForm.description,
      timeLimitMinutes: BigInt(examForm.timeLimitMinutes),
      isActive: editingExam?.isActive ?? true,
      createdAt: editingExam?.createdAt ?? BigInt(Date.now()),
      questions: examForm.questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options.filter((o) => o.trim()),
        correctAnswerIndices: q.correctAnswerIndices.map(BigInt),
        allowMultiple: q.allowMultiple,
      })),
    };
    saveExamMutation.mutate({ isEdit: !!editingExam, exam });
  }

  function addQuestion() {
    setExamForm((f) => ({
      ...f,
      questions: [...f.questions, blankQuestion()],
    }));
  }

  function removeQuestion(idx: number) {
    setExamForm((f) => ({
      ...f,
      questions: f.questions.filter((_, i) => i !== idx),
    }));
  }

  function updateQuestion(idx: number, patch: Partial<ExamFormQuestion>) {
    setExamForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i === idx ? { ...q, ...patch } : q,
      ),
    }));
  }

  function addOption(qIdx: number) {
    setExamForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i === qIdx ? { ...q, options: [...q.options, ""] } : q,
      ),
    }));
  }

  function removeOption(qIdx: number, oIdx: number) {
    setExamForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qIdx) return q;
        const options = q.options.filter((_, oi) => oi !== oIdx);
        const correctAnswerIndices = q.correctAnswerIndices
          .filter((ci) => ci !== oIdx)
          .map((ci) => (ci > oIdx ? ci - 1 : ci));
        return { ...q, options, correctAnswerIndices };
      }),
    }));
  }

  function updateOption(qIdx: number, oIdx: number, val: string) {
    setExamForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qIdx) return q;
        const options = q.options.map((o, oi) => (oi === oIdx ? val : o));
        return { ...q, options };
      }),
    }));
  }

  function toggleCorrect(qIdx: number, oIdx: number, allowMultiple: boolean) {
    setExamForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qIdx) return q;
        let ci = [...q.correctAnswerIndices];
        if (allowMultiple) {
          ci = ci.includes(oIdx) ? ci.filter((x) => x !== oIdx) : [...ci, oIdx];
        } else {
          ci = [oIdx];
        }
        return { ...q, correctAnswerIndices: ci };
      }),
    }));
  }

  // Not logged in
  if (!identity) {
    return (
      <div
        className="container mx-auto px-4 py-16 max-w-md text-center"
        data-ocid="admin.panel"
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors mx-auto"
          data-ocid="admin.back.button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="bg-card card-glow rounded-2xl p-10">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Admin Access</h2>
          <p className="text-muted-foreground mb-8 text-sm">
            Sign in with Internet Identity to access the admin dashboard.
          </p>
          <Button
            onClick={login}
            disabled={isLoggingIn}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            data-ocid="admin.login.button"
          >
            {isLoggingIn ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4 mr-2" />
            )}
            Login with Internet Identity
          </Button>
        </div>
      </div>
    );
  }

  // Checking admin
  if (checkingAdmin || isFetching) {
    return (
      <div
        className="container mx-auto px-4 py-16 max-w-md text-center"
        data-ocid="admin.loading_state"
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Verifying admin access...</p>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div
        className="container mx-auto px-4 py-16 max-w-md text-center"
        data-ocid="admin.error_state"
      >
        <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="font-display text-2xl font-bold mb-2">
          Access Restricted
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Your account does not have admin privileges.
        </p>
        <Button
          variant="outline"
          onClick={onBack}
          data-ocid="admin.back.button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  // Exam form view
  if (adminView === "create-exam" || adminView === "edit-exam") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <button
          type="button"
          onClick={() => {
            setAdminView("dashboard");
            setExamForm(blankForm());
          }}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
          data-ocid="admin.exam-form.back.button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </button>

        <h2 className="font-display text-3xl font-bold mb-8">
          {editingExam ? "Edit Exam" : "Create New Exam"}
        </h2>

        <form onSubmit={handleSaveExam} className="space-y-8">
          {/* Basic info */}
          <div className="bg-card card-glow rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Exam Details</h3>
            <div className="space-y-2">
              <Label htmlFor="exam-title">Title</Label>
              <Input
                id="exam-title"
                value={examForm.title}
                onChange={(e) =>
                  setExamForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g., Introduction to Biology"
                required
                data-ocid="admin.exam.title.input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-desc">Description</Label>
              <Textarea
                id="exam-desc"
                value={examForm.description}
                onChange={(e) =>
                  setExamForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Brief description of this exam..."
                rows={3}
                data-ocid="admin.exam.description.textarea"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-time">Time Limit (minutes)</Label>
              <Input
                id="exam-time"
                type="number"
                min="1"
                max="300"
                value={examForm.timeLimitMinutes}
                onChange={(e) =>
                  setExamForm((f) => ({
                    ...f,
                    timeLimitMinutes: Number(e.target.value),
                  }))
                }
                required
                data-ocid="admin.exam.timelimit.input"
                className="w-32"
              />
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                Questions ({examForm.questions.length})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addQuestion}
                data-ocid="admin.exam.add-question.button"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Question
              </Button>
            </div>

            {examForm.questions.map((q, qIdx) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card card-glow rounded-xl p-6 space-y-4"
                data-ocid={`admin.question.panel.${qIdx + 1}`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-1">
                    {qIdx + 1}
                  </span>
                  <div className="flex-1 space-y-3">
                    <Input
                      value={q.text}
                      onChange={(e) =>
                        updateQuestion(qIdx, { text: e.target.value })
                      }
                      placeholder="Question text..."
                      required
                      data-ocid={`admin.question.text.input.${qIdx + 1}`}
                    />

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={q.allowMultiple}
                        onCheckedChange={(v) =>
                          updateQuestion(qIdx, {
                            allowMultiple: v,
                            correctAnswerIndices: [],
                          })
                        }
                        data-ocid={`admin.question.multiple.switch.${qIdx + 1}`}
                      />
                      <Label className="text-sm text-muted-foreground cursor-pointer">
                        Allow multiple correct answers
                      </Label>
                    </div>

                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={opt || `q${qIdx}-opt-${oIdx}`}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            checked={q.correctAnswerIndices.includes(oIdx)}
                            onCheckedChange={() =>
                              toggleCorrect(qIdx, oIdx, q.allowMultiple)
                            }
                            data-ocid={`admin.question.correct.checkbox.${qIdx + 1}`}
                            title="Mark as correct answer"
                          />
                          <Input
                            value={opt}
                            onChange={(e) =>
                              updateOption(qIdx, oIdx, e.target.value)
                            }
                            placeholder={`Option ${oIdx + 1}`}
                            className="flex-1"
                            data-ocid={`admin.question.option.input.${oIdx + 1}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(qIdx, oIdx)}
                            disabled={q.options.length <= 2}
                            data-ocid={`admin.question.remove-option.button.${oIdx + 1}`}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addOption(qIdx)}
                        className="text-muted-foreground"
                        data-ocid={`admin.question.add-option.button.${qIdx + 1}`}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Add option
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuestion(qIdx)}
                    className="text-muted-foreground hover:text-destructive flex-shrink-0"
                    data-ocid={`admin.question.delete.button.${qIdx + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}

            {examForm.questions.length === 0 && (
              <div
                className="text-center py-8 border border-dashed border-border rounded-xl text-muted-foreground text-sm"
                data-ocid="admin.questions.empty_state"
              >
                No questions added yet. Click "Add Question" to get started.
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAdminView("dashboard");
                setExamForm(blankForm());
              }}
              data-ocid="admin.exam-form.cancel.button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveExamMutation.isPending}
              className="bg-primary text-primary-foreground"
              data-ocid="admin.exam-form.save.button"
            >
              {saveExamMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingExam ? "Update Exam" : "Create Exam"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // Student detail
  if (adminView === "student-detail" && selectedStudent) {
    const avgPct = Math.round(selectedStudent.averageScore * 100);
    return (
      <div
        className="container mx-auto px-4 py-8 max-w-3xl"
        data-ocid="admin.student.panel"
      >
        <button
          type="button"
          onClick={() => setAdminView("dashboard")}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
          data-ocid="admin.student.back.button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to students
        </button>

        <div className="bg-card card-glow rounded-xl p-6 mb-6">
          <h2 className="font-display text-2xl font-bold">
            {selectedStudent.name}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {selectedStudent.email}
          </p>
          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {Number(selectedStudent.totalExams)}
              </div>
              <div className="text-xs text-muted-foreground">Exams Taken</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{avgPct}%</div>
              <div className="text-xs text-muted-foreground">Avg Score</div>
            </div>
          </div>
        </div>

        <h3 className="font-semibold mb-4">Exam History</h3>
        <div className="space-y-3">
          {selectedStudent.results.map((r, idx) => {
            const pct =
              Number(r.totalQuestions) > 0
                ? Math.round((Number(r.score) / Number(r.totalQuestions)) * 100)
                : 0;
            return (
              <div
                key={r.id}
                className="bg-card card-glow rounded-lg p-4 flex items-center justify-between"
                data-ocid={`admin.student.result.item.${idx + 1}`}
              >
                <div>
                  <p className="font-medium text-sm">{r.examId}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(
                      Number(r.submittedAt) / 1_000_000,
                    ).toLocaleDateString()}
                  </p>
                </div>
                <Badge
                  className={
                    pct >= 60
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }
                >
                  {Number(r.score)}/{Number(r.totalQuestions)} ({pct}%)
                </Badge>
              </div>
            );
          })}
          {selectedStudent.results.length === 0 && (
            <p
              className="text-muted-foreground text-sm text-center py-6"
              data-ocid="admin.student.results.empty_state"
            >
              No results yet.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div
      className="container mx-auto px-4 py-8 max-w-6xl"
      data-ocid="admin.dashboard.panel"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage exams, view results and student profiles
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
          data-ocid="admin.back.button"
        >
          <ArrowLeft className="w-4 h-4" />
          Portal
        </button>
      </div>

      <Tabs defaultValue="exams" data-ocid="admin.dashboard.tab">
        <TabsList className="mb-6">
          <TabsTrigger value="exams" data-ocid="admin.exams.tab">
            <FileText className="w-4 h-4 mr-1.5" />
            Exams
          </TabsTrigger>
          <TabsTrigger value="results" data-ocid="admin.results.tab">
            <BarChart2 className="w-4 h-4 mr-1.5" />
            Results
          </TabsTrigger>
          <TabsTrigger value="students" data-ocid="admin.students.tab">
            <Users className="w-4 h-4 mr-1.5" />
            Students
          </TabsTrigger>
        </TabsList>

        {/* Exams tab */}
        <TabsContent value="exams">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">All Exams</h2>
            <Button
              size="sm"
              onClick={startCreate}
              className="bg-primary text-primary-foreground"
              data-ocid="admin.create-exam.button"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Exam
            </Button>
          </div>

          {loadingExams ? (
            <div className="space-y-3" data-ocid="admin.exams.loading_state">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !exams || exams.length === 0 ? (
            <div
              className="text-center py-12 border border-dashed border-border rounded-xl text-muted-foreground"
              data-ocid="admin.exams.empty_state"
            >
              No exams yet. Create your first exam.
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map((exam, idx) => (
                <div
                  key={exam.id}
                  className="bg-card card-glow rounded-lg p-4 flex items-center gap-4"
                  data-ocid={`admin.exam.item.${idx + 1}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{exam.title}</p>
                      <Badge
                        className={
                          exam.isActive
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {exam.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {exam.questions.length} questions ·{" "}
                      {Number(exam.timeLimitMinutes)} min
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => startEdit(exam)}
                      data-ocid={`admin.exam.edit.button.${idx + 1}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => toggleActiveMutation.mutate(exam.id)}
                      data-ocid={`admin.exam.toggle.button.${idx + 1}`}
                    >
                      <ToggleLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:text-destructive"
                      onClick={() => setDeleteDialogExamId(exam.id)}
                      data-ocid={`admin.exam.delete.button.${idx + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Results tab */}
        <TabsContent value="results">
          <h2 className="font-semibold mb-4">All Submissions</h2>
          {loadingResults ? (
            <div data-ocid="admin.results.loading_state">
              <Skeleton className="h-48 w-full" />
            </div>
          ) : !results || results.length === 0 ? (
            <div
              className="text-center py-12 border border-dashed border-border rounded-xl text-muted-foreground"
              data-ocid="admin.results.empty_state"
            >
              No submissions yet.
            </div>
          ) : (
            <div
              className="bg-card card-glow rounded-xl overflow-hidden"
              data-ocid="admin.results.table"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, idx) => {
                    const pct =
                      Number(r.totalQuestions) > 0
                        ? Math.round(
                            (Number(r.score) / Number(r.totalQuestions)) * 100,
                          )
                        : 0;
                    return (
                      <TableRow
                        key={r.id}
                        data-ocid={`admin.result.row.${idx + 1}`}
                      >
                        <TableCell className="font-medium">
                          {r.studentName}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {r.studentEmail}
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[160px]">
                          {r.examId}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              pct >= 60
                                ? "bg-success/10 text-success border-success/20"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            }
                          >
                            {Number(r.score)}/{Number(r.totalQuestions)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(
                            Number(r.submittedAt) / 1_000_000,
                          ).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Students tab */}
        <TabsContent value="students">
          <h2 className="font-semibold mb-4">Student Profiles</h2>
          {loadingStudents ? (
            <div data-ocid="admin.students.loading_state">
              <Skeleton className="h-48 w-full" />
            </div>
          ) : !students || students.length === 0 ? (
            <div
              className="text-center py-12 border border-dashed border-border rounded-xl text-muted-foreground"
              data-ocid="admin.students.empty_state"
            >
              No student profiles yet.
            </div>
          ) : (
            <div className="space-y-3" data-ocid="admin.students.list">
              {students.map((s, idx) => (
                <button
                  key={s.email}
                  type="button"
                  className="w-full bg-card card-glow rounded-lg p-4 flex items-center gap-4 hover:border-primary/40 transition-all text-left"
                  onClick={() => {
                    setSelectedStudent(s);
                    setAdminView("student-detail");
                  }}
                  data-ocid={`admin.student.item.${idx + 1}`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-sm">
                      {s.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-primary">
                      {Math.round(s.averageScore * 100)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Number(s.totalExams)} exams
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteDialogExamId}
        onOpenChange={() => setDeleteDialogExamId(null)}
      >
        <DialogContent data-ocid="admin.delete-exam.dialog">
          <DialogHeader>
            <DialogTitle>Delete Exam</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Are you sure you want to delete this exam? This action cannot be
            undone.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogExamId(null)}
              data-ocid="admin.delete-exam.cancel.button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteDialogExamId &&
                deleteExamMutation.mutate(deleteDialogExamId)
              }
              disabled={deleteExamMutation.isPending}
              data-ocid="admin.delete-exam.confirm.button"
            >
              {deleteExamMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
