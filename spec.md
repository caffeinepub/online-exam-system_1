# Online Exam System

## Current State
No backend code exists. Only scaffolding and UI library files are present. Previous deployment failed.

## Requested Changes (Diff)

### Add
- Full Motoko backend with exam and student management
- React frontend for taking exams (students) and managing exams (admins)

### Modify
- N/A (greenfield build)

### Remove
- N/A

## Implementation Plan

### Backend (Motoko)
- Exam type: id, title, description, timeLimit (minutes), questions list
- Question type: id, text, options (list of strings), correctAnswers (list of Nat - indices), allowMultiple
- ExamResult type: id, examId, studentName, studentEmail, answers (list of list of Nat), score, totalQuestions, submittedAt
- StudentProfile derived from ExamResults grouped by studentEmail
- CRUD for exams (admin)
- Submit exam result (public)
- Query exam results by student or exam (admin)
- Authorization: admin role required to create/edit exams and view all results

### Frontend
- Student view: list available exams, take timed exam, see score after submit
- Admin view: login, create/edit/delete exams, add questions, view results per exam, view student profiles with history
- Navigation between student and admin areas
