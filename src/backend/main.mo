import Text "mo:core/Text";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Map "mo:core/Map";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  module Question {
    public func compare(q1 : Question, q2 : Question) : Order.Order {
      Text.compare(q1.id, q2.id);
    };
  };

  type Question = {
    id : Text;
    text : Text;
    options : [Text];
    correctAnswerIndices : [Nat];
    allowMultiple : Bool;
  };

  type Exam = {
    id : Text;
    title : Text;
    description : Text;
    timeLimitMinutes : Nat;
    questions : [Question];
    isActive : Bool;
    createdAt : Int;
  };

  module Exam {
    public func compare(e1 : Exam, e2 : Exam) : Order.Order {
      Text.compare(e1.id, e2.id);
    };
  };

  type ExamResult = {
    id : Text;
    examId : Text;
    studentName : Text;
    studentEmail : Text;
    answers : [[Nat]];
    score : Nat;
    totalQuestions : Nat;
    submittedAt : Int;
  };

  module ExamResult {
    public func compare(r1 : ExamResult, r2 : ExamResult) : Order.Order {
      Text.compare(r1.id, r2.id);
    };
  };

  type StudentProfile = {
    email : Text;
    name : Text;
    results : [ExamResult];
    totalExams : Nat;
    averageScore : Float;
  };

  // Public exam type without correct answers
  type PublicQuestion = {
    id : Text;
    text : Text;
    options : [Text];
    allowMultiple : Bool;
  };

  type PublicExam = {
    id : Text;
    title : Text;
    description : Text;
    timeLimitMinutes : Nat;
    questions : [PublicQuestion];
    isActive : Bool;
    createdAt : Int;
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let exams = Map.empty<Text, Exam>();
  let examResults = Map.empty<Text, ExamResult>();

  // -------- ADMIN FUNCTIONS (Protected) --------

  public shared ({ caller }) func createExam(exam : Exam) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create exams");
    };
    exams.add(exam.id, exam);
  };

  public shared ({ caller }) func updateExam(id : Text, updatedExam : Exam) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update exams");
    };
    if (not exams.containsKey(id)) {
      Runtime.trap("Exam does not exist");
    };
    exams.add(id, updatedExam);
  };

  public shared ({ caller }) func deleteExam(id : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete exams");
    };
    if (not exams.containsKey(id)) {
      Runtime.trap("Exam does not exist");
    };
    exams.remove(id);
  };

  public shared ({ caller }) func toggleExamActive(id : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can toggle exams");
    };
    switch (exams.get(id)) {
      case (null) { Runtime.trap("Exam does not exist") };
      case (?exam) {
        let updatedExam = {
          id = exam.id;
          title = exam.title;
          description = exam.description;
          timeLimitMinutes = exam.timeLimitMinutes;
          questions = exam.questions.sort();
          isActive = not exam.isActive;
          createdAt = exam.createdAt;
        };
        exams.add(id, updatedExam);
      };
    };
  };

  public query ({ caller }) func getExamResultsByExamId(examId : Text) : async [ExamResult] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view exam results");
    };
    let results = examResults.values();
    results.toArray().filter(
      func(result) { result.examId == examId }
    );
  };

  public query ({ caller }) func getExamResultsByStudentEmail(studentEmail : Text) : async [ExamResult] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view exam results");
    };
    let results = examResults.values();
    results.toArray().filter(
      func(result) { result.studentEmail == studentEmail }
    );
  };

  public query ({ caller }) func getAllExamResults() : async [ExamResult] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view all exam results");
    };
    examResults.values().toArray().sort();
  };

  public query ({ caller }) func getAllStudentProfiles() : async [StudentProfile] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view all student profiles");
    };
    let students = Map.empty<Text, StudentProfile>();

    for (result in examResults.values()) {
      switch (students.get(result.studentEmail)) {
        case (null) {
          let profile : StudentProfile = {
            email = result.studentEmail;
            name = result.studentName;
            results = [result];
            totalExams = 1;
            averageScore = result.score.toFloat();
          };
          students.add(result.studentEmail, profile);
        };
        case (?existing) {
          var totalScore = 0.0;
          let mapped = existing.results.map(
            func(oldResult) {
              totalScore += oldResult.score.toFloat();
              oldResult;
            }
          );
          let allResults = mapped.concat([result]);
          let totalExams = existing.totalExams + 1;
          totalScore += result.score.toFloat();
          let averageScore = totalScore / totalExams.toFloat();

          let updatedProfile : StudentProfile = {
            email = existing.email;
            name = existing.name;
            results = allResults.sort();
            totalExams;
            averageScore;
          };
          students.add(result.studentEmail, updatedProfile);
        };
      };
    };

    students.values().toArray();
  };

  public query ({ caller }) func getExam(id : Text) : async ?Exam {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view full exam details with answers");
    };
    exams.get(id);
  };

  public query ({ caller }) func getExamResult(id : Text) : async ?ExamResult {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view exam results");
    };
    examResults.get(id);
  };

  // -------- PUBLIC FUNCTIONS --------

  public query ({ caller }) func getActiveExams() : async [PublicExam] {
    let activeExams = exams.values().toArray().filter(
      func(exam) { exam.isActive }
    );
    activeExams.map(stripCorrectAnswers);
  };

  public query ({ caller }) func getActiveExamById(id : Text) : async ?PublicExam {
    switch (exams.get(id)) {
      case (null) { null };
      case (?exam) {
        if (not exam.isActive) {
          Runtime.trap("Exam is not active");
        };
        ?stripCorrectAnswers(exam);
      };
    };
  };

  public shared ({ caller }) func submitExamResult(
    examId : Text,
    studentName : Text,
    studentEmail : Text,
    answers : [[Nat]]
  ) : async { score : Nat; totalQuestions : Nat } {
    switch (exams.get(examId)) {
      case (null) { Runtime.trap("Exam does not exist") };
      case (?exam) {
        if (not exam.isActive) {
          Runtime.trap("Exam is not active");
        };
        if (answers.size() != exam.questions.size()) {
          Runtime.trap("Number of answers does not match questions");
        };

        let score = calculateScore(exam.questions, answers);

        let result : ExamResult = {
          id = Time.now().toText();
          examId;
          studentName;
          studentEmail;
          answers;
          score;
          totalQuestions = exam.questions.size();
          submittedAt = Time.now();
        };

        examResults.add(result.id, result);
        { score; totalQuestions = exam.questions.size() };
      };
    };
  };

  public query ({ caller }) func getStudentProfile(email : Text) : async ?StudentProfile {
    let results = examResults.values().toArray().filter(
      func(result) { result.studentEmail == email }
    );

    if (results.size() == 0) {
      return null;
    };

    let totalExams = results.size();
    var totalScore = 0.0;

    let mapped = results.map(
      func(result) {
        totalScore += result.score.toFloat();
        result;
      }
    );

    let averageScore = if (totalExams > 0) {
      totalScore / totalExams.toFloat();
    } else {
      0.0;
    };

    let profile : StudentProfile = {
      email;
      name = results[0].studentName;
      results = mapped.sort();
      totalExams;
      averageScore;
    };

    ?profile;
  };

  // -------- HELPER FUNCTIONS --------

  func stripCorrectAnswers(exam : Exam) : PublicExam {
    let publicQuestions = exam.questions.map(
      func(q : Question) : PublicQuestion {
        {
          id = q.id;
          text = q.text;
          options = q.options;
          allowMultiple = q.allowMultiple;
        }
      }
    );

    {
      id = exam.id;
      title = exam.title;
      description = exam.description;
      timeLimitMinutes = exam.timeLimitMinutes;
      questions = publicQuestions;
      isActive = exam.isActive;
      createdAt = exam.createdAt;
    };
  };

  func calculateScore(questions : [Question], answers : [[Nat]]) : Nat {
    var score = 0;
    let answersSize = answers.size();

    for (i in Nat.range(0, answersSize)) {
      let question = questions[i];
      let answer = answers[i];

      if (not question.allowMultiple) {
        if (answer.size() == 1 and question.correctAnswerIndices.size() == 1) {
          if (answer[0] == question.correctAnswerIndices[0]) {
            score += 1;
          };
        };
      } else {
        if (arraysAreEqual(answer, question.correctAnswerIndices)) {
          score += 1;
        };
      };
    };

    score;
  };

  func arraysAreEqual(a1 : [Nat], a2 : [Nat]) : Bool {
    if (a1.size() != a2.size()) { return false };

    let sortedA1 = a1.sort();
    let sortedA2 = a2.sort();

    let size = sortedA1.size();

    let indices = List.fromIter<Nat>(Nat.range(0, size)).toArray();
    for (i in indices.values()) {
      if (sortedA1[i] != sortedA2[i]) { return false };
    };

    true;
  };
};
