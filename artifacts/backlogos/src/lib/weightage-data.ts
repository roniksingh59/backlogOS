export interface ChapterWeightage {
  id: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics';
  classNum: 11 | 12;
  title: string;
  boardMarks: number; // Official CBSE blueprint weightage
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  effortHours: number; // Estimated hours to clear backlog
  roiScore: number; // Marks per study hour (High ROI = best points return)
  tier: 'Core Must-Win' | 'High ROI Booster' | 'Safe to Skim';
  keyTopics: string[];
}

export const CBSE_CHAPTER_WEIGHTAGES: ChapterWeightage[] = [
  // --- CLASS 12 PHYSICS (Total Theory = 70 Marks) ---
  {
    id: 'c12-phy-01',
    subject: 'Physics',
    classNum: 12,
    title: 'Electric Charges and Fields',
    boardMarks: 8,
    difficulty: 'Moderate',
    effortHours: 6,
    roiScore: 1.33,
    tier: 'Core Must-Win',
    keyTopics: ['Gauss’s law applications', 'Dipole axial & equatorial fields', 'Torque and potential energy'],
  },
  {
    id: 'c12-phy-02',
    subject: 'Physics',
    classNum: 12,
    title: 'Electrostatic Potential and Capacitance',
    boardMarks: 8,
    difficulty: 'Moderate',
    effortHours: 6,
    roiScore: 1.33,
    tier: 'Core Must-Win',
    keyTopics: ['Capacitance with dielectric slab', 'Energy stored in capacitor', 'Equipotential surfaces'],
  },
  {
    id: 'c12-phy-03',
    subject: 'Physics',
    classNum: 12,
    title: 'Current Electricity',
    boardMarks: 7,
    difficulty: 'Easy',
    effortHours: 4,
    roiScore: 1.75,
    tier: 'High ROI Booster',
    keyTopics: ['Kirchhoff’s laws circuit problems', 'Drift velocity derivation', 'Wheatstone bridge balance'],
  },
  {
    id: 'c12-phy-04',
    subject: 'Physics',
    classNum: 12,
    title: 'Moving Charges and Magnetism',
    boardMarks: 6,
    difficulty: 'Hard',
    effortHours: 8,
    roiScore: 0.75,
    tier: 'Core Must-Win',
    keyTopics: ['Biot-Savart law & circular loop', 'Ampere’s circuital law', 'Galvanometer to ammeter/voltmeter'],
  },
  {
    id: 'c12-phy-05',
    subject: 'Physics',
    classNum: 12,
    title: 'Magnetism and Matter',
    boardMarks: 3,
    difficulty: 'Easy',
    effortHours: 2,
    roiScore: 1.5,
    tier: 'Safe to Skim',
    keyTopics: ['Magnetic dipole moment of bar magnet', 'Paramagnetic, diamagnetic, ferromagnetic traits'],
  },
  {
    id: 'c12-phy-06',
    subject: 'Physics',
    classNum: 12,
    title: 'Electromagnetic Induction',
    boardMarks: 5,
    difficulty: 'Moderate',
    effortHours: 4,
    roiScore: 1.25,
    tier: 'High ROI Booster',
    keyTopics: ['Lenz’s law & energy conservation', 'Motional EMF', 'Self & mutual inductance'],
  },
  {
    id: 'c12-phy-07',
    subject: 'Physics',
    classNum: 12,
    title: 'Alternating Current',
    boardMarks: 4,
    difficulty: 'Moderate',
    effortHours: 4,
    roiScore: 1.0,
    tier: 'High ROI Booster',
    keyTopics: ['LCR series resonance & impedance', 'Power factor', 'Transformer working & energy losses'],
  },
  {
    id: 'c12-phy-08',
    subject: 'Physics',
    classNum: 12,
    title: 'Electromagnetic Waves',
    boardMarks: 3,
    difficulty: 'Easy',
    effortHours: 1.5,
    roiScore: 2.0,
    tier: 'High ROI Booster',
    keyTopics: ['EM spectrum wavelength order & uses', 'Displacement current significance'],
  },
  {
    id: 'c12-phy-09',
    subject: 'Physics',
    classNum: 12,
    title: 'Ray Optics and Optical Instruments',
    boardMarks: 9,
    difficulty: 'Hard',
    effortHours: 8,
    roiScore: 1.13,
    tier: 'Core Must-Win',
    keyTopics: ['Lens Maker’s formula derivation', 'Refraction through prism', 'Compound microscope & telescope'],
  },
  {
    id: 'c12-phy-10',
    subject: 'Physics',
    classNum: 12,
    title: 'Wave Optics',
    boardMarks: 5,
    difficulty: 'Moderate',
    effortHours: 5,
    roiScore: 1.0,
    tier: 'High ROI Booster',
    keyTopics: ['Huygens wave reflection/refraction proof', 'Young’s double slit fringe width', 'Diffraction central max width'],
  },
  {
    id: 'c12-phy-11',
    subject: 'Physics',
    classNum: 12,
    title: 'Dual Nature of Radiation and Matter',
    boardMarks: 4,
    difficulty: 'Easy',
    effortHours: 2.5,
    roiScore: 1.6,
    tier: 'High ROI Booster',
    keyTopics: ['Einstein photoelectric equation', 'de Broglie wavelength', 'Stopping potential graphs'],
  },
  {
    id: 'c12-phy-12',
    subject: 'Physics',
    classNum: 12,
    title: 'Atoms',
    boardMarks: 3,
    difficulty: 'Easy',
    effortHours: 2,
    roiScore: 1.5,
    tier: 'High ROI Booster',
    keyTopics: ['Bohr orbit radius & energy', 'Rydberg formula for spectral series'],
  },
  {
    id: 'c12-phy-13',
    subject: 'Physics',
    classNum: 12,
    title: 'Nuclei',
    boardMarks: 3,
    difficulty: 'Easy',
    effortHours: 2,
    roiScore: 1.5,
    tier: 'Safe to Skim',
    keyTopics: ['Mass defect & binding energy curve', 'Nuclear fission & fusion'],
  },
  {
    id: 'c12-phy-14',
    subject: 'Physics',
    classNum: 12,
    title: 'Semiconductor Electronics',
    boardMarks: 7,
    difficulty: 'Easy',
    effortHours: 4,
    roiScore: 1.75,
    tier: 'Core Must-Win',
    keyTopics: ['p-n junction diode forward/reverse bias', 'Half & Full wave rectifiers', 'Energy band gaps'],
  },

  // --- CLASS 12 CHEMISTRY (Total Theory = 70 Marks) ---
  {
    id: 'c12-chm-01',
    subject: 'Chemistry',
    classNum: 12,
    title: 'Solutions',
    boardMarks: 7,
    difficulty: 'Moderate',
    effortHours: 4.5,
    roiScore: 1.55,
    tier: 'Core Must-Win',
    keyTopics: ['Henry’s law & Raoult’s law', 'Colligative properties elevations & depressions', 'Van ’t Hoff factor'],
  },
  {
    id: 'c12-chm-02',
    subject: 'Chemistry',
    classNum: 12,
    title: 'Electrochemistry',
    boardMarks: 9,
    difficulty: 'Moderate',
    effortHours: 6,
    roiScore: 1.5,
    tier: 'Core Must-Win',
    keyTopics: ['Nernst equation EMF calculations', 'Kohlrausch’s law applications', 'Faraday’s laws of electrolysis'],
  },
  {
    id: 'c12-chm-03',
    subject: 'Chemistry',
    classNum: 12,
    title: 'Chemical Kinetics',
    boardMarks: 7,
    difficulty: 'Easy',
    effortHours: 4,
    roiScore: 1.75,
    tier: 'Core Must-Win',
    keyTopics: ['Integrated rate law 1st order', 'Arrhenius equation & activation energy', 'Half-life relations'],
  },
  {
    id: 'c12-chm-04',
    subject: 'Chemistry',
    classNum: 12,
    title: 'd- and f-Block Elements',
    boardMarks: 7,
    difficulty: 'Moderate',
    effortHours: 5,
    roiScore: 1.4,
    tier: 'Core Must-Win',
    keyTopics: ['Transition element trends (oxidation states, colored ions)', 'KMnO₄ and K₂Cr₂O₇ preparation', 'Lanthanoid contraction'],
  },
  {
    id: 'c12-chm-05',
    subject: 'Chemistry',
    classNum: 12,
    title: 'Coordination Compounds',
    boardMarks: 7,
    difficulty: 'Moderate',
    effortHours: 5,
    roiScore: 1.4,
    tier: 'Core Must-Win',
    keyTopics: ['IUPAC nomenclature', 'Valence bond theory hybridization & magnetic moment', 'Crystal field splitting energy (CFSE)'],
  },
  {
    id: 'c12-chm-06',
    subject: 'Chemistry',
    classNum: 12,
    title: 'Haloalkanes and Haloarenes',
    boardMarks: 6,
    difficulty: 'Moderate',
    effortHours: 5,
    roiScore: 1.2,
    tier: 'High ROI Booster',
    keyTopics: ['S_N1 vs S_N2 mechanism with stereochemistry', 'Electrophilic substitution in chlorobenzene', 'Wurtz-Fittig reaction'],
  },
  {
    id: 'c12-chm-07',
    subject: 'Chemistry',
    classNum: 12,
    title: 'Alcohols, Phenols and Ethers',
    boardMarks: 6,
    difficulty: 'Moderate',
    effortHours: 5,
    roiScore: 1.2,
    tier: 'High ROI Booster',
    keyTopics: ['Kolbe’s & Reimer-Tiemann reactions', 'Acidic strength of phenols vs alcohols', 'Williamson ether synthesis'],
  },
  {
    id: 'c12-chm-08',
    subject: 'Chemistry',
    classNum: 12,
    title: 'Aldehydes, Ketones and Carboxylic Acids',
    boardMarks: 8,
    difficulty: 'Hard',
    effortHours: 7,
    roiScore: 1.14,
    tier: 'Core Must-Win',
    keyTopics: ['Nucleophilic addition mechanisms', 'Aldol condensation & Cannizzaro reaction', 'Acidic character of carboxylic acids'],
  },
  {
    id: 'c12-chm-09',
    subject: 'Chemistry',
    classNum: 12,
    title: 'Amines',
    boardMarks: 6,
    difficulty: 'Easy',
    effortHours: 3.5,
    roiScore: 1.71,
    tier: 'High ROI Booster',
    keyTopics: ['Basic strength comparison in gas vs aqueous phase', 'Carbylamine & Hinsberg test', 'Diazonium salt coupling'],
  },
  {
    id: 'c12-chm-10',
    subject: 'Chemistry',
    classNum: 12,
    title: 'Biomolecules',
    boardMarks: 7,
    difficulty: 'Easy',
    effortHours: 3.5,
    roiScore: 2.0,
    tier: 'High ROI Booster',
    keyTopics: ['Glucose reactions & open chain limitations', 'Peptide bond & protein denaturation', 'DNA vs RNA structure'],
  },

  // --- CLASS 12 MATHEMATICS (Total Theory = 80 Marks) ---
  {
    id: 'c12-mat-01',
    subject: 'Mathematics',
    classNum: 12,
    title: 'Relations and Functions',
    boardMarks: 5,
    difficulty: 'Moderate',
    effortHours: 4,
    roiScore: 1.25,
    tier: 'High ROI Booster',
    keyTopics: ['Equivalence relations proof', 'One-one & onto (Bijective) functions'],
  },
  {
    id: 'c12-mat-02',
    subject: 'Mathematics',
    classNum: 12,
    title: 'Inverse Trigonometric Functions',
    boardMarks: 4,
    difficulty: 'Easy',
    effortHours: 2.5,
    roiScore: 1.6,
    tier: 'High ROI Booster',
    keyTopics: ['Principal value branches', 'Evaluation within standard intervals'],
  },
  {
    id: 'c12-mat-03',
    subject: 'Mathematics',
    classNum: 12,
    title: 'Matrices',
    boardMarks: 5,
    difficulty: 'Easy',
    effortHours: 3,
    roiScore: 1.66,
    tier: 'High ROI Booster',
    keyTopics: ['Matrix multiplication properties', 'Symmetric & skew-symmetric decomposition'],
  },
  {
    id: 'c12-mat-04',
    subject: 'Mathematics',
    classNum: 12,
    title: 'Determinants',
    boardMarks: 6,
    difficulty: 'Moderate',
    effortHours: 4,
    roiScore: 1.5,
    tier: 'Core Must-Win',
    keyTopics: ['Matrix method for 3-variable linear system', 'Adjoint & inverse properties'],
  },
  {
    id: 'c12-mat-05',
    subject: 'Mathematics',
    classNum: 12,
    title: 'Continuity and Differentiability',
    boardMarks: 8,
    difficulty: 'Moderate',
    effortHours: 6,
    roiScore: 1.33,
    tier: 'Core Must-Win',
    keyTopics: ['Logarithmic differentiation', 'Parametric differentiation', 'Second order derivative proofs'],
  },
  {
    id: 'c12-mat-06',
    subject: 'Mathematics',
    classNum: 12,
    title: 'Application of Derivatives',
    boardMarks: 7,
    difficulty: 'Moderate',
    effortHours: 5,
    roiScore: 1.4,
    tier: 'Core Must-Win',
    keyTopics: ['Increasing / Decreasing intervals', 'Maxima and Minima 5M practical word problems'],
  },
  {
    id: 'c12-mat-07',
    subject: 'Mathematics',
    classNum: 12,
    title: 'Integrals',
    boardMarks: 11,
    difficulty: 'Hard',
    effortHours: 10,
    roiScore: 1.1,
    tier: 'Core Must-Win',
    keyTopics: ['Definite integral property ∫₀^a f(x) = ∫₀^a f(a-x)', 'Integration by parts', 'Partial fractions'],
  },
  {
    id: 'c12-mat-08',
    subject: 'Mathematics',
    classNum: 12,
    title: 'Application of Integrals',
    boardMarks: 6,
    difficulty: 'Easy',
    effortHours: 3.5,
    roiScore: 1.71,
    tier: 'High ROI Booster',
    keyTopics: ['Area between circle/ellipse and line/parabola', 'Direct integration area bounded by curves'],
  },
  {
    id: 'c12-mat-09',
    subject: 'Mathematics',
    classNum: 12,
    title: 'Differential Equations',
    boardMarks: 7,
    difficulty: 'Moderate',
    effortHours: 5,
    roiScore: 1.4,
    tier: 'Core Must-Win',
    keyTopics: ['Homogeneous differential equations', 'Linear differential equations integrating factor IF = e^(∫P dx)'],
  },
  {
    id: 'c12-mat-10',
    subject: 'Mathematics',
    classNum: 12,
    title: 'Vector Algebra',
    boardMarks: 6,
    difficulty: 'Easy',
    effortHours: 3.5,
    roiScore: 1.71,
    tier: 'High ROI Booster',
    keyTopics: ['Scalar dot product & vector cross product', 'Unit perpendicular vector & projection'],
  },
  {
    id: 'c12-mat-11',
    subject: 'Mathematics',
    classNum: 12,
    title: 'Three Dimensional Geometry',
    boardMarks: 8,
    difficulty: 'Moderate',
    effortHours: 5,
    roiScore: 1.6,
    tier: 'Core Must-Win',
    keyTopics: ['Shortest distance between skew lines', 'Vector & cartesian equation of lines'],
  },
  {
    id: 'c12-mat-12',
    subject: 'Mathematics',
    classNum: 12,
    title: 'Linear Programming',
    boardMarks: 5,
    difficulty: 'Easy',
    effortHours: 2,
    roiScore: 2.5,
    tier: 'High ROI Booster',
    keyTopics: ['Graphical feasible region determination', 'Corner point method for profit/cost optimization'],
  },
  {
    id: 'c12-mat-13',
    subject: 'Mathematics',
    classNum: 12,
    title: 'Probability',
    boardMarks: 8,
    difficulty: 'Moderate',
    effortHours: 5,
    roiScore: 1.6,
    tier: 'Core Must-Win',
    keyTopics: ['Bayes’ theorem word problems', 'Total probability theorem', 'Conditional probability'],
  },
];

