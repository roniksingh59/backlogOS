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
  label: string;
  detail: string;
};

export type PlanDay = {
  day: number;
  theme: string;
  tasks: PlanTask[];
};

export type StudentPlan = {
  board: string;
  subjects: Subject[];
  chapterIds: string[];
  minutesPerDay: number;
  goal: string;
  priority: string;
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
  learning: 'Learn',
  practice: 'Practice',
  revision: 'Review',
};

export function makePlan(input: Omit<StudentPlan, 'days' | 'createdAt'>): StudentPlan {
  const chosen = input.chapterIds
    .map((id) => chapters.find((chapter) => chapter.id === id))
    .filter((chapter): chapter is Chapter => Boolean(chapter))
    .sort((a, b) => a.order - b.order || a.subject.localeCompare(b.subject));

  const days: PlanDay[] = Array.from({ length: 7 }, (_, index) => {
    const chapter = chosen[index % Math.max(chosen.length, 1)];
    const second = chosen[(index + 1) % Math.max(chosen.length, 1)];
    const focus = chapter ?? chapters[0];
    const support = second ?? focus;
    const labels = [
      `Read the core ideas in ${focus.title}`,
      `Solve a focused set from ${support.title}`,
      `Close your book and recall the key steps from ${focus.title}`,
    ];
    const details = [
      `${Math.max(20, Math.round(input.minutesPerDay * 0.42))} min • Make a one-page concept sheet`,
      `${Math.max(20, Math.round(input.minutesPerDay * 0.42))} min • Try 8–12 questions, then mark the misses`,
      `${Math.max(10, input.minutesPerDay - Math.round(input.minutesPerDay * 0.84))} min • Revisit formulas and one error`,
    ];
    return {
      day: index + 1,
      theme: index === 0 ? `Clear the runway with ${focus.title}` : `${focus.subject} · ${focus.title}`,
      tasks: (['learning', 'practice', 'revision'] as TaskKind[]).map((kind, taskIndex) => ({
        id: `day-${index + 1}-${kind}`,
        kind,
        label: labels[taskIndex],
        detail: details[taskIndex],
      })),
    };
  });

  return { ...input, days, createdAt: new Date().toISOString() };
}

export { kindLabels };