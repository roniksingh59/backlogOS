import { chapters, type Subject } from './backlog-data';

export interface PrerequisiteNode {
  chapterId: string;
  prerequisites: string[]; // IDs of chapters that must be done first
  dependents: string[]; // IDs of chapters that depend on this
  isCrossSubject?: boolean;
  notes?: string;
}

// Exhaustive Class 11 PCM Prerequisite and Dependency Graph
export const PREREQUISITE_GRAPH: Record<string, string[]> = {
  // --- PHYSICS ---
  'phy-world': [],
  'phy-units': [],
  'phy-vectors': ['phy-units', 'math-trig'], // Motion in a straight line uses trig and units
  'phy-motion-plane': ['phy-vectors'], // Projectile & vectors
  'phy-laws': ['phy-vectors', 'phy-motion-plane'], // Newton laws need vector resolution
  'phy-work': ['phy-laws'], // Work Energy Power needs FBD & Newton laws
  'phy-system': ['phy-laws', 'phy-work'], // Centre of mass
  'phy-rotation': ['phy-system', 'phy-work'], // Rotational dynamics needs CM and energy
  'phy-gravity': ['phy-laws', 'phy-work'], // Planetary orbits need Newton laws & energy
  'phy-solids': ['phy-laws'], // Stress, strain, Hooke's law
  'phy-fluids': ['phy-laws', 'phy-work'], // Pascal, Bernoulli requires energy
  'phy-thermal': ['phy-units'], // Calorimetry
  'phy-thermo': ['phy-thermal', 'phy-work'], // 1st and 2nd laws
  'phy-kinetic': ['phy-thermo'], // Kinetic theory of gases
  'phy-oscillations': ['phy-laws', 'phy-work', 'math-trig'], // SHM needs force, energy, trig
  'phy-waves': ['phy-oscillations'], // Superposition, sound waves

  // --- CHEMISTRY ---
  'chem-basic': [], // Mole concept & stoichiometry
  'chem-structure': ['chem-basic'], // Quantum numbers, electronic configuration
  'chem-periodic': ['chem-structure'], // Periodic trends
  'chem-bonding': ['chem-periodic', 'chem-structure'], // VSEPR, hybridization, MO theory
  'chem-states': ['chem-basic'], // Gas laws
  'chem-thermo': ['chem-bonding', 'chem-basic'], // Enthalpy, entropy, Gibbs free energy
  'chem-equilibrium': ['chem-thermo', 'chem-basic'], // Kc, Kp, pH, buffer solutions
  'chem-redox': ['chem-basic', 'chem-structure'], // Oxidation numbers & balancing
  'chem-hydrogen': ['chem-periodic'],
  'chem-sblock': ['chem-periodic', 'chem-bonding'],
  'chem-pblock': ['chem-periodic', 'chem-bonding'],
  'chem-organic': ['chem-bonding'], // IUPAC, resonance, inductive, reaction intermediates
  'chem-hydrocarbons': ['chem-organic'], // Electrophilic addition, aromatic substitution
  'chem-environment': ['chem-basic'],

  // --- MATHEMATICS ---
  'math-sets': [],
  'math-inequalities': ['math-sets'],
  'math-trig': ['math-sets'],
  'math-complex': ['math-trig'],
  'math-sequence': ['math-sets'],
  'math-straight': ['math-sets'],
  'math-pnc': ['math-sets'],
  'math-binomial': ['math-pnc', 'math-sequence'],
  'math-conic': ['math-straight'],
  'math-3d': ['math-straight'],
  'math-limits': ['math-sets', 'math-trig'], // Calculus foundation
  'math-statistics': ['math-sets'],
  'math-probability': ['math-sets', 'math-pnc'],
};

// Compute reverse dependents map
export const DEPENDENTS_GRAPH: Record<string, string[]> = {};

// Initialize dependents graph
for (const [chId, prereqs] of Object.entries(PREREQUISITE_GRAPH)) {
  if (!DEPENDENTS_GRAPH[chId]) DEPENDENTS_GRAPH[chId] = [];
  for (const p of prereqs) {
    if (!DEPENDENTS_GRAPH[p]) DEPENDENTS_GRAPH[p] = [];
    if (!DEPENDENTS_GRAPH[p].includes(chId)) {
      DEPENDENTS_GRAPH[p].push(chId);
    }
  }
}

export function getChapterTitle(chapterId: string): string {
  const ch = chapters.find((c) => c.id === chapterId);
  return ch ? ch.title : chapterId;
}

export function getChapterSubject(chapterId: string): Subject | 'General' {
  const ch = chapters.find((c) => c.id === chapterId);
  return ch ? ch.subject : 'General';
}

export interface PrerequisiteCheckResult {
  hasUnfinished: boolean;
  unfinishedPrereqs: { id: string; title: string; subject: string }[];
  warningMessage: string | null;
  directPrereqCount: number;
}

export function checkUnfinishedPrerequisites(
  chapterId: string,
  completedChapterIds: string[]
): PrerequisiteCheckResult {
  const prereqIds = PREREQUISITE_GRAPH[chapterId] || [];
  const completedSet = new Set(completedChapterIds);

  const unfinished = prereqIds
    .filter((pid) => !completedSet.has(pid))
    .map((pid) => ({
      id: pid,
      title: getChapterTitle(pid),
      subject: getChapterSubject(pid),
    }));

  const hasUnfinished = unfinished.length > 0;
  const currentTitle = getChapterTitle(chapterId);

  let warningMessage: string | null = null;
  if (hasUnfinished) {
    const list = unfinished.map((u) => u.title).join(', ');
    warningMessage = `⚠️ ${currentTitle} has ${unfinished.length} unfinished prerequisite${
      unfinished.length > 1 ? 's' : ''
    }: ${list}. Studying this without the foundation may cause conceptual blocks.`;
  }

  return {
    hasUnfinished,
    unfinishedPrereqs: unfinished,
    warningMessage,
    directPrereqCount: prereqIds.length,
  };
}

export function getDependentsCount(chapterId: string): number {
  return DEPENDENTS_GRAPH[chapterId]?.length || 0;
}

export function getAllTransitivePrerequisites(chapterId: string): string[] {
  const visited = new Set<string>();

  function dfs(curr: string) {
    const prereqs = PREREQUISITE_GRAPH[curr] || [];
    for (const p of prereqs) {
      if (!visited.has(p)) {
        visited.add(p);
        dfs(p);
      }
    }
  }

  dfs(chapterId);
  return Array.from(visited);
}
