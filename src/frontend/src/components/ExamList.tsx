import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronRight, Clock, Layers } from "lucide-react";
import { motion } from "motion/react";
import type { PublicExam } from "../backend.d";
import { useActor } from "../hooks/useActor";

interface Props {
  onStartExam: (exam: PublicExam) => void;
}

export default function ExamList({ onStartExam }: Props) {
  const { actor, isFetching } = useActor();

  const { data: exams, isLoading } = useQuery<PublicExam[]>({
    queryKey: ["activeExams"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActiveExams();
    },
    enabled: !!actor && !isFetching,
  });

  const loading = isLoading || isFetching;

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-16 text-center"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
          <Layers className="w-3.5 h-3.5" />
          Online Examination System
        </div>
        <h1 className="text-5xl font-display font-bold text-foreground mb-4 tracking-tight">
          Available <span className="gold-shimmer">Examinations</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Select an exam below to begin. Ensure you have a stable connection and
          sufficient time before starting.
        </p>
      </motion.div>

      {/* Exam cards */}
      {loading ? (
        <div className="space-y-4" data-ocid="exams.loading_state">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : !exams || exams.length === 0 ? (
        <div
          className="text-center py-20 border border-dashed border-border rounded-xl"
          data-ocid="exams.empty_state"
        >
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">
            No exams available at this time.
          </p>
          <p className="text-muted-foreground/60 text-sm mt-2">
            Check back later or contact your administrator.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam, index) => (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.07, duration: 0.3 }}
              data-ocid={`exams.item.${index + 1}`}
              className="group relative bg-card card-glow rounded-xl p-6 flex items-center gap-6 hover:border-primary/40 transition-all duration-200 cursor-pointer"
              onClick={() => onStartExam(exam)}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display font-semibold text-xl text-foreground group-hover:text-primary transition-colors">
                      {exam.title}
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                      {exam.description}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="flex-shrink-0 bg-primary/10 text-primary border-primary/20"
                  >
                    Active
                  </Badge>
                </div>

                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {Number(exam.timeLimitMinutes)} minutes
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {exam.questions.length} questions
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                className="flex-shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                data-ocid={`exams.start.button.${index + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onStartExam(exam);
                }}
              >
                Start
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
