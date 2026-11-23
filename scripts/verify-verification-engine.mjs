import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT_DIR = process.cwd();

function loadValidationModule() {
  const viteEntry = require.resolve('vite', { paths: [ROOT_DIR, path.join(ROOT_DIR, 'artifacts/backlogos')] });
  const esbuild = require(
    require.resolve('esbuild', {
      paths: [path.dirname(viteEntry), path.join(ROOT_DIR, 'node_modules'), path.join(ROOT_DIR, 'artifacts/backlogos/node_modules')],
    })
  );

  const built = esbuild.buildSync({
    entryPoints: [path.join(ROOT_DIR, 'supabase/functions/_shared/validation.ts')],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
  });

  const mod = { exports: {} };
  new Function('module', 'exports', built.outputFiles[0].text)(mod, mod.exports);
  return mod.exports;
}

const V = loadValidationModule();

const SAMPLE_CONCEPTS = [
  { id: 'phy-work-1', title: 'Work Done by Constant and Variable Force', keyConcepts: ['W = F dot s', 'area under F-x curve'], inCbseSyllabus: true },
  { id: 'phy-work-2', title: 'Work-Energy Theorem', keyConcepts: ['W_net = delta K', 'kinetic energy'], inCbseSyllabus: true },
  { id: 'phy-work-3', title: 'Conservative Forces and Potential Energy', keyConcepts: ['F = -dU/dx', 'spring potential energy'], inCbseSyllabus: true },
  { id: 'phy-work-4', title: 'Collisions in 1D and 2D', keyConcepts: ['elastic collision', 'coefficient of restitution'], inCbseSyllabus: true },
  { id: 'phy-work-dropped', title: 'Relativistic Rocket Mass Correction', keyConcepts: ['Lorentz factor'], inCbseSyllabus: false },
];

function makeValidCandidate(overrides = {}) {
  return {
    conceptId: 'phy-work-2',
    conceptLabel: 'Work-Energy Theorem',
    questionType: 'mcq',
    difficulty: 'medium',
    cognitiveLevel: 'application',
    prompt: 'A block of mass 2 kg moves from rest under a variable net force performing 36 J of total work. What is its final speed?',
    options: [
      { id: 'A', text: '4 m/s' },
      { id: 'B', text: '6 m/s' },
      { id: 'C', text: '9 m/s' },
      { id: 'D', text: '12 m/s' },
    ],
    correctOptionId: 'B',
    explanation: 'By the work-energy theorem, net work equals change in kinetic energy: 36 = 0.5 * 2 * v^2, giving v = 6 m/s.',
    selfCheckPassed: true,
    ...overrides,
  };
}

test('Target question counts follow specification bounds (Objective 3-5, Chapter Mastery 15-25)', () => {
  assert.equal(V.normalizeTargetQuestionCount('OBJECTIVE'), 4);
  assert.equal(V.normalizeTargetQuestionCount('OBJECTIVE', 1), 3);
  assert.equal(V.normalizeTargetQuestionCount('OBJECTIVE', 12), 5);

  assert.equal(V.normalizeTargetQuestionCount('CHAPTER_MASTERY'), 18);
  assert.equal(V.normalizeTargetQuestionCount('CHAPTER_MASTERY', 8), 15);
  assert.equal(V.normalizeTargetQuestionCount('CHAPTER_MASTERY', 40), 25);

  assert.equal(V.normalizeTargetQuestionCount('REVISION'), 6);
  assert.equal(V.normalizeTargetQuestionCount('REVISION', 2), 5);
  assert.equal(V.normalizeTargetQuestionCount('REVISION', 20), 10);
});

