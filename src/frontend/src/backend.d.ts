import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface StudentProfile {
    name: string;
    results: Array<ExamResult>;
    email: string;
    totalExams: bigint;
    averageScore: number;
}
export interface PublicExam {
    id: string;
    title: string;
    createdAt: bigint;
    description: string;
    isActive: boolean;
    timeLimitMinutes: bigint;
    questions: Array<PublicQuestion>;
}
export interface Exam {
    id: string;
    title: string;
    createdAt: bigint;
    description: string;
    isActive: boolean;
    timeLimitMinutes: bigint;
    questions: Array<Question>;
}
export interface PublicQuestion {
    id: string;
    text: string;
    allowMultiple: boolean;
    options: Array<string>;
}
export interface ExamResult {
    id: string;
    studentEmail: string;
    studentName: string;
    answers: Array<Array<bigint>>;
    submittedAt: bigint;
    score: bigint;
    totalQuestions: bigint;
    examId: string;
}
export interface Question {
    id: string;
    text: string;
    correctAnswerIndices: Array<bigint>;
    allowMultiple: boolean;
    options: Array<string>;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createExam(exam: Exam): Promise<void>;
    deleteExam(id: string): Promise<void>;
    getActiveExamById(id: string): Promise<PublicExam | null>;
    getActiveExams(): Promise<Array<PublicExam>>;
    getAllExamResults(): Promise<Array<ExamResult>>;
    getAllStudentProfiles(): Promise<Array<StudentProfile>>;
    getCallerUserRole(): Promise<UserRole>;
    getExam(id: string): Promise<Exam | null>;
    getExamResult(id: string): Promise<ExamResult | null>;
    getExamResultsByExamId(examId: string): Promise<Array<ExamResult>>;
    getExamResultsByStudentEmail(studentEmail: string): Promise<Array<ExamResult>>;
    getStudentProfile(email: string): Promise<StudentProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    submitExamResult(examId: string, studentName: string, studentEmail: string, answers: Array<Array<bigint>>): Promise<{
        score: bigint;
        totalQuestions: bigint;
    }>;
    toggleExamActive(id: string): Promise<void>;
    updateExam(id: string, updatedExam: Exam): Promise<void>;
}
