export interface CuratedVideoSeed {
  id: string;
  title: string;
  channel: string;
  duration: string;
  durationMinutes: number;
  views: string;
  published: string;
  resourceType: 'concept' | 'oneshot' | 'pyq' | 'revision' | 'general';
  language: 'English' | 'Hinglish' | 'Hindi';
  keywords: string[];
}

export const CURATED_VIDEO_CATALOG: CuratedVideoSeed[] = [
  // --- PHYSICS CLASS 11 ---
  {
    id: 'tx76BJIqOd4',
    title: 'Units and Measurements | CLASS 11 Physics | Complete Chapter One Shot | Prashant Kirad',
    channel: 'Prashant Kirad',
    duration: '1:54:00',
    durationMinutes: 114,
    views: '14M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['units', 'measurement', 'dimensions', 'physics', 'class 11', 'chapter 1', 'error analysis'],
  },
  {
    id: 'bin4OCO-LSc',
    title: 'Units & Measurements in ONE SHOT | Class 11 Physics Chapter 1 | NCERT Covered',
    channel: 'Physics Wallah',
    duration: '3:17:39',
    durationMinutes: 198,
    views: '4.4M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['units', 'measurements', 'physics', 'class 11', 'pw'],
  },
  {
    id: 'nKoavD9nfBM',
    title: 'Unit and Measurement in 40 Min | Class 11th Physics Chapter 1 RAPID REVISION',
    channel: 'Next Toppers',
    duration: '39:59',
    durationMinutes: 40,
    views: '165K views',
    published: '2w ago',
    resourceType: 'revision',
    language: 'English',
    keywords: ['units', 'measurements', 'revision', 'physics', 'class 11'],
  },
  {
    id: '8rZRYPoerPw',
    title: 'SI Base Units and Derived Units - Physics and Chemistry Foundation',
    channel: 'The Organic Chemistry Tutor',
    duration: '28:40',
    durationMinutes: 29,
    views: '307K views',
    published: '3y ago',
    resourceType: 'concept',
    language: 'English',
    keywords: ['units', 'measurements', 'si units', 'dimensions', 'concept'],
  },
  {
    id: 'hbga-xhCB4E',
    title: 'Units & Measurement PYQ Practice & Numericals | Board & NEET Special',
    channel: 'Competition Wallah',
    duration: '5:25:46',
    durationMinutes: 326,
    views: '4M views',
    published: '1y ago',
    resourceType: 'pyq',
    language: 'Hinglish',
    keywords: ['units', 'measurements', 'pyq', 'numericals', 'physics'],
  },

  // Motion in a Straight Line
  {
    id: '2mK4s1CqZ8o',
    title: 'Motion in a Straight Line in ONE SHOT | Class 11 Physics | Kinematics',
    channel: 'Physics Wallah',
    duration: '3:45:10',
    durationMinutes: 225,
    views: '3.2M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['motion in a straight line', 'kinematics', 'straight line', 'physics', 'velocity', 'acceleration'],
  },
  {
    id: '3B8f9VvWJ_E',
    title: 'Motion in a Straight Line Rapid Revision in 45 Mins | Formulas & Derivations',
    channel: 'Arvind Academy',
    duration: '46:12',
    durationMinutes: 46,
    views: '420K views',
    published: '10mo ago',
    resourceType: 'revision',
    language: 'Hinglish',
    keywords: ['motion in a straight line', 'revision', 'kinematics', 'derivations'],
  },
  {
    id: 'K7Q9jHq9Ryo',
    title: 'Class 11 Kinematics 1D Most Important Questions & PYQs Solved',
    channel: 'Sachin Sir Physics',
    duration: '1:15:30',
    durationMinutes: 75,
    views: '280K views',
    published: '8mo ago',
    resourceType: 'pyq',
    language: 'Hinglish',
    keywords: ['motion in a straight line', 'pyq', 'numericals', 'kinematics'],
  },

  // Motion in a Plane
  {
    id: '7z1yXtSh9gc',
    title: 'Motion in a Plane in ONE SHOT | Vectors & Projectile Motion | Class 11',
    channel: 'Physics Wallah',
    duration: '4:10:20',
    durationMinutes: 250,
    views: '2.8M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['motion in a plane', 'vectors', 'projectile motion', 'physics', 'class 11'],
  },
  {
    id: '6X_p4LzT7Vk',
    title: 'Vectors and Projectile Motion Concept Clarity in 50 Mins',
    channel: 'Learnohub Class 11',
    duration: '48:30',
    durationMinutes: 49,
    views: '650K views',
    published: '1y ago',
    resourceType: 'concept',
    language: 'English',
    keywords: ['motion in a plane', 'vectors', 'projectile', 'concept'],
  },

  // Laws of Motion
  {
    id: 'G1wL8J8k8m4',
    title: 'Laws of Motion Class 11 in ONE SHOT | Full Chapter | Newton Laws & Friction',
    channel: 'Physics Wallah',
    duration: '3:30:15',
    durationMinutes: 210,
    views: '3.9M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['laws of motion', 'newton', 'friction', 'free body diagram', 'physics'],
  },
  {
    id: '9T_Y7u5V2k0',
    title: 'Newton Laws of Motion & FBD Problem Solving Mastery | Solved Numericals',
    channel: 'Arvind Academy',
    duration: '52:40',
    durationMinutes: 53,
    views: '310K views',
    published: '6mo ago',
    resourceType: 'pyq',
    language: 'Hinglish',
    keywords: ['laws of motion', 'fbd', 'problems', 'numericals', 'friction'],
  },

  // Work Energy and Power
  {
    id: '4R9s8W7Q1p2',
    title: 'Work Energy and Power in ONE SHOT | Class 11 Physics Chapter 6',
    channel: 'Physics Wallah',
    duration: '2:55:00',
    durationMinutes: 175,
    views: '2.5M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['work energy power', 'work', 'energy', 'power', 'collisions', 'physics'],
  },
  {
    id: '7H8k2L4M9p0',
    title: 'Work Energy Theorem & Conservative Forces Rapid Recap',
    channel: 'Learnohub',
    duration: '35:20',
    durationMinutes: 35,
    views: '480K views',
    published: '1y ago',
    resourceType: 'concept',
    language: 'English',
    keywords: ['work energy power', 'theorem', 'potential energy', 'concept'],
  },

  // Rotational Motion
  {
    id: '3K9j8L7M6p5',
    title: 'System of Particles & Rotational Motion in ONE SHOT | Center of Mass & Torque',
    channel: 'Physics Wallah',
    duration: '4:20:10',
    durationMinutes: 260,
    views: '2.1M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['rotational motion', 'system of particles', 'moment of inertia', 'center of mass', 'torque'],
  },
  {
    id: '8N7m6L5K4j3',
    title: 'Moment of Inertia Theorems & Formulas Simplified | 30 Min Express',
    channel: 'Arvind Academy',
    duration: '32:15',
    durationMinutes: 32,
    views: '290K views',
    published: '9mo ago',
    resourceType: 'revision',
    language: 'Hinglish',
    keywords: ['rotational motion', 'moment of inertia', 'revision', 'formulas'],
  },

  // Gravitation
  {
    id: '5M4L3K2J1h0',
    title: 'Gravitation in ONE SHOT | Class 11 Physics | Kepler Laws & Escape Velocity',
    channel: 'Prashant Kirad',
    duration: '1:45:00',
    durationMinutes: 105,
    views: '1.8M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['gravitation', 'kepler', 'orbital velocity', 'escape velocity', 'physics'],
  },

  // Thermodynamics & Kinetic Theory
  {
    id: '9J8h7G6F5e4',
    title: 'Thermodynamics Class 11 Physics in ONE SHOT | First & Second Laws, Carnot Engine',
    channel: 'Physics Wallah',
    duration: '3:10:00',
    durationMinutes: 190,
    views: '2.3M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['thermodynamics', 'carnot', 'first law', 'isothermal', 'adiabatic', 'physics'],
  },

  // Oscillations & Waves
  {
    id: '1A2b3C4d5E6',
    title: 'Oscillations & Simple Harmonic Motion (SHM) in ONE SHOT',
    channel: 'Physics Wallah',
    duration: '3:05:00',
    durationMinutes: 185,
    views: '1.9M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['oscillations', 'shm', 'simple pendulum', 'waves', 'physics'],
  },

  // --- CHEMISTRY CLASS 11 ---
  {
    id: '8Z7y6X5w4V3',
    title: 'Some Basic Concepts of Chemistry in ONE SHOT | Mole Concept | Class 11',
    channel: 'Bharat Panchal',
    duration: '1:50:00',
    durationMinutes: 110,
    views: '3.1M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['basic concepts of chemistry', 'mole concept', 'stoichiometry', 'chemistry', 'class 11'],
  },
  {
    id: '4V3w2X1y0Z9',
    title: 'Mole Concept & Molarity Formulas Made Easy | Solved PYQs',
    channel: 'Saurabh Raina',
    duration: '42:15',
    durationMinutes: 42,
    views: '520K views',
    published: '8mo ago',
    resourceType: 'pyq',
    language: 'Hinglish',
    keywords: ['mole concept', 'molarity', 'chemistry', 'pyq', 'numericals'],
  },
  {
    id: '7B6a5C4d3E2',
    title: 'Structure of Atom in ONE SHOT | Bohr Model & Quantum Numbers | Class 11',
    channel: 'Bharat Panchal',
    duration: '2:10:00',
    durationMinutes: 130,
    views: '2.7M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['structure of atom', 'bohr model', 'quantum numbers', 'chemistry', 'photoelectric'],
  },
  {
    id: '3E2d1C0b9A8',
    title: 'Quantum Numbers & Electronic Configuration in 25 Mins',
    channel: 'Learnohub Chemistry',
    duration: '26:40',
    durationMinutes: 27,
    views: '410K views',
    published: '1y ago',
    resourceType: 'concept',
    language: 'English',
    keywords: ['structure of atom', 'quantum numbers', 'electronic configuration', 'concept'],
  },
  {
    id: '9Z8y7X6w5V4',
    title: 'Chemical Bonding and Molecular Structure in ONE SHOT | VSEPR & Hybridization',
    channel: 'Physics Wallah',
    duration: '3:40:00',
    durationMinutes: 220,
    views: '4.2M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['chemical bonding', 'hybridization', 'vsepr', 'molecular orbital theory', 'chemistry'],
  },
  {
    id: '6W5v4U3t2S1',
    title: 'Hybridization Trick in 15 Minutes | Super Easy Method for CBSE & JEE',
    channel: 'Saurabh Raina',
    duration: '16:20',
    durationMinutes: 16,
    views: '890K views',
    published: '1y ago',
    resourceType: 'revision',
    language: 'Hinglish',
    keywords: ['chemical bonding', 'hybridization', 'trick', 'revision'],
  },
  {
    id: '2S1t0U9v8W7',
    title: 'Thermodynamics & Equilibrium Chemistry Complete Chapter One Shot',
    channel: 'Bharat Panchal',
    duration: '2:45:00',
    durationMinutes: 165,
    views: '1.9M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['thermodynamics', 'equilibrium', 'le chatelier', 'gibbs free energy', 'chemistry'],
  },
  {
    id: '5T4u3V2w1X0',
    title: 'Organic Chemistry - Some Basic Principles & Techniques (GOC) One Shot',
    channel: 'Physics Wallah',
    duration: '4:15:00',
    durationMinutes: 255,
    views: '3.6M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['organic chemistry', 'goc', 'iupac', 'isomerism', 'resonance', 'inductive effect'],
  },
  {
    id: '8X7w6V5u4T3',
    title: 'IUPAC Nomenclature & Rules in 40 Minutes | Full Practice',
    channel: 'Learnohub',
    duration: '41:10',
    durationMinutes: 41,
    views: '1.1M views',
    published: '1y ago',
    resourceType: 'concept',
    language: 'English',
    keywords: ['organic chemistry', 'iupac', 'nomenclature', 'concept'],
  },

  // --- MATHEMATICS CLASS 11 ---
  {
    id: '1Q2w3E4r5T6',
    title: 'Sets, Relations and Functions in ONE SHOT | Class 11 Maths',
    channel: 'Neha Agrawal Mathematically Inclined',
    duration: '2:30:00',
    durationMinutes: 150,
    views: '2.8M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['sets', 'relations', 'functions', 'maths', 'class 11', 'domain range'],
  },
  {
    id: '6Y5t4R3e2W1',
    title: 'Trigonometric Functions in ONE SHOT | All Formulas, Identities & Graphs',
    channel: 'Neha Agrawal Mathematically Inclined',
    duration: '3:15:00',
    durationMinutes: 195,
    views: '3.4M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['trigonometric functions', 'trigonometry', 'identities', 'maths', 'class 11'],
  },
  {
    id: '9U8i7O6p5A4',
    title: 'Trigonometry Formulas Memorization Trick in 20 Mins',
    channel: 'Arvind Kalia Vedantu',
    duration: '21:30',
    durationMinutes: 22,
    views: '670K views',
    published: '1y ago',
    resourceType: 'revision',
    language: 'Hinglish',
    keywords: ['trigonometric functions', 'formulas', 'trick', 'revision'],
  },
  {
    id: '4S5d6F7g8H9',
    title: 'Complex Numbers and Quadratic Equations in ONE SHOT | Modulus & Argument',
    channel: 'Physics Wallah',
    duration: '2:40:00',
    durationMinutes: 160,
    views: '1.7M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['complex numbers', 'quadratic equations', 'argand plane', 'maths'],
  },
  {
    id: '3H2g1F0d9S8',
    title: 'Permutations and Combinations (P&C) in ONE SHOT | Concept + PYQs',
    channel: 'Neha Agrawal Mathematically Inclined',
    duration: '2:50:00',
    durationMinutes: 170,
    views: '2.2M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['permutations and combinations', 'pnc', 'combinations', 'permutations', 'maths'],
  },
  {
    id: '7J8k9L0p1O2',
    title: 'Binomial Theorem and Sequences & Series One Shot Marathon',
    channel: 'Vedantu JEE',
    duration: '3:05:00',
    durationMinutes: 185,
    views: '1.4M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['binomial theorem', 'sequences and series', 'ap gp', 'maths'],
  },
  {
    id: '2Z3x4C5v6B7',
    title: 'Limits and Derivatives Class 11 Maths in ONE SHOT | Calculus Foundation',
    channel: 'Neha Agrawal Mathematically Inclined',
    duration: '2:35:00',
    durationMinutes: 155,
    views: '2.5M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['limits and derivatives', 'calculus', 'derivatives', 'limits', 'maths'],
  },
  {
    id: '8N7b6V5c4X3',
    title: 'Straight Lines & Conic Sections (Parabola, Ellipse, Hyperbola) One Shot',
    channel: 'Physics Wallah',
    duration: '3:30:00',
    durationMinutes: 210,
    views: '1.9M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['straight lines', 'conic sections', 'parabola', 'ellipse', 'hyperbola', 'circle'],
  },

  // --- BIOLOGY CLASS 11 ---
  {
    id: '5M6n7B8v9C0',
    title: 'Cell: The Unit of Life in ONE SHOT | Class 11 Biology NCERT Line by Line',
    channel: 'Garima Goel Biology',
    duration: '2:15:00',
    durationMinutes: 135,
    views: '2.6M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['cell the unit of life', 'cell biology', 'organelles', 'biology', 'class 11'],
  },
  {
    id: '1X2c3V4b5N6',
    title: 'Biomolecules in ONE SHOT | Proteins, Carbohydrates, Enzymes, Nucleic Acids',
    channel: 'Seep Pahuja',
    duration: '1:55:00',
    durationMinutes: 115,
    views: '1.8M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['biomolecules', 'proteins', 'enzymes', 'dna', 'biology'],
  },
  {
    id: '7L8k9J0h1G2',
    title: 'Photosynthesis & Respiration in Higher Plants in ONE SHOT | Calvin & Krebs Cycle',
    channel: 'Physics Wallah Biology',
    duration: '3:10:00',
    durationMinutes: 190,
    views: '2.1M views',
    published: '1y ago',
    resourceType: 'oneshot',
    language: 'Hinglish',
    keywords: ['photosynthesis', 'respiration in plants', 'calvin cycle', 'krebs cycle', 'biology'],
  },
  {
    id: '3F4g5H6j7K8',
    title: 'Human Physiology (Breathing, Circulation, Excretion) Rapid Board Revision',
    channel: 'Learnohub Biology',
    duration: '1:20:00',
    durationMinutes: 80,
    views: '940K views',
    published: '1y ago',
    resourceType: 'revision',
    language: 'English',
    keywords: ['breathing', 'circulation', 'excretory', 'human physiology', 'biology'],
  },
];

/**
 * Matches curated seeds based on query keywords or chapter titles
 */
export function getCuratedVideosForQuery(query: string, limit = 8): CuratedVideoSeed[] {
  const q = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = q.split(/\s+/).filter((w) => w.length > 2);

  const scored = CURATED_VIDEO_CATALOG.map((v) => {
    let score = 0;
    const vText = `${v.title} ${v.keywords.join(' ')} ${v.channel}`.toLowerCase();

    for (const w of words) {
      if (vText.includes(w)) {
        score += 10;
      }
    }

    // Direct keyword exact match bonus
    for (const kw of v.keywords) {
      if (q.includes(kw.toLowerCase())) {
        score += 25;
      }
    }

    return { video: v, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const matches = scored.filter((s) => s.score > 0).map((s) => s.video);

  if (matches.length > 0) {
    return matches.slice(0, limit);
  }

  // Fallback to top curated videos
  return CURATED_VIDEO_CATALOG.slice(0, limit);
}
