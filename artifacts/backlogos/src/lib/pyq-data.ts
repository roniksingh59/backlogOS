export interface StepMarking {
  step: string;
  marks: number;
}

export interface PYQQuestion {
  id: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics';
  classNum: 11 | 12;
  chapterId: string;
  chapterTitle: string;
  year: string;
  source: string; // e.g., 'CBSE Board Delhi', 'CBSE All India', 'CBSE Sample Paper 2024'
  marks: 1 | 2 | 3 | 4 | 5;
  type: 'mcq' | 'assertion_reason' | 'vsa' | 'sa' | 'case_study' | 'derivation';
  question: string;
  options?: string[];
  correctOption?: number; // 0-indexed for MCQs
  cbseStepMarking: StepMarking[];
  examinerTrap: string;
  officialAnswer: string;
  formulaUsed?: string;
  frequency: 'High (Repeated 4+ times)' | 'Medium (Repeated 2-3 times)' | 'Guaranteed Board Archetype';
}

export const PYQ_DATABASE: PYQQuestion[] = [
  // --- PHYSICS CLASS 12 ---
  {
    id: 'pyq-phy-12-01',
    subject: 'Physics',
    classNum: 12,
    chapterId: 'c12-phy-01',
    chapterTitle: 'Electric Charges and Fields',
    year: '2024 CBSE Board (Set 1)',
    source: 'CBSE All India',
    marks: 5,
    type: 'derivation',
    question:
      'Using Gauss’s law, deduce an expression for the electric field due to an infinitely long straight uniformly charged wire of linear charge density λ. Draw a graph showing the variation of electric field E with distance r from the wire.',
    cbseStepMarking: [
      { step: 'Statement of Gauss’s Law: ∮ E·dA = q_enclosed / ε₀', marks: 1 },
      { step: 'Diagram illustrating cylindrical Gaussian surface of radius r and length L with coaxial wire', marks: 1 },
      { step: 'Flux calculation through circular end caps (flux = 0 since E ⊥ dA) and curved surface (∮ E dA = E · 2πrL)', marks: 1.5 },
      { step: 'Equating E · 2πrL = (λL)/ε₀ and obtaining final field expression E = λ / (2πε₀r)', marks: 1 },
      { step: 'Correct graphical plot showing hyperbolic curve (E ∝ 1/r, approaching asymptotic axes)', marks: 0.5 },
    ],
    examinerTrap:
      'Common loss of 1 mark: Students neglect explaining why flux through the flat circular circular caps is zero (E is perpendicular to area vector n̂). Always write cos(90°) = 0 explicitly.',
    officialAnswer:
      '1. Gauss’s law states that the net electric flux through any closed surface is 1/ε₀ times the total charge enclosed: ∮ E·dA = q_enclosed / ε₀.\n2. Consider a cylindrical Gaussian surface of radius r and length L coaxial with the wire.\n3. Flux through top & bottom circular caps is zero because E is radial and perpendicular to the outward normal (θ = 90°, cos 90° = 0).\n4. Total flux is solely through the curved cylindrical surface: Φ = E · (2πrL).\n5. Charge enclosed q = λL.\n6. By Gauss’s Law: E · (2πrL) = (λL) / ε₀  =>  E = λ / (2πε₀r).\n7. In vector form: E = (λ / 2πε₀r) r̂.',
    formulaUsed: 'E = λ / (2πε₀r)',
    frequency: 'Guaranteed Board Archetype',
  },
  {
    id: 'pyq-phy-12-02',
    subject: 'Physics',
    classNum: 12,
    chapterId: 'c12-phy-09',
    chapterTitle: 'Ray Optics and Optical Instruments',
    year: '2023 CBSE Board',
    source: 'CBSE Delhi Region',
    marks: 5,
    type: 'derivation',
    question:
      'Derive the Lens Maker’s Formula: 1/f = (μ - 1)(1/R₁ - 1/R₂) for a double convex lens of refractive index μ placed in air. State the Cartesian sign conventions assumed.',
    cbseStepMarking: [
      { step: 'Ray diagram showing refractions at both first surface (radius R₁) and second surface (radius R₂)', marks: 1 },
      { step: 'Refraction equation at first spherical surface: μ₂/v₁ - μ₁/u = (μ₂ - μ₁)/R₁', marks: 1.5 },
      { step: 'Refraction equation at second spherical surface with virtual object: μ₁/v - μ₂/v₁ = (μ₁ - μ₂)/R₂', marks: 1.5 },
      { step: 'Adding the two equations and substituting u = ∞, v = f to arrive at 1/f = (μ - 1)(1/R₁ - 1/R₂)', marks: 1 },
    ],
    examinerTrap:
      'Students frequently forget that for the second surface, the image I₁ acts as a VIRTUAL OBJECT inside the denser medium, meaning indices swap (μ₁ and μ₂ swap roles).',
    officialAnswer:
      'Refraction at surface 1 (radius R₁): (μ/v₁) - (1/u) = (μ - 1)/R₁ ... (i)\nRefraction at surface 2 (radius R₂): (1/v) - (μ/v₁) = (1 - μ)/R₂ = -(μ - 1)/R₂ ... (ii)\nAdding (i) and (ii): (1/v) - (1/u) = (μ - 1)[ 1/R₁ - 1/R₂ ]\nWhen object is at infinity (u = -∞), image is formed at focus (v = f):\n1/f = (μ - 1)[ 1/R₁ - 1/R₂ ].',
    formulaUsed: '1/f = (μ - 1)(1/R₁ - 1/R₂)',
    frequency: 'Guaranteed Board Archetype',
  },
  {
    id: 'pyq-phy-12-03',
    subject: 'Physics',
    classNum: 12,
    chapterId: 'c12-phy-03',
    chapterTitle: 'Current Electricity',
    year: '2024 CBSE Sample Paper',
    source: 'CBSE Official Sample Paper',
    marks: 3,
    type: 'sa',
    question:
      'Define drift velocity of free electrons. Establish the relation between electric current I and drift velocity v_d in a conductor of cross-sectional area A and electron density n.',
    cbseStepMarking: [
      { step: 'Definition of drift velocity with direction (average velocity opposite to applied electric field)', marks: 1 },
      { step: 'Volume of conductor element of length Δx = v_d · Δt and total charges ΔQ = n e A v_d Δt', marks: 1 },
      { step: 'Current relation I = ΔQ/Δt = n A e v_d with SI unit statement', marks: 1 },
    ],
    examinerTrap:
      'Writing drift velocity as "speed of electrons" gets 0 marks. You must use the word "average velocity" acquired under an external electric field.',
    officialAnswer:
      'Drift velocity (v_d) is defined as the average velocity with which conduction electrons drift towards the positive terminal of a conductor under the influence of an applied electric field.\nLet a conductor have cross-sectional area A and number density of electrons n.\nIn time interval Δt, electrons travel distance Δx = v_d Δt.\nVolume of conductor swept = A · v_d Δt.\nNumber of free electrons in this volume = n A v_d Δt.\nTotal charge passing cross-section: ΔQ = (n A v_d Δt) · e.\nCurrent I = ΔQ / Δt = n e A v_d.',
    formulaUsed: 'I = n e A v_d',
    frequency: 'High (Repeated 4+ times)',
  },
  {
    id: 'pyq-phy-12-04',
    subject: 'Physics',
    classNum: 12,
    chapterId: 'c12-phy-04',
    chapterTitle: 'Moving Charges and Magnetism',
    year: '2023 CBSE Board (Compartment)',
    source: 'CBSE All India',
    marks: 2,
    type: 'vsa',
    question:
      'An alpha particle and a proton enter a uniform perpendicular magnetic field with the same kinetic energy. Compare their radii of circular paths.',
    cbseStepMarking: [
      { step: 'Formula for radius in terms of kinetic energy: r = mv/qB = √(2mK) / (qB)', marks: 1 },
      { step: 'Ratio r_α / r_p = √(m_α/m_p) * (q_p/q_α) = √(4/1) * (1/2) = 2 * (1/2) = 1 : 1', marks: 1 },
    ],
    examinerTrap:
      'Using r = mv/qB directly without relating velocity to kinetic energy K = 1/2 m v² will lead to wrong ratios. Always substitute v = √(2K/m).',
    officialAnswer:
      'Radius r = mv / (qB) = √(2mK) / (qB).\nSince kinetic energy K and field B are identical for both particles:\nr ∝ √m / q.\nFor proton: m_p = m, q_p = e.\nFor alpha particle: m_α = 4m, q_α = 2e.\nr_α / r_p = [ √(4m) / 2e ] / [ √m / e ] = (2 / 2) = 1 : 1.\nBoth follow circular trajectories of equal radii.',
    formulaUsed: 'r = √(2mK) / (qB)',
    frequency: 'High (Repeated 4+ times)',
  },
  {
    id: 'pyq-phy-12-05',
    subject: 'Physics',
    classNum: 12,
    chapterId: 'c12-phy-01',
    chapterTitle: 'Electric Charges and Fields',
    year: '2024 CBSE Board',
    source: 'CBSE Board Question Paper',
    marks: 1,
    type: 'mcq',
    question:
      'An electric dipole of moment p is placed in a uniform electric field E. The torque τ acting on the dipole is maximum when the angle θ between p and E is:',
    options: ['0°', '45°', '90°', '180°'],
    correctOption: 2,
    cbseStepMarking: [{ step: 'Correct option selection with torque formula τ = pE sin θ', marks: 1 }],
    examinerTrap:
      'Confusing torque τ = pE sin θ with potential energy U = -pE cos θ. Torque is max at 90°, while potential energy is minimum at 0° (stable equilibrium).',
    officialAnswer:
      'Option (C) 90°. Torque τ = p × E, magnitude τ = pE sin θ. Maximum torque occurs when sin θ = 1, i.e., θ = 90° (dipole axis perpendicular to field).',
    formulaUsed: 'τ = pE sin θ',
    frequency: 'High (Repeated 4+ times)',
  },

  // --- CHEMISTRY CLASS 12 ---
  {
    id: 'pyq-chm-12-01',
    subject: 'Chemistry',
    classNum: 12,
    chapterId: 'c12-chm-01',
    chapterTitle: 'Solutions',
    year: '2024 CBSE Board',
    source: 'CBSE All India',
    marks: 3,
    type: 'sa',
    question:
      'A solution containing 8.0 g of a non-volatile, non-electrolyte solute in 100 g of water has a boiling point of 100.26 °C. Calculate the molar mass of the solute. (K_b for water = 0.52 K kg mol⁻¹, boiling point of pure water = 100 °C).',
    cbseStepMarking: [
      { step: 'Elevation in boiling point: ΔT_b = T_b - T_b° = 100.26 - 100.00 = 0.26 °C (or 0.26 K)', marks: 0.5 },
      { step: 'Formula: ΔT_b = (K_b * w_2 * 1000) / (M_2 * w_1)', marks: 1 },
      { step: 'Correct substitution of values: 0.26 = (0.52 * 8.0 * 1000) / (M_2 * 100)', marks: 1 },
      { step: 'Correct arithmetic result M_2 = 160 g mol⁻¹ with units', marks: 0.5 },
    ],
    examinerTrap:
      'Failing to specify units (g mol⁻¹) causes deduction of 0.5 marks. Also note: ΔT_b in °C is numerically identical to ΔT_b in Kelvin.',
    officialAnswer:
      '1. ΔT_b = 100.26 - 100.00 = 0.26 K.\n2. ΔT_b = K_b · m = (K_b · w_B · 1000) / (M_B · w_A).\n3. 0.26 = (0.52 · 8.0 · 1000) / (M_B · 100).\n4. M_B = (0.52 · 80) / 0.26 = 2 · 80 = 160 g mol⁻¹.',
    formulaUsed: 'ΔT_b = (K_b * w_B * 1000) / (M_B * w_A)',
    frequency: 'Guaranteed Board Archetype',
  },
  {
    id: 'pyq-chm-12-02',
    subject: 'Chemistry',
    classNum: 12,
    chapterId: 'c12-chm-02',
    chapterTitle: 'Electrochemistry',
    year: '2023 CBSE Board',
    source: 'CBSE Delhi Region',
    marks: 5,
    type: 'sa',
    question:
      '(a) State Kohlrausch’s law of independent migration of ions.\n(b) The molar conductivity of 0.025 mol L⁻¹ methanoic acid is 46.1 S cm² mol⁻¹. Calculate its degree of dissociation (α) and dissociation constant (K_a). Given: λ°(H⁺) = 349.6 S cm² mol⁻¹ and λ°(HCOO⁻) = 54.6 S cm² mol⁻¹.',
    cbseStepMarking: [
      { step: 'Correct statement of Kohlrausch’s Law', marks: 1.5 },
      { step: 'Calculating limiting molar conductivity: Λ°_m(HCOOH) = λ°(H⁺) + λ°(HCOO⁻) = 349.6 + 54.6 = 404.2 S cm² mol⁻¹', marks: 1 },
      { step: 'Degree of dissociation α = Λ_m / Λ°_m = 46.1 / 404.2 = 0.114', marks: 1 },
      { step: 'Dissociation constant K_a = cα² / (1 - α) = 0.025 * (0.114)² / (1 - 0.114) ≈ 3.67 × 10⁻⁴ mol L⁻¹ with unit', marks: 1.5 },
    ],
    examinerTrap:
      'Do not approximate (1 - α) ≈ 1 when α > 0.05! Since α = 0.114 (11.4%), you must use (1 - α) = 0.886 in the denominator to avoid mark deductions.',
    officialAnswer:
      '(a) Kohlrausch’s law: The limiting molar conductivity of an electrolyte can be represented as the sum of individual contributions of the anion and cation of the electrolyte: Λ°_m = ν₊ λ°₊ + ν₋ λ°₋.\n(b) Λ°_m(HCOOH) = 349.6 + 54.6 = 404.2 S cm² mol⁻¹.\nDegree of dissociation α = Λ_m / Λ°_m = 46.1 / 404.2 = 0.114.\nK_a = (c · α²) / (1 - α) = 0.025 · (0.114)² / (1 - 0.114) = (0.025 · 0.013) / 0.886 = 3.67 × 10⁻⁴ mol L⁻¹.',
    formulaUsed: 'α = Λ_m / Λ°_m; K_a = cα² / (1 - α)',
    frequency: 'Guaranteed Board Archetype',
  },
  {
    id: 'pyq-chm-12-03',
    subject: 'Chemistry',
    classNum: 12,
    chapterId: 'c12-chm-03',
    chapterTitle: 'Chemical Kinetics',
    year: '2024 CBSE Board',
    source: 'CBSE Sample Paper',
    marks: 3,
    type: 'sa',
    question:
      'Show that for a first order reaction, the time required for 99% completion of the reaction is twice the time required for the completion of 90% of the reaction.',
    cbseStepMarking: [
      { step: 'Integrated rate equation for 1st order: t = (2.303 / k) log([R]₀ / [R])', marks: 1 },
      { step: 'Time for 90%: t_90% = (2.303 / k) log(100 / 10) = (2.303 / k) log 10 = 2.303 / k', marks: 1 },
      { step: 'Time for 99%: t_99% = (2.303 / k) log(100 / 1) = (2.303 / k) log 10² = 2 * (2.303 / k) = 2 · t_90%', marks: 1 },
    ],
    examinerTrap:
      'A classic student error is writing [R] = 90% instead of remaining reactant [R] = 100 - 90 = 10%. Remember [R] in the formula is the REMAINING concentration!',
    officialAnswer:
      'For a first order reaction: t = (2.303 / k) log([R]₀ / [R]).\nFor 90% completion: [R] = [R]₀ - 0.90[R]₀ = 0.10[R]₀.\nt_90% = (2.303 / k) log([R]₀ / 0.10[R]₀) = (2.303 / k) log 10 = 2.303 / k ... (1)\nFor 99% completion: [R] = [R]₀ - 0.99[R]₀ = 0.01[R]₀.\nt_99% = (2.303 / k) log([R]₀ / 0.01[R]₀) = (2.303 / k) log 100 = 2 · (2.303 / k) ... (2)\nFrom (1) and (2): t_99% = 2 · t_90%. (Hence proved)',
    formulaUsed: 't = (2.303 / k) log([A]₀ / [A])',
    frequency: 'Guaranteed Board Archetype',
  },
  {
    id: 'pyq-chm-12-04',
    subject: 'Chemistry',
    classNum: 12,
    chapterId: 'c12-chm-07',
    chapterTitle: 'Aldehydes, Ketones and Carboxylic Acids',
    year: '2023 CBSE Board',
    source: 'CBSE All India',
    marks: 2,
    type: 'vsa',
    question:
      'Give chemical tests to distinguish between:\n(i) Acetaldehyde (Ethanal) and Benzaldehyde\n(ii) Acetophenone and Benzophenone',
    cbseStepMarking: [
      { step: '(i) Fehling’s test or Iodoform test with observations for both compounds', marks: 1 },
      { step: '(ii) Iodoform test: Acetophenone (CH₃C=O group) forms yellow ppt of CHI₃; Benzophenone does not', marks: 1 },
    ],
    examinerTrap:
      'Naming the test without specifying the OBSERVATION (e.g. "yellow precipitate of iodoform" or "red precipitate of Cu₂O") forfeits 50% of the marks.',
    officialAnswer:
      '(i) Fehling’s Test: Ethanal on heating with Fehling’s solution gives a red-brown precipitate of Cu₂O, whereas Benzaldehyde (aromatic aldehyde) does not reduce Fehling’s solution.\n(ii) Iodoform Test: Acetophenone contains a methyl ketone group (-COCH₃) and reacts with I₂/NaOH to give a yellow precipitate of Iodoform (CHI₃). Benzophenone does not give this test.',
    frequency: 'High (Repeated 4+ times)',
  },

  // --- MATHEMATICS CLASS 12 ---
  {
    id: 'pyq-mat-12-01',
    subject: 'Mathematics',
    classNum: 12,
    chapterId: 'c12-mat-07',
    chapterTitle: 'Integrals',
    year: '2024 CBSE Board (Set 2)',
    source: 'CBSE All India',
    marks: 5,
    type: 'sa',
    question: 'Evaluate the definite integral: I = ∫₀^(π/2) [ sin⁴x / (sin⁴x + cos⁴x) ] dx.',
    cbseStepMarking: [
      { step: 'Writing original integral: I = ∫₀^(π/2) [ sin⁴x / (sin⁴x + cos⁴x) ] dx ... (1)', marks: 1 },
      { step: 'Applying property ∫₀^a f(x)dx = ∫₀^a f(a - x)dx: I = ∫₀^(π/2) [ cos⁴x / (cos⁴x + sin⁴x) ] dx ... (2)', marks: 1.5 },
      { step: 'Adding (1) and (2): 2I = ∫₀^(π/2) 1 dx', marks: 1.5 },
      { step: 'Evaluating [x]₀^(π/2) = π/2 => I = π/4', marks: 1 },
    ],
    examinerTrap:
      'Forgetting to mention the specific property: ∫₀^a f(x)dx = ∫₀^a f(a - x)dx causes deduction of 1 step mark in CBSE boards.',
    officialAnswer:
      'Let I = ∫₀^(π/2) [ sin⁴x / (sin⁴x + cos⁴x) ] dx  ... (1)\nUsing the property ∫₀^a f(x) dx = ∫₀^a f(a - x) dx:\nI = ∫₀^(π/2) [ sin⁴(π/2 - x) / (sin⁴(π/2 - x) + cos⁴(π/2 - x)) ] dx\nI = ∫₀^(π/2) [ cos⁴x / (cos⁴x + sin⁴x) ] dx  ... (2)\nAdding (1) and (2):\n2I = ∫₀^(π/2) [ (sin⁴x + cos⁴x) / (sin⁴x + cos⁴x) ] dx\n2I = ∫₀^(π/2) 1 dx = [ x ]₀^(π/2) = π/2 - 0 = π/2.\nTherefore, I = π / 4.',
    formulaUsed: '∫₀^a f(x)dx = ∫₀^a f(a - x)dx',
    frequency: 'Guaranteed Board Archetype',
  },
  {
    id: 'pyq-mat-12-02',
    subject: 'Mathematics',
    classNum: 12,
    chapterId: 'c12-mat-04',
    chapterTitle: 'Determinants',
    year: '2023 CBSE Board',
    source: 'CBSE Delhi Region',
    marks: 5,
    type: 'sa',
    question:
      'Solve the following system of linear equations using matrix method:\n2x + 3y + 3z = 5\nx - 2y + z = -4\n3x - y - 2z = 3',
    cbseStepMarking: [
      { step: 'Writing in matrix form AX = B and calculating |A| = -40 ≠ 0 (non-singular, unique solution)', marks: 1.5 },
      { step: 'Calculating all 9 cofactors correctly', marks: 1.5 },
      { step: 'Finding adj(A) = transpose of cofactor matrix', marks: 1 },
      { step: 'Evaluating X = A⁻¹ B = (1/|A|) adj(A) B to obtain x = 1, y = 2, z = -1', marks: 1 },
    ],
    examinerTrap:
      'Sign errors in cofactors C_ij = (-1)^(i+j) M_ij. Always double-check C_12, C_21, C_23, C_32 where (-1)^(i+j) = -1.',
    officialAnswer:
      'Matrix A = [[2, 3, 3], [1, -2, 1], [3, -1, -2]], X = [x, y, z]^T, B = [5, -4, 3]^T.\n|A| = 2(4 + 1) - 3(-2 - 3) + 3(-1 + 6) = 10 + 15 + 15 = 40 (≠ 0). Matrix is invertible.\nCofactors:\nA₁₁ = 5, A₁₂ = 5, A₁₃ = 5\nA₂₁ = 3, A₂₂ = -13, A₂₃ = 11\nA₃₁ = 9, A₃₂ = 1, A₃₃ = -7\nadj(A) = [[5, 3, 9], [5, -13, 1], [5, 11, -7]].\nX = (1/40) * [[5, 3, 9], [5, -13, 1], [5, 11, -7]] * [5, -4, 3]^T = [1, 2, -1]^T.\nSolution: x = 1, y = 2, z = -1.',
    formulaUsed: 'X = A⁻¹ B = (1/|A|) adj(A) B',
    frequency: 'Guaranteed Board Archetype',
  },
  {
    id: 'pyq-mat-12-03',
    subject: 'Mathematics',
    classNum: 12,
    chapterId: 'c12-mat-11',
    chapterTitle: 'Three Dimensional Geometry',
    year: '2024 CBSE Board',
    source: 'CBSE All India',
    marks: 3,
    type: 'sa',
    question:
      'Find the shortest distance between the skew lines:\nr = (i + 2j + k) + λ(i - j + k) and r = (2i - j - k) + μ(2i + j + 2k).',
    cbseStepMarking: [
      { step: 'Identifying vectors a₁, b₁, a₂, b₂ and evaluating (a₂ - a₁) = i - 3j - 2k', marks: 1 },
      { step: 'Evaluating cross product b₁ × b₂ = -3i + 0j + 3k and its magnitude |b₁ × b₂| = 3√2', marks: 1 },
      { step: 'Calculating d = |(b₁ × b₂) · (a₂ - a₁)| / |b₁ × b₂| = |-3 - 6| / (3√2) = 9 / (3√2) = 3/√2 units', marks: 1 },
    ],
    examinerTrap:
      'Writing the scalar dot product without the absolute value sign |...|. Distance cannot be negative; always apply absolute value.',
    officialAnswer:
      'a₁ = i + 2j + k, b₁ = i - j + k\na₂ = 2i - j - k, b₂ = 2i + j + 2k\na₂ - a₁ = i - 3j - 2k.\nb₁ × b₂ = |[i, j, k], [1, -1, 1], [2, 1, 2]| = i(-2 - 1) - j(2 - 2) + k(1 + 2) = -3i + 3k.\n|b₁ × b₂| = √((-3)² + 0² + 3²) = √18 = 3√2.\n(b₁ × b₂) · (a₂ - a₁) = (-3)(1) + (0)(-3) + (3)(-2) = -3 - 6 = -9.\nShortest distance d = | (b₁ × b₂) · (a₂ - a₁) | / |b₁ × b₂| = |-9| / (3√2) = 9 / (3√2) = 3 / √2 units (or 3√2 / 2 units).',
    formulaUsed: 'd = |(b₁ × b₂) · (a₂ - a₁)| / |b₁ × b₂|',
    frequency: 'Guaranteed Board Archetype',
  },
  // --- CLASS 11 SAMPLES ---
  {
    id: 'pyq-phy-11-01',
    subject: 'Physics',
    classNum: 11,
    chapterId: 'c11-phy-03',
    chapterTitle: 'Laws of Motion',
    year: '2023 CBSE Class 11 Exam',
    source: 'CBSE Standardized School Paper',
    marks: 3,
    type: 'derivation',
    question:
      'State the principle of conservation of linear momentum. Derive it using Newton’s third law of motion.',
    cbseStepMarking: [
      { step: 'Formal statement of law: Total linear momentum of an isolated system remains constant', marks: 1 },
      { step: 'Two colliding bodies A and B with action-reaction pair F_AB = -F_BA', marks: 1 },
      { step: 'Equating impulse Δp_A/Δt = -Δp_B/Δt => Δp_A + Δp_B = 0 => p_initial = p_final', marks: 1 },
    ],
    examinerTrap:
      'Omitting the prerequisite condition "in the absence of an external force" / "isolated system" leads to deduction of 0.5 marks.',
    officialAnswer:
      'Statement: In the absence of an external force, the vector sum of linear momenta of a interacting system of particles remains constant over time.\nDerivation: Consider two bodies A and B colliding for time interval Δt.\nBy Newton’s 3rd Law: F_AB = -F_BA.\nFrom Newton’s 2nd Law: F_AB = Δp_A / Δt and F_BA = Δp_B / Δt.\nTherefore: Δp_A / Δt = -(Δp_B / Δt)\n=> Δp_A + Δp_B = 0\n=> p_A(final) - p_A(initial) + p_B(final) - p_B(initial) = 0\n=> p_A(final) + p_B(final) = p_A(initial) + p_B(initial). (Proved)',
    frequency: 'High (Repeated 4+ times)',
  },
  {
    id: 'pyq-chm-11-01',
    subject: 'Chemistry',
    classNum: 11,
    chapterId: 'c11-chm-03',
    chapterTitle: 'Chemical Bonding and Molecular Structure',
    year: '2024 CBSE Class 11 Exam',
    source: 'CBSE Sample Paper',
    marks: 3,
    type: 'sa',
    question:
      'Write the molecular orbital configuration of O₂ and N₂. Predict their magnetic behavior and compare their bond orders.',
    cbseStepMarking: [
      { step: 'Correct MO configuration for O₂ (16 e⁻) showing unpaired electrons in π*2px & π*2py (Paramagnetic)', marks: 1.5 },
      { step: 'Correct MO configuration for N₂ (14 e⁻) with π2px = π2py filled before σ2pz (Diamagnetic)', marks: 1 },
      { step: 'Bond order comparison: Bond Order(O₂) = (10 - 6)/2 = 2; Bond Order(N₂) = (10 - 4)/2 = 3', marks: 0.5 },
    ],
    examinerTrap:
      'Remember that for N₂ (≤14 electrons), the energy order has π2px = π2py LOWER than σ2pz. For O₂ (>14 electrons), σ2pz is LOWER than π2px = π2py.',
    officialAnswer:
      'N₂ (14 electrons):\nσ1s² σ*1s² σ2s² σ*2s² (π2p_x² = π2p_y²) σ2p_z²\nBond Order = (N_b - N_a)/2 = (10 - 4)/2 = 3.\nAll electrons paired => Diamagnetic.\n\nO₂ (16 electrons):\nσ1s² σ*1s² σ2s² σ*2s² σ2p_z² (π2p_x² = π2p_y²) (π*2p_x¹ = π*2p_y¹)\nBond Order = (10 - 6)/2 = 2.\nContains 2 unpaired electrons in degenerate antibonding orbitals => Paramagnetic.',
    formulaUsed: 'Bond Order = (N_b - N_a) / 2',
    frequency: 'Guaranteed Board Archetype',
  },
];
