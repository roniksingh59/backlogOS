export interface DerivationStep {
  id: string;
  stepNumber: number; // Correct 1-based order
  text: string;
  mathExpression?: string;
  rationale: string;
}

export interface InteractiveDerivation {
  id: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics';
  classNum: 11 | 12;
  title: string;
  chapter: string;
  boardImportance: 'Guaranteed 5M' | 'High 3M' | 'Frequent 2M';
  diagramUrl?: string;
  finalFormula: string;
  prerequisites: string[];
  steps: DerivationStep[];
}

export interface FormulaBlitzItem {
  id: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics';
  chapter: string;
  conceptName: string;
  formulaPrompt: string;
  formulaAnswer: string;
  siUnits: string;
  examApplication: string;
  trickTip?: string;
}

export const DERIVATIONS_LIST: InteractiveDerivation[] = [
  {
    id: 'drv-lens-makers',
    subject: 'Physics',
    classNum: 12,
    title: 'Lens Maker’s Formula',
    chapter: 'Ray Optics',
    boardImportance: 'Guaranteed 5M',
    finalFormula: '1/f = (μ - 1)(1/R₁ - 1/R₂)',
    prerequisites: ['Refraction at spherical surfaces', 'Thin lens approximation'],
    steps: [
      {
        id: 's1',
        stepNumber: 1,
        text: 'State refraction at the first spherical surface of radius R₁ forming intermediate image I₁',
        mathExpression: 'μ₂/v₁ - μ₁/u = (μ₂ - μ₁) / R₁',
        rationale: 'Light travels from medium 1 (air, μ₁=1) into denser medium 2 (lens, μ₂=μ).',
      },
      {
        id: 's2',
        stepNumber: 2,
        text: 'Consider intermediate image I₁ acting as a virtual object for the second surface of radius R₂',
        mathExpression: 'μ₁/v - μ₂/v₁ = (μ₁ - μ₂) / R₂',
        rationale: 'Light travels from inside the lens back into air, reversing the refractive index roles.',
      },
      {
        id: 's3',
        stepNumber: 3,
        text: 'Rewrite the right hand side of the second surface equation in terms of (μ₂ - μ₁)',
        mathExpression: 'μ₁/v - μ₂/v₁ = -(μ₂ - μ₁) / R₂',
        rationale: 'Factoring out negative sign enables clean grouping with the first surface equation.',
      },
      {
        id: 's4',
        stepNumber: 4,
        text: 'Add both surface equations together to cancel the intermediate image distance term v₁',
        mathExpression: 'μ₁(1/v - 1/u) = (μ₂ - μ₁)(1/R₁ - 1/R₂)',
        rationale: 'Intermediate distance v₁ drops out completely, linking object and final image positions.',
      },
      {
        id: 's5',
        stepNumber: 5,
        text: 'Divide through by μ₁ and define μ = μ₂ / μ₁ (refractive index of lens relative to surroundings)',
        mathExpression: '1/v - 1/u = (μ - 1)(1/R₁ - 1/R₂)',
        rationale: 'Sets up standard thin-lens format relative to the surrounding medium.',
      },
      {
        id: 's6',
        stepNumber: 6,
        text: 'Apply thin-lens boundary definition: when object is at infinity (u = -∞), image converges at focus (v = f)',
        mathExpression: '1/f = (μ - 1)(1/R₁ - 1/R₂)',
        rationale: 'Yields the final Lens Maker’s equation relating focal length to curvature and index.',
      },
    ],
  },
  {
    id: 'drv-dipole-axial',
    subject: 'Physics',
    classNum: 12,
    title: 'Electric Field on Axial Line of Dipole',
    chapter: 'Electric Charges & Fields',
    boardImportance: 'High 3M',
    finalFormula: 'E_axial = 2kp / r³',
    prerequisites: ['Coulomb’s law', 'Superposition principle', 'Short dipole approximation'],
    steps: [
      {
        id: 'd1',
        stepNumber: 1,
        text: 'Specify axial test point P at distance r from dipole center; charges +q at (r - a) and -q at (r + a)',
        mathExpression: 'E₊ = kq / (r - a)²,   E₋ = kq / (r + a)²',
        rationale: 'Field from +q points outward; field from -q points inward along the axial line.',
      },
      {
        id: 'd2',
        stepNumber: 2,
        text: 'Superimpose collinear field magnitudes: net field points in direction of E₊',
        mathExpression: 'E_net = kq [ 1/(r - a)² - 1/(r + a)² ]',
        rationale: 'Since (r - a) < (r + a), E₊ is strictly stronger than E₋.',
      },
      {
        id: 'd3',
        stepNumber: 3,
        text: 'Compute common denominator [(r - a)(r + a)]² = (r² - a²)²',
        mathExpression: 'E_net = kq [ ((r + a)² - (r - a)²) / (r² - a²)² ]',
        rationale: 'Algebraic expansion of difference of squares.',
      },
      {
        id: 'd4',
        stepNumber: 4,
        text: 'Expand numerator terms: (r² + 2ar + a²) - (r² - 2ar + a²) = 4ar',
        mathExpression: 'E_net = kq · (4ar) / (r² - a²)²',
        rationale: 'Cancellations leave only the cross terms 4ar.',
      },
      {
        id: 'd5',
        stepNumber: 5,
        text: 'Express in terms of dipole moment p = q · (2a)',
        mathExpression: 'E_net = 2k · (q · 2a) · r / (r² - a²)² = 2kpr / (r² - a²)²',
        rationale: 'Substitute fundamental electric dipole moment definition.',
      },
      {
        id: 'd6',
        stepNumber: 6,
        text: 'Apply short dipole approximation r >> a, neglecting a² in comparison to r²',
        mathExpression: 'E_axial = 2kpr / (r²)² = 2kp / r³ = 2p / (4πε₀r³)',
        rationale: 'For practical atomic/molecular dipoles, distance r is vastly larger than dipole separation.',
      },
    ],
  },
  {
    id: 'drv-drift-velocity',
    subject: 'Physics',
    classNum: 12,
    title: 'Drift Velocity & Ohm’s Law Microscopic Derivation',
    chapter: 'Current Electricity',
    boardImportance: 'Guaranteed 5M',
    finalFormula: 'I = n e A v_d  =>  ρ = m / (n e² τ)',
    prerequisites: ['Electric force on electron', 'Relaxation time τ'],
    steps: [
      {
        id: 'v1',
        stepNumber: 1,
        text: 'Determine acceleration of free electron under electric field E = V/L inside conductor',
        mathExpression: 'a = -eE / m',
        rationale: 'Electrostatic force F = -eE acts on mass m of electron.',
      },
      {
        id: 'v2',
        stepNumber: 2,
        text: 'Average electron thermal velocity is zero (random collisions); evaluate drift velocity with relaxation time τ',
        mathExpression: 'v_d = (eE / m) · τ',
        rationale: 'τ is the average time elapsed between two successive collisions of an electron.',
      },
      {
        id: 'v3',
        stepNumber: 3,
        text: 'Calculate total charge ΔQ passing cross-section A in time interval Δt',
        mathExpression: 'ΔQ = n · (A · v_d · Δt) · e',
        rationale: 'Volume swept is (A · v_d · Δt) and electron number density is n.',
      },
      {
        id: 'v4',
        stepNumber: 4,
        text: 'Formulate electric current I = ΔQ / Δt',
        mathExpression: 'I = n e A v_d',
        rationale: 'Fundamental relation connecting macroscopic current to microscopic drift velocity.',
      },
      {
        id: 'v5',
        stepNumber: 5,
        text: 'Substitute v_d = (eE/m)τ and E = V/L into the current expression',
        mathExpression: 'I = n e A [ (e V / mL) τ ] = (n e² A τ / mL) · V',
        rationale: 'Directly relates applied voltage V to the resulting current I.',
      },
      {
        id: 'v6',
        stepNumber: 6,
        text: 'Compare with Ohm’s law V = IR to obtain resistance R and resistivity ρ = m / (n e² τ)',
        mathExpression: 'R = (m / n e² τ) · (L / A)  =>  ρ = m / (n e² τ)',
        rationale: 'Proves Ohm’s law from first principles and shows resistivity depends on temperature via τ.',
      },
    ],
  },
  {
    id: 'drv-kinetics-first-order',
    subject: 'Chemistry',
    classNum: 12,
    title: 'Integrated Rate Equation for First Order Reactions',
    chapter: 'Chemical Kinetics',
    boardImportance: 'High 3M',
    finalFormula: 'k = (2.303 / t) log([R]₀ / [R])',
    prerequisites: ['Differential rate law', 'Natural logarithm integration'],
    steps: [
      {
        id: 'k1',
        stepNumber: 1,
        text: 'Set up differential rate law for reaction R -> Products with rate constant k',
        mathExpression: '-d[R] / dt = k [R]¹',
        rationale: 'Rate of consumption of reactant is proportional to first power of concentration.',
      },
      {
        id: 'k2',
        stepNumber: 2,
        text: 'Separate variables [R] and t onto opposite sides of the equation',
        mathExpression: 'd[R] / [R] = -k dt',
        rationale: 'Enables independent integration over concentration and time boundaries.',
      },
      {
        id: 'k3',
        stepNumber: 3,
        text: 'Integrate both sides between limits: at t=0, [R]=[R]₀ and at time t, [R]=[R]',
        mathExpression: '∫_{[R]₀}^{[R]} d[R]/[R] = -k ∫₀^t dt',
        rationale: 'Standard definite integral with known initial and instantaneous conditions.',
      },
      {
        id: 'k4',
        stepNumber: 4,
        text: 'Evaluate standard integrals: ln([R]) - ln([R]₀) = -kt',
        mathExpression: 'ln([R] / [R]₀) = -kt  =>  ln([R]₀ / [R]) = kt',
        rationale: 'Logarithmic property: ln(A) - ln(B) = ln(A/B).',
      },
      {
        id: 'k5',
        stepNumber: 5,
        text: 'Convert natural log (ln) to common base-10 log by multiplying by 2.303',
        mathExpression: '2.303 log₁₀([R]₀ / [R]) = kt',
        rationale: 'CBSE board conventions and log tables require base-10 logarithmic form.',
      },
      {
        id: 'k6',
        stepNumber: 6,
        text: 'Solve for rate constant k to obtain the master formula',
        mathExpression: 'k = (2.303 / t) log₁₀([R]₀ / [R])',
        rationale: 'Final integrated rate expression used for radioactive decay and half-life evaluations.',
      },
    ],
  },
  {
    id: 'drv-math-byparts',
    subject: 'Mathematics',
    classNum: 12,
    title: 'Integration by Parts (Product Rule for Integrals)',
    chapter: 'Integrals',
    boardImportance: 'High 3M',
    finalFormula: '∫ u v dx = u ∫ v dx - ∫ [ u’ (∫ v dx) ] dx',
    prerequisites: ['Product rule of differentiation', 'Fundamental theorem of calculus'],
    steps: [
      {
        id: 'm1',
        stepNumber: 1,
        text: 'Differentiate the product of two continuous differentiable functions u(x) and v(x)',
        mathExpression: 'd/dx [ u · w ] = u (dw/dx) + w (du/dx)',
        rationale: 'Standard product rule of differential calculus.',
      },
      {
        id: 'm2',
        stepNumber: 2,
        text: 'Define w(x) such that dw/dx = v(x), which implies w = ∫ v dx',
        mathExpression: 'd/dx [ u · ∫ v dx ] = u · v + (du/dx) · ∫ v dx',
        rationale: 'Connecting derivative of w directly to integrand v.',
      },
      {
        id: 'm3',
        stepNumber: 3,
        text: 'Integrate both sides with respect to x',
        mathExpression: 'u · ∫ v dx = ∫ [ u · v ] dx + ∫ [ (du/dx) · (∫ v dx) ] dx',
        rationale: 'Integration inverts differentiation on the left hand side.',
      },
      {
        id: 'm4',
        stepNumber: 4,
        text: 'Rearrange to isolate the integral of the product ∫ u · v dx',
        mathExpression: '∫ u · v dx = u · (∫ v dx) - ∫ [ (du/dx) · (∫ v dx) ] dx',
        rationale: 'Yields the standard Integration by Parts formula commonly applied with ILATE priority.',
      },
    ],
  },
];

