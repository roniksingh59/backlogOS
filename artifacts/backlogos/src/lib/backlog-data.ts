export type Subject = 'Physics' | 'Chemistry' | 'Mathematics';
export type TaskKind = 'learning' | 'practice' | 'revision';

export type Chapter = {
  id: string;
  subject: Subject;
  title: string;
  note: string;
  order: number;
  tag: string;
};

export type PlanTask = {
  id: string;
  kind: TaskKind;
  chapterId: string;
  chapterTitle: string;
  subject: Subject;
  minutes: number;
  isPrerequisite: boolean;
  label: string;
  detail: string;
};

export type PlanDay = {
  day: number;
  theme: string;
  chapterId: string;
  chapterTitle: string;
  subject: Subject;
  isPrerequisite: boolean;
  isRecap: boolean;
  tasks: PlanTask[];
};

export type StudentPlanInput = {
  board: string;
  subjects: Subject[];
  chapterIds: string[];
  minutesPerDay: number;
  goal: string;
  priority: string;
};

export type StudentPlan = StudentPlanInput & {
  plannedChapterIds: string[];
  prerequisiteIds: string[];
  orderReason: string;
  coverageNote: string;
  days: PlanDay[];
  createdAt: string;
};

export const chapters: Chapter[] = [
  { id: 'phy-units', subject: 'Physics', title: 'Units & Measurements', note: 'Dimensions, errors, significant figures', order: 1, tag: 'Start here' },
  { id: 'phy-vectors', subject: 'Physics', title: 'Motion in a Straight Line', note: 'Graphs, equations, relative motion', order: 2, tag: 'Foundation' },
  { id: 'phy-motion-plane', subject: 'Physics', title: 'Motion in a Plane', note: 'Vectors and projectile motion', order: 3, tag: 'Foundation' },
  { id: 'phy-laws', subject: 'Physics', title: 'Laws of Motion', note: 'Free-body diagrams, friction, dynamics', order: 4, tag: 'Core' },
  { id: 'phy-work', subject: 'Physics', title: 'Work, Energy & Power', note: 'Energy conservation and collisions', order: 5, tag: 'Core' },
  { id: 'phy-system', subject: 'Physics', title: 'System of Particles', note: 'Centre of mass and momentum', order: 6, tag: 'Core' },
  { id: 'phy-rotation', subject: 'Physics', title: 'Rotational Motion', note: 'Torque, angular momentum, rolling', order: 7, tag: 'Stretch' },
  { id: 'phy-gravity', subject: 'Physics', title: 'Gravitation', note: 'Orbits, satellites and field', order: 8, tag: 'Core' },
  { id: 'phy-properties', subject: 'Physics', title: 'Mechanical Properties of Matter', note: 'Fluids, elasticity and viscosity', order: 9, tag: 'Core' },
  { id: 'phy-thermo', subject: 'Physics', title: 'Thermodynamics', note: 'Heat, work and the first law', order: 10, tag: 'Core' },
  { id: 'chem-basic', subject: 'Chemistry', title: 'Some Basic Concepts of Chemistry', note: 'Mole concept and stoichiometry', order: 1, tag: 'Start here' },
  { id: 'chem-structure', subject: 'Chemistry', title: 'Structure of Atom', note: 'Models, quantum numbers and orbitals', order: 2, tag: 'Foundation' },
  { id: 'chem-periodic', subject: 'Chemistry', title: 'Classification of Elements', note: 'Periodic trends and table', order: 3, tag: 'Foundation' },
  { id: 'chem-bonding', subject: 'Chemistry', title: 'Chemical Bonding', note: 'Lewis structures and shapes', order: 4, tag: 'Core' },
  { id: 'chem-thermo', subject: 'Chemistry', title: 'Thermodynamics', note: 'Enthalpy and Hess law', order: 5, tag: 'Core' },
  { id: 'math-sets', subject: 'Mathematics', title: 'Sets & Functions', note: 'Notation, mappings and domains', order: 1, tag: 'Start here' },
  { id: 'math-trig', subject: 'Mathematics', title: 'Trigonometric Functions', note: 'Identities, equations and graphs', order: 2, tag: 'Foundation' },
  { id: 'math-complex', subject: 'Mathematics', title: 'Complex Numbers', note: 'Argand plane and algebra', order: 3, tag: 'Core' },
  { id: 'math-sequence', subject: 'Mathematics', title: 'Sequences & Series', note: 'AP, GP and summation', order: 4, tag: 'Core' },
  { id: 'math-straight', subject: 'Mathematics', title: 'Straight Lines', note: 'Slope, forms and distance', order: 5, tag: 'Core' },
];

export const subjectNotes: Record<Subject, string> = {
  Physics: 'Build intuition first, then put it to work.',
  Chemistry: 'Make the patterns visible and memorable.',
  Mathematics: 'Warm up with examples before the hard set.',
};