test('Question validator enforces format, consistency, syllabus relevance, concept alignment, uniqueness, and ambiguity', () => {
  const ctx = {
    assessmentType: 'OBJECTIVE',
    subjectName: 'Physics',
    chapterTitle: 'Work, Energy and Power',
    grade: '11',
    allowedConcepts: SAMPLE_CONCEPTS,
    excludedConceptTitles: ['Relativistic Rocket Mass Correction'],
    existingPrompts: [],
  };

  // Valid question passes
  const good = V.validateGeneratedQuestion(makeValidCandidate(), ctx);
  assert.equal(good.valid, true);
  assert.equal(good.normalized.conceptId, 'phy-work-2');

  // Bad option count fails format check
  const badFormat = V.validateGeneratedQuestion(
    makeValidCandidate({ options: [{ id: 'A', text: '4 m/s' }, { id: 'B', text: '6 m/s' }] }),
    ctx
  );
  assert.equal(badFormat.valid, false);
  assert.ok(badFormat.reasons.some((r) => r.includes('Format')));

  // Internal answer contradiction fails verification
  const contradicted = V.validateGeneratedQuestion(
    makeValidCandidate({
      correctOptionId: 'A',
      explanation: 'Evaluating the kinetic energy shows the correct option is B (6 m/s).',
    }),
    ctx
  );
  assert.equal(contradicted.valid, false);
  assert.ok(contradicted.reasons.some((r) => r.includes('Answer verification')));

  // Out-of-syllabus leak fails syllabus check
  const outOfSyllabus = V.validateGeneratedQuestion(
    makeValidCandidate({
      prompt: 'Apply Relativistic Rocket Mass Correction to find the kinetic energy of a particle moving near light speed.',
    }),
    ctx
  );
  assert.equal(outOfSyllabus.valid, false);
  assert.ok(outOfSyllabus.reasons.some((r) => r.includes('Syllabus relevance')));

  // Unaligned concept fails concept check
  const unaligned = V.validateGeneratedQuestion(
    makeValidCandidate({
      conceptId: 'unknown-xyz',
      conceptLabel: 'Medieval European Architecture',
      prompt: 'Which cathedral arch style distributes weight vertically into buttresses during medieval construction?',
    }),
    ctx
  );
  assert.equal(unaligned.valid, false);
  assert.ok(unaligned.reasons.some((r) => r.includes('Concept alignment')));

  // Ambiguous All+None combination fails ambiguity check
  const ambiguous = V.validateGeneratedQuestion(
    makeValidCandidate({
      options: [
        { id: 'A', text: '4 m/s' },
        { id: 'B', text: '6 m/s' },
        { id: 'C', text: 'All of the above' },
        { id: 'D', text: 'None of the above' },
      ],
    }),
    ctx
  );
  assert.equal(ambiguous.valid, false);
  assert.ok(ambiguous.reasons.some((r) => r.includes('Ambiguity')));

  // Near-duplicate prompt is rejected
  const dup = V.validateGeneratedQuestion(
    makeValidCandidate({
      prompt: 'A block of mass 2 kg starts from rest under a variable net force performing 36 J of total work; find its final speed.',
    }),
    {
      ...ctx,
      existingPrompts: [makeValidCandidate().prompt],
    }
  );
  assert.equal(dup.valid, false);
  assert.ok(dup.reasons.some((r) => r.includes('Duplicate')));
});

test('sanitizeQuestionsForClient never leaks answer keys or explanations', () => {
  const sanitized = V.sanitizeQuestionsForClient([
    {
      id: 'q-1',
      question_order: 1,
      concept_id: 'phy-work-2',
      concept_label: 'Work-Energy Theorem',
      question_type: 'mcq',
      difficulty: 'medium',
      cognitive_level: 'application',
      prompt: 'Sample prompt?',
      options: [{ id: 'A', text: '1' }, { id: 'B', text: '2' }, { id: 'C', text: '3' }, { id: 'D', text: '4' }],
      correct_option_id: 'B',
      explanation: 'Secret answer rationale',
    },
  ]);

  assert.equal(sanitized.length, 1);
  assert.equal('correct_option_id' in sanitized[0], false);
  assert.equal('correctOptionId' in sanitized[0], false);
  assert.equal('explanation' in sanitized[0], false);
});

