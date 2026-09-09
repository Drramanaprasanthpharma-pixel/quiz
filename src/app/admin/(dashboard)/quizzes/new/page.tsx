import { PageHeader } from "@/components/ui";
import { QuizBuilder } from "@/components/admin/QuizBuilder";

export default function NewQuizPage() {
  return (
    <div>
      <PageHeader title="Create quiz" description="Add questions, set timers, and publish when you're ready." />
      <QuizBuilder />
    </div>
  );
}