export interface StrategyResult {
  targetPercentage: number;
  totalAvailableMarks: number;
  targetMarks: number;
  selectedChapters: ChapterWeightage[];
  skimChapters: ChapterWeightage[];
  totalExpectedMarks: number;
  totalStudyHours: number;
  coverageRatio: number;
  guaranteeLevel: 'Safe Pass' | 'High Distinction' | 'Topper 95%+';
  tacticalAdvice: string;
}

export function calculateTargetScoreStrategy(
  targetPercentage: number,
  subjectFilter?: 'Physics' | 'Chemistry' | 'Mathematics'
): StrategyResult {
  let list = CBSE_CHAPTER_WEIGHTAGES;
  if (subjectFilter) {
    list = list.filter((c) => c.subject === subjectFilter);
  }

  const totalAvailableMarks = list.reduce((sum, c) => sum + c.boardMarks, 0);
  const targetMarks = Math.round((targetPercentage / 100) * totalAvailableMarks);

  // Strategy algorithm: Sort chapters by ROI score descending (maximum marks per hour first)
  // Ensure "Core Must-Win" chapters are included first, then High ROI boosters
  const sorted = [...list].sort((a, b) => {
    if (a.tier === 'Core Must-Win' && b.tier !== 'Core Must-Win') return -1;
    if (b.tier === 'Core Must-Win' && a.tier !== 'Core Must-Win') return 1;
    return b.roiScore - a.roiScore;
  });

  const selected: ChapterWeightage[] = [];
  const skim: ChapterWeightage[] = [];
  let accumulatedMarks = 0;
  let totalStudyHours = 0;

  // Buffer: Add 5% safety margin to ensure target is reliably met even if 1-2 small errors happen
  const safetyTarget = Math.min(totalAvailableMarks, Math.round(targetMarks * 1.05));

  for (const ch of sorted) {
    if (accumulatedMarks < safetyTarget || ch.tier === 'Core Must-Win') {
      selected.push(ch);
      accumulatedMarks += ch.boardMarks;
      totalStudyHours += ch.effortHours;
    } else {
      skim.push(ch);
    }
  }

  let guaranteeLevel: 'Safe Pass' | 'High Distinction' | 'Topper 95%+' = 'High Distinction';
  let tacticalAdvice = '';

  if (targetPercentage <= 65) {
    guaranteeLevel = 'Safe Pass';
    tacticalAdvice = `Focus 100% on high-ROI formula chapters (e.g., Linear Programming, Current Electricity, Biomolecules, Solutions). You can safely skip heavy calculus or lengthy magnetism derivations to lock in ${accumulatedMarks} marks in just ${totalStudyHours} hours.`;
  } else if (targetPercentage <= 85) {
    guaranteeLevel = 'High Distinction';
    tacticalAdvice = `Lock down Core chapters plus High-ROI modules. Review NCERT PYQ back-exercises for ${selected.length} chapters and leave 1-2 low-yield chapters (e.g. Magnetism & Matter) for last-minute formula skimming.`;
  } else {
    guaranteeLevel = 'Topper 95%+';
    tacticalAdvice = `To guarantee a 95%+ score, zero chapters can be entirely abandoned. All ${selected.length} chapters must be completed, focusing particularly on 5-mark derivations and multi-step boundary conditions.`;
  }

  return {
    targetPercentage,
    totalAvailableMarks,
    targetMarks,
    selectedChapters: selected,
    skimChapters: skim,
    totalExpectedMarks: accumulatedMarks,
    totalStudyHours,
    coverageRatio: Math.min(100, Math.round((accumulatedMarks / totalAvailableMarks) * 100)),
    guaranteeLevel,
    tacticalAdvice,
  };
}