test('Server grading separates objective/chapter mastery from study completion and handles concept coverage', () => {
  const questions = [
    { id: 'q1', conceptId: 'phy-work-1', conceptLabel: 'Force Work', prompt: 'Q1' },
    { id: 'q2', conceptId: 'phy-work-2', conceptLabel: 'Work-Energy Theorem', prompt: 'Q2' },
    { id: 'q3', conceptId: 'phy-work-3', conceptLabel: 'Potential Energy', prompt: 'Q3' },
    { id: 'q4', conceptId: 'phy-work-4', conceptLabel: 'Collisions', prompt: 'Q4' },
  ];
  const answerKeys = {
    q1: { questionId: 'q1', correctOptionId: 'A', explanation: 'Exp 1' },
    q2: { questionId: 'q2', correctOptionId: 'B', explanation: 'Exp 2' },
    q3: { questionId: 'q3', correctOptionId: 'C', explanation: 'Exp 3' },
    q4: { questionId: 'q4', correctOptionId: 'D', explanation: 'Exp 4' },
  };

  // Failing a chapter mastery assessment preserves study_completed via MASTERY_PENDING (never resets to NOT_STARTED)
  const failedMastery = V.gradeAssessmentSubmission({
    assessmentType: 'CHAPTER_MASTERY',
    passThresholdPercent: 75,
    requiredConceptCoveragePercent: 70,
    targetConceptIds: ['phy-work-1', 'phy-work-2', 'phy-work-3', 'phy-work-4'],
    questions,
    answerKeysByQuestionId: answerKeys,
    submittedAnswers: [
      { questionId: 'q1', selectedOptionId: 'A' },
      { questionId: 'q2', selectedOptionId: 'A' }, // wrong
      { questionId: 'q3', selectedOptionId: 'A' }, // wrong
      { questionId: 'q4', selectedOptionId: 'A' }, // wrong
    ],
    existingStudyCompleted: true,
    existingChapterStatus: 'STUDY_COMPLETE',
  });

  assert.equal(failedMastery.passed, false);
  assert.equal(failedMastery.scorePercent, 25);
  assert.equal(failedMastery.nextChapterStatus, 'MASTERY_PENDING');
  assert.ok(failedMastery.weakConcepts.includes('Work-Energy Theorem'));

  // Passing requires BOTH score threshold AND adequate concept coverage
  const insufficientCoveragePass = V.gradeAssessmentSubmission({
    assessmentType: 'CHAPTER_MASTERY',
    passThresholdPercent: 75,
    requiredConceptCoveragePercent: 80,
    targetConceptIds: ['phy-work-1', 'phy-work-2', 'phy-work-3', 'phy-work-4', 'phy-work-5'],
    questions,
    answerKeysByQuestionId: answerKeys,
    submittedAnswers: [
      { questionId: 'q1', selectedOptionId: 'A' },
      { questionId: 'q2', selectedOptionId: 'B' },
      { questionId: 'q3', selectedOptionId: 'C' },
      { questionId: 'q4', selectedOptionId: 'A' }, // 75% score, 3/5 = 60% coverage (<80%)
    ],
    existingStudyCompleted: true,
    existingChapterStatus: 'STUDY_COMPLETE',
  });
  assert.equal(insufficientCoveragePass.passed, false);
  assert.equal(insufficientCoveragePass.scorePercent, 75);
  assert.equal(insufficientCoveragePass.conceptCoveragePercent, 60);

  // Full mastery pass transitions chapter to MASTERED
  const passedMastery = V.gradeAssessmentSubmission({
    assessmentType: 'CHAPTER_MASTERY',
    passThresholdPercent: 75,
    requiredConceptCoveragePercent: 70,
    targetConceptIds: ['phy-work-1', 'phy-work-2', 'phy-work-3', 'phy-work-4'],
    questions,
    answerKeysByQuestionId: answerKeys,
    submittedAnswers: [
      { questionId: 'q1', selectedOptionId: 'A' },
      { questionId: 'q2', selectedOptionId: 'B' },
      { questionId: 'q3', selectedOptionId: 'C' },
      { questionId: 'q4', selectedOptionId: 'D' },
    ],
    existingStudyCompleted: true,
    existingChapterStatus: 'STUDY_COMPLETE',
  });
  assert.equal(passedMastery.passed, true);
  assert.equal(passedMastery.nextChapterStatus, 'MASTERED');

  // Objective pass vs fail transitions
  const objPass = V.gradeAssessmentSubmission({
    assessmentType: 'OBJECTIVE',
    passThresholdPercent: 70,
    requiredConceptCoveragePercent: 50,
    targetConceptIds: ['phy-work-1'],
    questions: [questions[0], questions[1], questions[2]],
    answerKeysByQuestionId: answerKeys,
    submittedAnswers: [
      { questionId: 'q1', selectedOptionId: 'A' },
      { questionId: 'q2', selectedOptionId: 'B' },
      { questionId: 'q3', selectedOptionId: 'C' },
    ],
  });
  assert.equal(objPass.nextObjectiveState, 'VERIFIED');

  const objFail = V.gradeAssessmentSubmission({
    assessmentType: 'OBJECTIVE',
    passThresholdPercent: 70,
    requiredConceptCoveragePercent: 50,
    targetConceptIds: ['phy-work-1'],
    questions: [questions[0], questions[1], questions[2]],
    answerKeysByQuestionId: answerKeys,
    submittedAnswers: [
      { questionId: 'q1', selectedOptionId: 'B' },
      { questionId: 'q2', selectedOptionId: 'A' },
      { questionId: 'q3', selectedOptionId: 'C' },
    ],
  });
  assert.equal(objFail.nextObjectiveState, 'NEEDS_RELEARNING');
});