const kindLabels: Record<TaskKind, string> = {
  learning: 'Learning',
  practice: 'Practice',
  revision: 'Review',
};

const subjectOrder: Subject[] = ['Physics', 'Chemistry', 'Mathematics'];

type PlannedChapter = {
  chapter: Chapter;
  isPrerequisite: boolean;
};

function getPlannedChapters(chapterIds: string[]): {
  planned: PlannedChapter[];
  prerequisiteIds: string[];
} {
  const selected = chapters.filter((chapter) => chapterIds.includes(chapter.id));
  const selectedIds = new Set(selected.map((chapter) => chapter.id));
  const prerequisiteIds = new Set<string>();

  selected.forEach((chapter) => {
    chapters
      .filter(
        (candidate) =>
          candidate.subject === chapter.subject &&
          candidate.order < chapter.order,
      )
      .forEach((candidate) => prerequisiteIds.add(candidate.id));
  });

  const planned = chapters
    .filter(
      (chapter) =>
        selectedIds.has(chapter.id) || prerequisiteIds.has(chapter.id),
    )
    .sort(
      (a, b) =>
        subjectOrder.indexOf(a.subject) - subjectOrder.indexOf(b.subject) ||
        a.order - b.order,
    )
    .map((chapter) => ({
      chapter,
      isPrerequisite: prerequisiteIds.has(chapter.id) && !selectedIds.has(chapter.id),
    }));

  return { planned, prerequisiteIds: [...prerequisiteIds] };
}

export function makePlan(input: StudentPlanInput): StudentPlan {
  const { planned, prerequisiteIds } = getPlannedChapters(input.chapterIds);
  const fallback = {
    chapter: chapters[0],
    isPrerequisite: false,
  };
  const queue = planned.length ? planned : [fallback];
  const learningMinutes = Math.round(input.minutesPerDay * 0.4);
  const practiceMinutes = Math.round(input.minutesPerDay * 0.4);
  const revisionMinutes = input.minutesPerDay - learningMinutes - practiceMinutes;

  const days: PlanDay[] = Array.from({ length: 7 }, (_, index) => {
    const scheduledChapter = queue[index] ?? queue[index % queue.length];
    const focus = scheduledChapter.chapter;
    const isRecap = index >= queue.length;
    const taskDetails = [
      {
        kind: 'learning' as const,
        minutes: learningMinutes,
        label: isRecap
          ? `Rebuild the concept map for ${focus.title}`
          : `Read the core ideas and make a one-page concept sheet`,
      },
      {
        kind: 'practice' as const,
        minutes: practiceMinutes,
        label: isRecap
          ? `Solve a mixed set from ${focus.title} and mark the misses`
          : `Solve 8 focused questions and mark every miss`,
      },
      {
        kind: 'revision' as const,
        minutes: revisionMinutes,
        label: `Close the book, recall the key steps, and review one error`,
      },
    ];

    return {
      day: index + 1,
      theme: isRecap
        ? `Consolidate ${focus.title}`
        : `${focus.subject} · ${focus.title}`,
      chapterId: focus.id,
      chapterTitle: focus.title,
      subject: focus.subject,
      isPrerequisite: scheduledChapter.isPrerequisite,
      isRecap,
      tasks: taskDetails.map((task) => ({
        id: `day-${index + 1}-${task.kind}`,
        kind: task.kind,
        chapterId: focus.id,
        chapterTitle: focus.title,
        subject: focus.subject,
        minutes: task.minutes,
        isPrerequisite: scheduledChapter.isPrerequisite,
        label: task.label,
        detail: `${task.minutes} min · ${task.label}`,
      })),
    };
  });

  const selectedCount = input.chapterIds.length;
  const coverageNote =
    planned.length > 7
      ? `This seven-day prototype starts with the first 7 items in the learning sequence for your ${selectedCount} selected chapter${selectedCount === 1 ? '' : 's'}. ${prerequisiteIds.length} prerequisite${prerequisiteIds.length === 1 ? '' : 's'} come first where needed; later selected chapters stay queued for a later week.`
      : planned.length < 7
        ? `You selected ${selectedCount} chapter${selectedCount === 1 ? '' : 's'}, and the plan adds ${prerequisiteIds.length} prerequisite${prerequisiteIds.length === 1 ? '' : 's'} where needed. The extra days are deliberate consolidation time, not new chapters.`
        : `Every selected chapter fits once this week, with ${prerequisiteIds.length} prerequisite${prerequisiteIds.length === 1 ? '' : 's'} placed first where needed.`;

  return {
    ...input,
    plannedChapterIds: planned.map(({ chapter }) => chapter.id),
    prerequisiteIds,
    orderReason:
      'Foundations come first within each subject, then the selected chapters that build on them. Each day stays with one chapter so the work does not jump between unrelated topics.',
    coverageNote,
    days,
    createdAt: new Date().toISOString(),
  };
}

export { kindLabels };