export const FORMULA_BLITZ_ITEMS: FormulaBlitzItem[] = [
  {
    id: 'blitz-1',
    subject: 'Physics',
    chapter: 'Current Electricity',
    conceptName: 'Temperature Coefficient of Resistance',
    formulaPrompt: 'Resistance R_T at temperature T given R₀ at T₀ and coefficient α',
    formulaAnswer: 'R_T = R₀ [ 1 + α (T - T₀) ]',
    siUnits: 'α in K⁻¹ or (°C)⁻¹',
    examApplication: 'Calculating resistance change in tungsten filaments and thermistors.',
    trickTip: 'For metals, α is positive; for semiconductors, α is negative!',
  },
  {
    id: 'blitz-2',
    subject: 'Physics',
    chapter: 'Electromagnetic Induction',
    conceptName: 'Motional EMF in Straight Conductor',
    formulaPrompt: 'EMF induced in a rod of length L moving with velocity v perpendicular to magnetic field B',
    formulaAnswer: 'ε = B · v · L',
    siUnits: 'Volts (V)',
    examApplication: 'Rotating rods and airplanes flying through Earth’s vertical magnetic component.',
    trickTip: 'If rod rotates around one fixed end: ε = 1/2 B ω L²',
  },
  {
    id: 'blitz-3',
    subject: 'Physics',
    chapter: 'Dual Nature of Radiation',
    conceptName: 'Einstein’s Photoelectric Equation',
    formulaPrompt: 'Kinetic energy K_max of emitted photoelectron in terms of photon frequency ν and work function Φ₀',
    formulaAnswer: 'K_max = hν - Φ₀ = eV₀',
    siUnits: 'Joules (J) or electron-volts (eV)',
    examApplication: 'Stopping potential graphs and threshold frequency calculations.',
    trickTip: 'Slope of V₀ vs ν graph is always universal: h/e!',
  },
  {
    id: 'blitz-4',
    subject: 'Chemistry',
    chapter: 'Electrochemistry',
    conceptName: 'Nernst Equation at 298 K',
    formulaPrompt: 'Cell potential E_cell in terms of standard E°_cell, moles of e⁻ transferred n, and reaction quotient Q',
    formulaAnswer: 'E_cell = E°_cell - (0.0591 / n) log₁₀(Q)',
    siUnits: 'Volts (V)',
    examApplication: 'Calculating EMF of Daniell cell and concentration cells at non-standard states.',
    trickTip: 'At equilibrium: E_cell = 0, so E°_cell = (0.0591 / n) log₁₀(K_c)',
  },
  {
    id: 'blitz-5',
    subject: 'Chemistry',
    chapter: 'Solutions',
    conceptName: 'Osmotic Pressure & Van ’t Hoff Factor',
    formulaPrompt: 'Colligative osmotic pressure π for non-ideal dissociating/associating solution',
    formulaAnswer: 'π = i · C · R · T',
    siUnits: 'atm or Pa (with matching R value)',
    examApplication: 'Determining molar mass of biomolecules and proteins without denaturation.',
    trickTip: 'For NaCl: i ≈ 2; for BaCl₂: i ≈ 3; for acetic acid in benzene: i ≈ 0.5 (dimerizes).',
  },
  {
    id: 'blitz-6',
    subject: 'Chemistry',
    chapter: 'Chemical Kinetics',
    conceptName: 'Arrhenius Equation for Activation Energy',
    formulaPrompt: 'Relation between rate constant k and temperature T with activation energy E_a',
    formulaAnswer: 'k = A · e^(-E_a / RT)  or  log(k₂/k₁) = (E_a / 2.303R) [ 1/T₁ - 1/T₂ ]',
    siUnits: 'E_a in J mol⁻¹ or kJ mol⁻¹',
    examApplication: 'Determining activation energy from slope of log(k) vs 1/T.',
    trickTip: 'Slope of ln(k) vs 1/T is -E_a/R; slope of log₁₀(k) vs 1/T is -E_a / (2.303R).',
  },
  {
    id: 'blitz-7',
    subject: 'Mathematics',
    chapter: 'Three Dimensional Geometry',
    conceptName: 'Shortest Distance between Skew Lines',
    formulaPrompt: 'Shortest distance d between lines r = a₁ + λb₁ and r = a₂ + μb₂',
    formulaAnswer: 'd = | (b₁ × b₂) · (a₂ - a₁) | / | b₁ × b₂ |',
    siUnits: 'Units (scalar distance >= 0)',
    examApplication: 'Guaranteed 3-mark question in almost every CBSE Class 12 board exam.',
    trickTip: 'If lines intersect, numerator is zero: (b₁ × b₂) · (a₂ - a₁) = 0.',
  },
  {
    id: 'blitz-8',
    subject: 'Mathematics',
    chapter: 'Probability',
    conceptName: 'Bayes’ Theorem',
    formulaPrompt: 'Posterior probability P(E_i | A) given partition events E₁..E_n and observed event A',
    formulaAnswer: 'P(E_i | A) = [ P(E_i) · P(A | E_i) ] / [ Σ P(E_k) · P(A | E_k) ]',
    siUnits: 'Dimensionless probability [0, 1]',
    examApplication: 'Diagnostic disease tests, factory defective machine outputs, double coin problems.',
    trickTip: 'Denominator is simply the Total Probability of event A.',
  },
  {
    id: 'blitz-9',
    subject: 'Mathematics',
    chapter: 'Application of Derivatives',
    conceptName: 'Derivative Test for Local Extrema',
    formulaPrompt: 'Condition for local maximum and local minimum at critical point x = c (where f’(c) = 0)',
    formulaAnswer: 'Local Max: f’’(c) < 0; Local Min: f’’(c) > 0',
    siUnits: 'Dimensionless criterion',
    examApplication: 'Maximizing box volume, minimizing cylinder surface area in 5M board word problems.',
    trickTip: 'Think concave downward (like a mountain peak ∩) for f’’ < 0 -> Maximum!',
  },
];