test('Spaced revision schedule uses 1, 3, 7, 14, 30 intervals and adapts on recall decay', () => {
  const step1 = V.computeAdaptiveReviewSchedule({ passed: true, scorePercent: 90, existing: { intervalStep: 0, intervalDays: 1, easeFactor: 2.5 }, todayIso: '2026-11-01' });
  assert.equal(step1.intervalDays, 1);

  const step2 = V.computeAdaptiveReviewSchedule({ passed: true, scorePercent: 90, existing: step1, todayIso: '2026-11-02' });
  assert.equal(step2.intervalDays, 3);

  const step3 = V.computeAdaptiveReviewSchedule({ passed: true, scorePercent: 85, existing: step2, todayIso: '2026-11-05' });
  assert.equal(step3.intervalDays, 7);

  const step4 = V.computeAdaptiveReviewSchedule({ passed: true, scorePercent: 85, existing: step3, todayIso: '2026-11-12' });
  assert.equal(step4.intervalDays, 14);

  const step5 = V.computeAdaptiveReviewSchedule({ passed: true, scorePercent: 92, existing: step4, todayIso: '2026-11-26' });
  assert.equal(step5.intervalDays, 30);

  // Recall drop resets to 1 day and lowers ease factor
  const lapsed = V.computeAdaptiveReviewSchedule({ passed: false, scorePercent: 40, existing: step5, todayIso: '2026-12-26' });
  assert.equal(lapsed.intervalDays, 1);
  assert.ok(lapsed.easeFactor < step5.easeFactor);
});

test('Supabase Edge Functions enforce auth, server-only Gemini model, and key isolation', () => {
  const genFn = fs.readFileSync(path.join(ROOT_DIR, 'supabase/functions/generate-assessment/index.ts'), 'utf8');
  const startFn = fs.readFileSync(path.join(ROOT_DIR, 'supabase/functions/start-assessment/index.ts'), 'utf8');
  const subFn = fs.readFileSync(path.join(ROOT_DIR, 'supabase/functions/submit-assessment/index.ts'), 'utf8');
  const fbFn = fs.readFileSync(path.join(ROOT_DIR, 'supabase/functions/submit-question-feedback/index.ts'), 'utf8');
  const geminiMod = fs.readFileSync(path.join(ROOT_DIR, 'supabase/functions/_shared/gemini-generator.ts'), 'utf8');

  for (const code of [genFn, startFn, subFn, fbFn]) {
    assert.match(code, /requireAuthenticatedUser\(req\)/);
  }

  assert.match(genFn, /question_answer_keys/);
  assert.match(genFn, /sanitizeQuestionsForClient/);
  assert.match(startFn, /sanitizeQuestionsForClient/);
  assert.match(subFn, /gradeAssessmentSubmission/);

  // Gemini SDK compliance check
  assert.match(geminiMod, /gemini-4-hydrogen/);
  assert.match(geminiMod, /'User-Agent': 'aistudio-build'/);
  assert.match(geminiMod, /responseMimeType: 'application\/json'/);
  assert.doesNotMatch(geminiMod, /gemini-1\.5|gemini-2\.0|SchemaType|VITE_/);
});
