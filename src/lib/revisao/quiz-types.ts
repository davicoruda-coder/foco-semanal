export type QuizQuestionType = "multipla_escolha" | "certo_errado";

export interface QuizQuestion {
  id: string;
  statement: string;
  type: QuizQuestionType;
  options: string[]; // 4 alternativas (A, B, C, D) ou ["Certo", "Errado"]
  answerIndex: number; // 0..3 ou 0..1
  explanation: string; // Explicação detalhada do gabarito
  subjectId?: string | null;
  subjectName?: string | null;
}

export type QuizSourceType = "base_interna" | "texto" | "pdf" | "imagem";

export interface QuizSession {
  id: string;
  title: string;
  sourceType: QuizSourceType;
  subjectName?: string;
  questions: QuizQuestion[];
  userAnswers: Record<string, number>; // questionId -> selectedIndex
  createdAt: string;
  completedAt?: string | null;
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
}
