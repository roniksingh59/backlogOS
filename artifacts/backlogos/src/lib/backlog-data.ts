import { getCurriculumChapterById } from './curriculum/chapters-index';

export type StandardSubject = 'Physics' | 'Chemistry' | 'Mathematics';
export type Subject = StandardSubject | string;
export type TaskKind = 'learning' | 'practice' | 'revision';
export type Confidence = 'rusty' | 'mixed' | 'solid';

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

export type DayRhythmType = 'dual_core' | 'wednesday_pivot' | 'weekend_booster' | 'emergency_triage' | 'consolidation';

export type PlanDaySlot = {
  slotNumber: 1 | 2 | 3;
  title: string;
  subject: Subject;
  chapterId: string;
  chapterTitle: string;
  durationMinutes: number;
  kind: 'learning' | 'practice' | 'revision';
  objective: string;
};

export type PlanDay = {
  day: number;
  dayOfWeekLabel?: string;
  rhythmType?: DayRhythmType;
  rhythmBadge: string;
  theme: string;
  chapterId: string; // Slot 1 Primary chapter
  chapterTitle: string;
  subject: Subject;
  secondaryChapterId?: string; // Slot 2 Secondary/Elective chapter
  secondaryChapterTitle?: string;
  secondarySubject?: Subject;
  slots?: PlanDaySlot[];
  isPrerequisite: boolean;
  isRecap: boolean;
  tasks: PlanTask[];
};

export type PlanDuration = 1 | 3 | 7 | 14 | 21 | 30 | 60;

export type PlanDurationOption = {
  days: PlanDuration;
  label: string;
  badge: string;
  description: string;
};

export const PLAN_DURATION_OPTIONS: PlanDurationOption[] = [
  { days: 1, label: '1-Day Emergency Sprint', badge: 'Crisis Rescue', description: 'Key formulas & high-yield questions for quick triage' },
  { days: 3, label: '3-Day Weekend Bootcamp', badge: 'High Intensity', description: 'Clear core blockers and bottlenecks in one weekend' },
  { days: 7, label: '7-Day Fast Track', badge: 'Recommended', description: 'Prerequisites first, followed by core chapters' },
  { days: 14, label: '14-Day Deep Revision', badge: 'Standard Route', description: '2-week cycle with active recall and rest breaks' },
  { days: 21, label: '21-Day Habit Mastery', badge: 'Habit Anchor', description: 'Steady 3-week routine to complete syllabus step by step' },
  { days: 30, label: '30-Day Complete Overhaul', badge: 'Full Backlog Reset', description: 'Full syllabus reset with progress checkpoints' },
];

export type StudentPlanInput = {
  board: string;
  subjects: Subject[];
  chapterIds: string[];
  minutesPerDay: number;
  goal: string;
  priority: string;
  confidence: Confidence;
  examDate: string;
  planDuration?: PlanDuration;
};

export type StudentPlan = StudentPlanInput & {
  planDuration: PlanDuration;
  plannedChapterIds: string[];
  prerequisiteIds: string[];
  orderReason: string;
  coverageNote: string;
  days: PlanDay[];
  createdAt: string;
};

export type ChapterOverview = {
  summary: string;
  outcomes: string[];
  formulaNotes: string[];
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
  { id: 'phy-solids', subject: 'Physics', title: 'Mechanical Properties of Solids', note: 'Stress, strain and elastic behaviour', order: 11, tag: 'Core' },
  { id: 'phy-fluids', subject: 'Physics', title: 'Mechanical Properties of Fluids', note: 'Pressure, buoyancy and fluid flow', order: 12, tag: 'Core' },
  { id: 'phy-thermal', subject: 'Physics', title: 'Thermal Properties of Matter', note: 'Expansion, calorimetry and heat transfer', order: 13, tag: 'Core' },
  { id: 'phy-kinetic', subject: 'Physics', title: 'Kinetic Theory', note: 'Microscopic view of gases and temperature', order: 14, tag: 'Core' },
  { id: 'phy-oscillations', subject: 'Physics', title: 'Oscillations', note: 'SHM, energy and pendulums', order: 15, tag: 'Core' },
  { id: 'phy-waves', subject: 'Physics', title: 'Waves', note: 'Wave motion, sound and superposition', order: 16, tag: 'Core' },
  { id: 'chem-basic', subject: 'Chemistry', title: 'Some Basic Concepts of Chemistry', note: 'Mole concept and stoichiometry', order: 1, tag: 'Start here' },
  { id: 'chem-structure', subject: 'Chemistry', title: 'Structure of Atom', note: 'Models, quantum numbers and orbitals', order: 2, tag: 'Foundation' },
  { id: 'chem-periodic', subject: 'Chemistry', title: 'Classification of Elements', note: 'Periodic trends and table', order: 3, tag: 'Foundation' },
  { id: 'chem-bonding', subject: 'Chemistry', title: 'Chemical Bonding', note: 'Lewis structures and shapes', order: 4, tag: 'Core' },
  { id: 'chem-thermo', subject: 'Chemistry', title: 'Thermodynamics', note: 'Enthalpy and Hess law', order: 5, tag: 'Core' },
  { id: 'chem-states', subject: 'Chemistry', title: 'States of Matter', note: 'Gas laws, kinetic theory and liquids', order: 6, tag: 'Foundation' },
  { id: 'chem-equilibrium', subject: 'Chemistry', title: 'Equilibrium', note: 'Dynamic equilibrium, acids and bases', order: 7, tag: 'Core' },
  { id: 'chem-redox', subject: 'Chemistry', title: 'Redox Reactions', note: 'Oxidation numbers and electron transfer', order: 8, tag: 'Core' },
  { id: 'chem-hydrogen', subject: 'Chemistry', title: 'Hydrogen', note: 'Isotopes, hydrides and water', order: 9, tag: 'Core' },
  { id: 'chem-sblock', subject: 'Chemistry', title: 'The s-Block Elements', note: 'Group 1 and 2 trends and compounds', order: 10, tag: 'Core' },
  { id: 'chem-pblock', subject: 'Chemistry', title: 'The p-Block Elements', note: 'Group 13 and 14 properties', order: 11, tag: 'Core' },
  { id: 'chem-organic', subject: 'Chemistry', title: 'Organic Chemistry: Basic Principles', note: 'Nomenclature, mechanisms and isomerism', order: 12, tag: 'Foundation' },
  { id: 'chem-hydrocarbons', subject: 'Chemistry', title: 'Hydrocarbons', note: 'Alkanes, alkenes, alkynes and aromatics', order: 13, tag: 'Core' },
  { id: 'chem-environment', subject: 'Chemistry', title: 'Environmental Chemistry', note: 'Pollution, ozone and green chemistry', order: 14, tag: 'Core' },
  { id: 'math-sets', subject: 'Mathematics', title: 'Sets & Functions', note: 'Notation, mappings and domains', order: 1, tag: 'Start here' },
  { id: 'math-trig', subject: 'Mathematics', title: 'Trigonometric Functions', note: 'Identities, equations and graphs', order: 2, tag: 'Foundation' },
  { id: 'math-complex', subject: 'Mathematics', title: 'Complex Numbers', note: 'Argand plane and algebra', order: 3, tag: 'Core' },
  { id: 'math-sequence', subject: 'Mathematics', title: 'Sequences & Series', note: 'AP, GP and summation', order: 4, tag: 'Core' },
  { id: 'math-straight', subject: 'Mathematics', title: 'Straight Lines', note: 'Slope, forms and distance', order: 5, tag: 'Core' },
  { id: 'math-inequalities', subject: 'Mathematics', title: 'Linear Inequalities', note: 'Intervals, graphs and solution sets', order: 6, tag: 'Core' },
  { id: 'math-pnc', subject: 'Mathematics', title: 'Permutations & Combinations', note: 'Counting arrangements and selections', order: 7, tag: 'Core' },
  { id: 'math-binomial', subject: 'Mathematics', title: 'Binomial Theorem', note: 'Expansion, terms and coefficients', order: 8, tag: 'Core' },
  { id: 'math-conic', subject: 'Mathematics', title: 'Conic Sections', note: 'Circle, parabola, ellipse and hyperbola', order: 9, tag: 'Core' },
  { id: 'math-3d', subject: 'Mathematics', title: 'Introduction to Three-Dimensional Geometry', note: 'Coordinates, distance and direction ratios', order: 10, tag: 'Core' },
  { id: 'math-limits', subject: 'Mathematics', title: 'Limits & Derivatives', note: 'Approach, continuity and rate of change', order: 11, tag: 'Foundation' },
  { id: 'math-statistics', subject: 'Mathematics', title: 'Statistics', note: 'Dispersion, variance and standard deviation', order: 12, tag: 'Core' },
  { id: 'math-probability', subject: 'Mathematics', title: 'Probability', note: 'Events, outcomes and basic probability', order: 13, tag: 'Core' },
];

export const subjectNotes: Record<Subject, string> = {
  Physics: 'Build intuition first, then put it to work.',
  Chemistry: 'Make the patterns visible and memorable.',
  Mathematics: 'Warm up with examples before the hard set.',
};

const content = (
  summary: string,
  outcomes: string[],
  formulaNotes: string[],
): ChapterOverview => ({ summary, outcomes, formulaNotes });

export const chapterOverviews: Record<string, ChapterOverview> = {
  'phy-units': content(
    'Physics becomes easier when every number has a unit and every measurement has a sensible precision.',
    ['Use dimensional analysis to test an equation.', 'Separate systematic and random error.', 'Round answers using significant-figure rules.'],
    ['Percentage error in a product: add percentage errors.', 'Dimensions of force: [M L T⁻²].', '1 N = 1 kg m s⁻².'],
  ),
  'phy-vectors': content(
    'Motion in one dimension is about choosing a sign convention, reading graphs, and connecting position, velocity, and acceleration.',
    ['Interpret x–t and v–t graphs.', 'Use constant-acceleration equations.', 'Distinguish distance from displacement.'],
    ['v = u + at', 's = ut + ½at²', 'v² − u² = 2as'],
  ),
  'phy-motion-plane': content(
    'Two-dimensional motion becomes two independent one-dimensional problems when you resolve vectors along perpendicular axes.',
    ['Resolve vectors into components.', 'Use projectile symmetry.', 'Combine horizontal and vertical motion correctly.'],
    ['R = √(A² + B² + 2AB cos θ)', 'Projectile range: R = u² sin 2θ / g', 'At top of projectile: vᵧ = 0'],
  ),
  'phy-laws': content(
    'Dynamics starts with a careful free-body diagram: list forces, choose axes, then apply Newton’s second law.',
    ['Draw free-body diagrams.', 'Handle friction and connected bodies.', 'Use net force rather than one force in isolation.'],
    ['ΣF = ma', 'Static friction: fₛ ≤ μₛN', 'Kinetic friction: fₖ = μₖN'],
  ),
  'phy-work': content(
    'Energy methods often turn a long force calculation into a short comparison between initial and final states.',
    ['Compute work from force and displacement.', 'Use conservation of mechanical energy.', 'Relate power to the rate of doing work.'],
    ['W = F s cos θ', 'K = ½mv²', 'P = dW/dt = F·v'],
  ),
  'phy-system': content(
    'Momentum and centre of mass let you study a group of particles without tracking every internal force.',
    ['Locate a centre of mass.', 'Apply momentum conservation.', 'Distinguish internal and external forces.'],
    ['r_cm = Σmᵢrᵢ / Σmᵢ', 'p = mv', 'Impulse J = Δp'],
  ),
  'phy-rotation': content(
    'Rotational motion mirrors linear motion, but torque, moment of inertia, and angular momentum replace force, mass, and momentum.',
    ['Calculate torque about a point.', 'Use rotational kinematics.', 'Compare rolling and slipping.'],
    ['τ = r × F', 'τ = Iα', 'L = Iω', 'K_rot = ½Iω²'],
  ),
  'phy-gravity': content(
    'Gravitation connects inverse-square force, potential energy, orbital speed, and escape speed.',
    ['Use Newton’s law of gravitation.', 'Relate g to altitude and depth.', 'Solve basic satellite questions.'],
    ['F = GMm/r²', 'g = GM/R²', 'v_orbit = √(GM/r)', 'v_escape = √(2GM/R)'],
  ),
  'phy-properties': content(
    'Properties of matter explain how solids deform and how fluids respond to pressure, depth, and flow.',
    ['Relate stress and strain.', 'Apply pressure and buoyancy ideas.', 'Use continuity in simple flow problems.'],
    ['Stress = force/area', 'Strain = change/original dimension', 'P = P₀ + ρgh', 'A₁v₁ = A₂v₂'],
  ),
  'phy-thermo': content(
    'Thermodynamics tracks energy transfer as heat and work, with the first law keeping the accounting honest.',
    ['Distinguish heat from temperature.', 'Apply the first law.', 'Read simple process diagrams.'],
    ['ΔQ = ΔU + ΔW', 'For ideal gas: PV = nRT', 'Efficiency = useful output/input'],
  ),
  'phy-world': content(
    'Physics is a way of building models from observation, measurement, and evidence rather than memorising isolated facts.',
    ['Identify the scope of classical physics.', 'Distinguish a model from the real system.', 'Recognise the role of units and uncertainty.'],
    ['A physical law should be testable.', 'Every measurement has a unit and a limit of precision.', 'Models are useful within stated assumptions.'],
  ),
  'phy-solids': content(
    'Solids resist deformation, and the way they stretch or compress is captured by stress, strain, and elastic constants.',
    ['Read stress–strain behaviour.', 'Use Young’s, bulk, and shear modulus.', 'Distinguish elastic and plastic deformation.'],
    ['Stress = F/A', 'Strain = ΔL/L', 'Young’s modulus = stress/longitudinal strain', 'Elastic energy density = ½ × stress × strain'],
  ),
  'phy-fluids': content(
    'Fluid mechanics begins with pressure and builds toward buoyancy, continuity, and Bernoulli’s energy picture.',
    ['Relate pressure to depth.', 'Apply Archimedes’ principle.', 'Use continuity and Bernoulli’s equation in simple flows.'],
    ['P = F/A', 'P = P₀ + ρgh', 'A₁v₁ = A₂v₂', 'P + ½ρv² + ρgh = constant'],
  ),
  'phy-thermal': content(
    'Thermal properties explain how temperature changes size, heat capacity, and the flow of energy through matter.',
    ['Use linear expansion.', 'Apply calorimetry and heat capacity.', 'Compare conduction, convection, and radiation.'],
    ['ΔL = αLΔT', 'Q = mcΔT', 'Q = mL for a phase change', 'Stefan’s law: P ∝ AT⁴'],
  ),
  'phy-kinetic': content(
    'Kinetic theory explains gas pressure and temperature using the motion and collisions of microscopic particles.',
    ['Connect temperature to average kinetic energy.', 'Use the ideal-gas picture.', 'Interpret mean free path qualitatively.'],
    ['PV = nRT', 'Average translational kinetic energy per molecule = 3/2 kT', 'P = 1/3 ρ c_rms²'],
  ),
  'phy-oscillations': content(
    'Oscillation is repeated motion about an equilibrium position; simple harmonic motion is the special case with restoring force proportional to displacement.',
    ['Identify SHM conditions.', 'Relate displacement, velocity, and energy.', 'Use spring and pendulum periods.'],
    ['a = −ω²x', 'x = A sin(ωt + φ)', 'T_spring = 2π√(m/k)', 'T_pendulum = 2π√(l/g)'],
  ),
  'phy-waves': content(
    'Waves carry energy and information through oscillations, while superposition explains interference, beats, and standing waves.',
    ['Distinguish longitudinal and transverse waves.', 'Use the wave equation.', 'Describe standing-wave patterns.'],
    ['v = fλ', 'y = A sin(kx − ωt)', 'Beat frequency = |f₁ − f₂|', 'For a string: v = √(T/μ)'],
  ),
  'chem-basic': content(
    'The mole concept is chemistry’s counting system: it connects microscopic particles to measurable mass and volume.',
    ['Convert between mass, moles, and particles.', 'Balance equations.', 'Calculate limiting reagent and percentage yield.'],
    ['n = mass / molar mass', 'N = nN_A', 'Molarity = moles / volume in litres'],
  ),
  'chem-structure': content(
    'Atomic structure explains why electrons occupy quantised energy levels and why spectra contain discrete lines.',
    ['Use quantum numbers.', 'Write electronic configurations.', 'Connect transitions to spectra.'],
    ['E_n ∝ −1/n² for hydrogen-like atoms', 'c = νλ', 'ΔE = hν'],
  ),
  'chem-periodic': content(
    'The periodic table is a map of repeating electronic patterns, so position helps predict properties and reactivity.',
    ['Read groups and periods.', 'Explain atomic-size trends.', 'Compare ionisation energy and electronegativity.'],
    ['Across a period: effective nuclear charge generally rises.', 'Down a group: shells and size generally rise.', 'Cation radius < atom radius < anion radius.'],
  ),
  'chem-bonding': content(
    'Chemical bonding is a model for how atoms lower their energy by sharing, transferring, or delocalising electrons.',
    ['Draw Lewis structures.', 'Predict basic molecular shape.', 'Distinguish ionic, covalent, and coordinate bonding.'],
    ['Formal charge = valence − nonbonding − ½ bonding electrons.', 'Steric number = sigma bonds + lone pairs.', 'Dipole moment depends on charge separation and geometry.'],
  ),
  'chem-thermo': content(
    'Chemical thermodynamics applies energy accounting to reactions, especially enthalpy changes measured at constant pressure.',
    ['Use enthalpy signs.', 'Apply Hess’s law.', 'Relate spontaneity to energy and disorder qualitatively.'],
    ['ΔH = H_products − H_reactants', 'ΔG = ΔH − TΔS', 'q = m c ΔT'],
  ),
  'chem-states': content(
    'States of matter connects observable gas behaviour to particle motion, pressure, temperature, and intermolecular forces.',
    ['Use gas laws.', 'Apply the ideal-gas equation.', 'Compare intermolecular forces in liquids and gases.'],
    ['PV = nRT', 'P₁V₁/T₁ = P₂V₂/T₂', 'd = PM/RT', 'ΔT(K) = ΔT(°C)'],
  ),
  'chem-equilibrium': content(
    'Equilibrium is dynamic: forward and reverse reactions continue, but their rates become equal in a closed system.',
    ['Write equilibrium expressions.', 'Use Le Chatelier’s principle.', 'Handle basic acid–base equilibrium.'],
    ['K_c = products/reactants with powers as coefficients', 'pH = −log[H⁺]', 'K_w = [H⁺][OH⁻]'],
  ),
  'chem-redox': content(
    'Redox reactions move electrons between species; oxidation numbers make that movement trackable even when electrons are not shown directly.',
    ['Assign oxidation numbers.', 'Identify oxidising and reducing agents.', 'Balance simple redox changes.'],
    ['Oxidation = increase in oxidation number', 'Reduction = decrease in oxidation number', 'Oxidant is reduced; reductant is oxidised.'],
  ),
  'chem-hydrogen': content(
    'Hydrogen is the lightest element but forms a wide range of bonds, isotopes, hydrides, and hydrogen-bonded substances.',
    ['Compare hydrogen isotopes.', 'Classify hydrides.', 'Explain water’s unusual properties.'],
    ['H₂ is a diatomic molecule.', 'Hard water contains Ca²⁺/Mg²⁺ salts.', 'Hydrogen bonding raises boiling point.'],
  ),
  'chem-sblock': content(
    'The s-block elements tend to lose their outer s electrons and form ionic compounds with predictable group trends.',
    ['Read group 1 and 2 trends.', 'Compare important compounds.', 'Explain anomalous first-member behaviour.'],
    ['Group 1 configuration: ns¹', 'Group 2 configuration: ns²', 'Basic strength of many hydroxides increases down the group.'],
  ),
  'chem-pblock': content(
    'The p-block contains metals, metalloids, and non-metals whose properties change across a period as valence electrons are added to p orbitals.',
    ['Use group 13 and 14 trends.', 'Compare boron and carbon families.', 'Recognise inert-pair effects qualitatively.'],
    ['p-block valence configuration: ns²np¹–⁶', 'Catenation is strong in carbon.', 'Inert pair effect increases down heavier groups.'],
  ),
  'chem-organic': content(
    'Organic chemistry becomes manageable when structure, nomenclature, electronic effects, and reaction mechanisms are treated as a connected language.',
    ['Name basic organic compounds.', 'Identify functional groups.', 'Use inductive and resonance effects.'],
    ['Homologous series differ by –CH₂–.', 'Degree of unsaturation = (2C+2+N−H−X)/2.', 'Electrophile accepts an electron pair; nucleophile donates one.'],
  ),
  'chem-hydrocarbons': content(
    'Hydrocarbons contain only carbon and hydrogen, but bonding changes their shapes, reactivity, and common addition or substitution reactions.',
    ['Classify alkanes, alkenes, and alkynes.', 'Use basic IUPAC names.', 'Recognise addition and substitution patterns.'],
    ['Alkane: CₙH₂ₙ₊₂', 'Alkene: CₙH₂ₙ', 'Alkyne: CₙH₂ₙ₋₂', 'Aromatic benzene: C₆H₆'],
  ),
  'chem-environment': content(
    'Environmental chemistry connects familiar pollutants to their sources, effects, and the chemical choices that can reduce harm.',
    ['Identify major air pollutants.', 'Explain ozone depletion and smog.', 'Use green-chemistry thinking.'],
    ['Primary pollutant is emitted directly.', 'Secondary pollutant forms in the atmosphere.', 'Green chemistry aims to reduce waste and hazardous substances at source.'],
  ),
  'math-sets': content(
    'Sets and functions give mathematics a precise language for inputs, outputs, domains, and relationships.',
    ['Use set notation and operations.', 'Find domains and ranges.', 'Test whether a relation is a function.'],
    ['(f ∘ g)(x) = f(g(x))', 'n(A ∪ B) = n(A) + n(B) − n(A ∩ B)', 'A\\B = A ∩ Bᶜ'],
  ),
  'math-trig': content(
    'Trigonometry connects angles to ratios, identities, graphs, and periodic behaviour.',
    ['Use standard identities.', 'Solve basic trigonometric equations.', 'Read amplitude and period from graphs.'],
    ['sin²x + cos²x = 1', '1 + tan²x = sec²x', 'sin(A ± B) = sinA cosB ± cosA sinB'],
  ),
  'math-complex': content(
    'Complex numbers extend the real line so equations such as x² + 1 = 0 have solutions.',
    ['Perform complex arithmetic.', 'Use conjugates and modulus.', 'Represent numbers on the Argand plane.'],
    ['i² = −1', 'z z̄ = |z|²', 'z = r(cos θ + i sin θ)'],
  ),
  'math-sequence': content(
    'Sequences and series turn repeated patterns into formulas for terms, sums, and growth.',
    ['Identify AP and GP patterns.', 'Find nth terms.', 'Use finite and infinite sum formulas.'],
    ['AP: a_n = a + (n−1)d', 'AP sum: S_n = n/2[2a+(n−1)d]', 'GP sum: S_n = a(rⁿ−1)/(r−1)'],
  ),
  'math-straight': content(
    'Coordinate geometry turns lines into equations so slope, distance, and intersection become computable.',
    ['Use multiple line forms.', 'Calculate angle and distance.', 'Find intersections and families of lines.'],
    ['Slope m = (y₂−y₁)/(x₂−x₁)', 'Point-slope: y−y₁ = m(x−x₁)', 'Distance from ax+by+c=0: |ax₁+by₁+c|/√(a²+b²)'],
  ),
  'math-inequalities': content(
    'Linear inequalities describe ranges rather than single answers, so the sign and the number line matter as much as the algebra.',
    ['Solve one-variable inequalities.', 'Represent intervals on a number line.', 'Handle compound inequalities.'],
    ['Multiplying or dividing by a negative reverses the inequality sign.', 'Use open endpoints for strict inequalities.', 'Intersection means satisfy both conditions.'],
  ),
  'math-pnc': content(
    'Counting becomes reliable when you first decide whether order matters and whether repetition is allowed.',
    ['Choose between permutations and combinations.', 'Count arrangements with restrictions.', 'Use factorial notation.'],
    ['n! = n(n−1)…1', 'ⁿPᵣ = n!/(n−r)!', 'ⁿCᵣ = n!/[r!(n−r)!]', 'ⁿCᵣ = ⁿCₙ₋ᵣ'],
  ),
  'math-binomial': content(
    'The binomial theorem replaces repeated multiplication with a predictable coefficient pattern and powers of the two terms.',
    ['Expand a binomial.', 'Find a specific term.', 'Use coefficient symmetry.'],
    ['(a+b)ⁿ = Σ ⁿCᵣ aⁿ⁻ʳbʳ', 'General term Tᵣ₊₁ = ⁿCᵣ aⁿ⁻ʳbʳ', 'ⁿCᵣ = ⁿCₙ₋ᵣ'],
  ),
  'math-conic': content(
    'Conic sections are curves created by slicing a cone; their equations encode distance, symmetry, and focus–directrix properties.',
    ['Recognise standard conics.', 'Find centre, vertex, and radius.', 'Use basic focus and eccentricity ideas.'],
    ['Circle: (x−h)²+(y−k)²=r²', 'Parabola: y²=4ax', 'Ellipse: x²/a²+y²/b²=1', 'Hyperbola: x²/a²−y²/b²=1'],
  ),
  'math-3d': content(
    'Three-dimensional geometry extends coordinate ideas to points and distances in space.',
    ['Use coordinates in space.', 'Calculate distance and section formula.', 'Interpret direction ratios.'],
    ['Distance = √[(x₂−x₁)²+(y₂−y₁)²+(z₂−z₁)²]', 'Midpoint = ((x₁+x₂)/2, …)', 'Direction cosines satisfy l²+m²+n²=1'],
  ),
  'math-limits': content(
    'A limit describes the value a function approaches, while a derivative measures the instantaneous rate of change at a point.',
    ['Evaluate basic limits.', 'Use derivative definitions.', 'Interpret slope and rate of change.'],
    ['f′(x) = limₕ→0 [f(x+h)−f(x)]/h', 'd(xⁿ)/dx = n xⁿ⁻¹', 'd(sin x)/dx = cos x'],
  ),
  'math-statistics': content(
    'Statistics summarises a data set while also showing how spread out the observations are around a centre.',
    ['Calculate mean and variance.', 'Use standard deviation.', 'Compare consistency of data sets.'],
    ['Mean = Σx/n', 'Variance = mean of squared deviations', 'Standard deviation = √variance', 'Coefficient of variation = SD/mean × 100'],
  ),
  'math-probability': content(
    'Probability turns uncertainty into a number between zero and one, with events built from possible outcomes.',
    ['Define sample space and events.', 'Use complements.', 'Calculate simple event probabilities.'],
    ['P(E) = favourable outcomes/total equally likely outcomes', 'P(Eᶜ)=1−P(E)', '0≤P(E)≤1'],
  ),
};

export function getChapterOverview(chapterId: string): ChapterOverview {
  return chapterOverviews[chapterId] ?? {
    summary: 'Use the chapter title as your anchor, then explain the idea in your own words before attempting questions.',
    outcomes: ['Define the core terms.', 'Work through one example.', 'Recall key formulas without peeking.'],
    formulaNotes: ['Write the relationship in symbols.', 'Label every quantity and unit.', 'Check whether the answer is sensible.'],
  };
}

const kindLabels: Record<TaskKind, string> = {
  learning: 'Learning',
  practice: 'Practice',
  revision: 'Review',
};

const subjectOrder: Subject[] = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English', 'Computer Science'];

export function isCoreSubject(subject: string): boolean {
  if (!subject) return true;
  const s = subject.toLowerCase().trim();
  return (
    s.includes('physic') ||
    s.includes('chemist') ||
    s.includes('math') ||
    s.includes('biolog') ||
    s.includes('account') ||
    s.includes('science')
  );
}

export function isAuxiliaryOrElective(subject: string): boolean {
  if (!subject) return false;
  const s = subject.toLowerCase().trim();
  return (
    s.includes('english') ||
    s.includes('computer') ||
    s.includes('cs') ||
    s.includes('informatics') ||
    s.includes('ip') ||
    s.includes('physical education') ||
    s.includes('pe') ||
    s.includes('economic') ||
    s.includes('hindi') ||
    s.includes('bengali') ||
    s.includes('painting') ||
    s.includes('sociology') ||
    s.includes('psychology') ||
    s.includes('business')
  );
}

type PlannedChapter = {
  chapter: Chapter;
  isPrerequisite: boolean;
};

function getPlannedChapters(chapterIds: string[]): {
  planned: PlannedChapter[];
  prerequisiteIds: string[];
} {
  // Try finding in legacy list, otherwise check dynamic/curriculum registry
  const selected: Chapter[] = [];
  for (const id of chapterIds) {
    if (id === 'phy-world') continue; // NCERT rationalized out
    const existing = chapters.find((c) => c.id === id);
    if (existing) {
      selected.push(existing);
    } else {
      // Check official curriculum catalogue
      try {
        const curr = getCurriculumChapterById(id);
        if (curr) {
          selected.push({
            id: curr.id,
            subject: curr.subjectName,
            title: curr.title,
            note: curr.description || `${curr.subjectName} Chapter ${curr.chapterNumber}`,
            order: curr.chapterNumber || 1,
            tag: curr.examWeightage === 'critical' ? 'High Yield' : curr.examWeightage === 'high' ? 'Core' : 'Foundation',
          });
          continue;
        }
      } catch {
        // pass
      }

      // Check custom chapters
      try {
        const raw = localStorage.getItem('backlogos-custom-chapters-v1');
        const customChapters = raw ? JSON.parse(raw) : [];
        const customMatch = customChapters.find((c: any) => c.id === id);
        if (customMatch) {
          selected.push({
            id: customMatch.id,
            subject: customMatch.subjectName,
            title: customMatch.title,
            note: customMatch.description || 'Custom Chapter',
            order: customMatch.chapterNumber || 1,
            tag: 'Core',
          });
        }
      } catch {
        // fallback
      }
    }
  }

  const selectedIds = new Set(selected.map((chapter) => chapter.id));
  const prerequisiteIds = new Set<string>();

  selected.forEach((chapter) => {
    chapters
      .filter(
        (candidate) =>
          candidate.id !== 'phy-world' &&
          candidate.subject === chapter.subject &&
          candidate.order < chapter.order,
      )
      .forEach((candidate) => prerequisiteIds.add(candidate.id));
  });

  const planned = [
    ...chapters.filter(
      (chapter) =>
        chapter.id !== 'phy-world' &&
        (selectedIds.has(chapter.id) || prerequisiteIds.has(chapter.id)),
    ),
    ...selected.filter((c) => !chapters.some((ch) => ch.id === c.id)),
  ]
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
  // Safe normalization of all inputs
  const rawChapterIds = input.chapterIds || (input as any).plannedChapterIds || [];
  const sanitizedChapterIds = Array.isArray(rawChapterIds)
    ? rawChapterIds.filter((id) => id !== 'phy-world')
    : [];
  const resolvedChapterIds = sanitizedChapterIds.length > 0 ? sanitizedChapterIds : ['phy-units'];

  const minutesPerDay = typeof input.minutesPerDay === 'number' && !Number.isNaN(input.minutesPerDay) && input.minutesPerDay > 0
    ? input.minutesPerDay
    : ((input as any).hoursPerDay ? (input as any).hoursPerDay * 60 : 240);

  const duration: PlanDuration = (input.planDuration || (input as any).targetDays || 7) as PlanDuration;
  const isEmergency = duration === 1;
  const { planned, prerequisiteIds } = getPlannedChapters(resolvedChapterIds);
  const fallback = {
    chapter: chapters.find((c) => c.id !== 'phy-world') || chapters[0],
    isPrerequisite: false,
  };
  const queue = planned.length ? planned : [fallback];

  // Group planned chapters into Core and Elective pools
  const coreQueue = queue.filter((p) => isCoreSubject(p.chapter.subject));
  const electiveQueue = queue.filter((p) => isAuxiliaryOrElective(p.chapter.subject));

  // If no core subjects found, all chapters treat as coreQueue
  const effectiveCore = coreQueue.length > 0 ? coreQueue : queue;
  const effectiveElective = electiveQueue.length > 0 ? electiveQueue : [];

  let corePointer = 0;
  let electivePointer = 0;

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const days: PlanDay[] = Array.from({ length: duration }, (_, index) => {
    const dayNum = index + 1;
    const dayOfWeekLabel = dayNames[index % 7];
    const isWednesday = (index % 7) === 2; // Wednesday
    const isSaturday = (index % 7) === 5;  // Saturday
    const isSunday = (index % 7) === 6;    // Sunday
    const isElectiveDay = isWednesday || isSaturday || isSunday;

    let focus1: Chapter;
    let focus2: Chapter;
    let isPrereq1 = false;
    let isPrereq2 = false;
    let rhythmType: DayRhythmType = 'dual_core';
    let rhythmBadge = '';

    if (isEmergency) {
      // 1-Day Emergency Rescue
      focus1 = effectiveCore[0]?.chapter || queue[0].chapter;
      focus2 = effectiveCore[1]?.chapter || (effectiveElective[0]?.chapter) || focus1;
      isPrereq1 = effectiveCore[0]?.isPrerequisite || false;
      isPrereq2 = effectiveCore[1]?.isPrerequisite || false;
      rhythmType = 'emergency_triage';
      rhythmBadge = `🚨 1-Day Triage · ${focus1.subject} + ${focus2.subject}`;
    } else if (isElectiveDay && effectiveElective.length > 0) {
      // Wednesday or Weekend: Dedicated Priority to Elective / Auxiliary (English, CS, PE, Economics, etc.)
      const scheduledElective = effectiveElective[electivePointer % effectiveElective.length];
      electivePointer++;

      // Pair with a core anchor subject to maintain continuous momentum
      const scheduledCore = effectiveCore[corePointer % effectiveCore.length];
      corePointer++;

      if (isSunday) {
        // Sunday: Grand Review & Elective Chapter Completion
        focus1 = scheduledElective.chapter;
        focus2 = scheduledCore.chapter;
        isPrereq1 = scheduledElective.isPrerequisite;
        isPrereq2 = scheduledCore.isPrerequisite;
        rhythmType = 'weekend_booster';
        rhythmBadge = `🌟 Sunday Review · ${focus1.subject} + ${focus2.subject}`;
      } else if (isWednesday) {
        focus1 = scheduledCore.chapter;
        focus2 = scheduledElective.chapter;
        isPrereq1 = scheduledCore.isPrerequisite;
        isPrereq2 = scheduledElective.isPrerequisite;
        rhythmType = 'wednesday_pivot';
        rhythmBadge = `🎯 Wednesday Elective Pivot · ${focus1.subject} + ${focus2.subject}`;
      } else {
        // Saturday
        focus1 = scheduledCore.chapter;
        focus2 = scheduledElective.chapter;
        isPrereq1 = scheduledCore.isPrerequisite;
        isPrereq2 = scheduledElective.isPrerequisite;
        rhythmType = 'weekend_booster';
        rhythmBadge = `🏆 Weekend Board Booster · ${focus1.subject} + ${focus2.subject}`;
      }
    } else {
      // Regular Weekday (Mon, Tue, Thu, Fri) or pure-core syllabus:
      // Focus on 2 Main Core Subjects (Physics, Chemistry, Maths, Biology)
      const scheduledCore1 = effectiveCore[corePointer % effectiveCore.length];
      corePointer++;

      // Try to find a second core subject from a DIFFERENT subject than focus1
      let scheduledCore2 = effectiveCore.find(
        (c) => c.chapter.subject !== scheduledCore1.chapter.subject && c.chapter.id !== scheduledCore1.chapter.id
      );

      if (!scheduledCore2) {
        scheduledCore2 = effectiveCore[corePointer % effectiveCore.length];
        corePointer++;
      }

      focus1 = scheduledCore1.chapter;
      focus2 = scheduledCore2 ? scheduledCore2.chapter : scheduledCore1.chapter;
      isPrereq1 = scheduledCore1.isPrerequisite;
      isPrereq2 = scheduledCore2 ? scheduledCore2.isPrerequisite : false;
      rhythmType = 'dual_core';
      rhythmBadge = `⚡ Dual-Core Focus · ${focus1.subject} + ${focus2.subject}`;
    }

    // Time Slicing: Exactly 2 core/secondary subjects + active recall
    // Total time = minutesPerDay (e.g. 240 mins)
    const slot1Minutes = Math.round(minutesPerDay * 0.52); // ~125m for Slot 1
    const slot2Minutes = Math.round(minutesPerDay * 0.35); // ~85m for Slot 2
    const recallMinutes = Math.max(15, minutesPerDay - slot1Minutes - slot2Minutes); // ~30m for Active Recall

    const task1Min = Math.round(slot1Minutes * 0.55);
    const task2Min = slot1Minutes - task1Min;
    const task3Min = slot2Minutes;
    const task4Min = recallMinutes;

    const tasks: PlanTask[] = [
      {
        id: `day-${dayNum}-task-1`,
        kind: 'learning',
        chapterId: focus1.id,
        chapterTitle: focus1.title,
        subject: focus1.subject,
        minutes: task1Min,
        isPrerequisite: isPrereq1,
        label: `Slot 1 Prime Anchor: Concept & Derivations for ${focus1.title}`,
        detail: `${task1Min} min · High-yield theory & NCERT derivations for ${focus1.subject}`,
      },
      {
        id: `day-${dayNum}-task-2`,
        kind: 'practice',
        chapterId: focus1.id,
        chapterTitle: focus1.title,
        subject: focus1.subject,
        minutes: task2Min,
        isPrerequisite: isPrereq1,
        label: `Slot 1 Drill: PYQs & Exemplar Problems for ${focus1.title}`,
        detail: `${task2Min} min · Solve 8-10 board question archetypes`,
      },
      {
        id: `day-${dayNum}-task-3`,
        kind: 'practice',
        chapterId: focus2.id,
        chapterTitle: focus2.title,
        subject: focus2.subject,
        minutes: task3Min,
        isPrerequisite: isPrereq2,
        label: `Slot 2 Backlog Clearance: ${focus2.subject} - ${focus2.title}`,
        detail: `${task3Min} min · ${isElectiveDay && isAuxiliaryOrElective(focus2.subject) ? 'Dedicated board elective & language sprint' : 'High-impact secondary backlog solving'}`,
      },
      {
        id: `day-${dayNum}-task-4`,
        kind: 'revision',
        chapterId: focus1.id,
        chapterTitle: `${focus1.title} + ${focus2.title}`,
        subject: focus1.subject,
        minutes: task4Min,
        isPrerequisite: false,
        label: `Slot 3 Active Recall: Formula Blitz & Formula Blitz & Concept Review`,
        detail: `${task4Min} min · Rapid retrieval of formulas and SI units across both subjects`,
      },
    ];

    const slots: PlanDaySlot[] = [
      {
        slotNumber: 1,
        title: `${focus1.subject} Core Anchor`,
        subject: focus1.subject,
        chapterId: focus1.id,
        chapterTitle: focus1.title,
        durationMinutes: slot1Minutes,
        kind: 'learning',
        objective: 'Deep theory, core formulas, and key derivations',
      },
      {
        slotNumber: 2,
        title: `${focus2.subject} Backlog Sprint`,
        subject: focus2.subject,
        chapterId: focus2.id,
        chapterTitle: focus2.title,
        durationMinutes: slot2Minutes,
        kind: 'practice',
        objective: isElectiveDay && isAuxiliaryOrElective(focus2.subject)
          ? 'Scoring booster clearance (English/CS/PE/Economics)'
          : 'Secondary core numerical problem set',
      },
      {
        slotNumber: 3,
        title: 'Cross-Subject Active Recall',
        subject: focus1.subject,
        chapterId: focus1.id,
        chapterTitle: `${focus1.title} + ${focus2.title}`,
        durationMinutes: recallMinutes,
        kind: 'revision',
        objective: 'Formula blitz, concept recap, and retention check',
      },
    ];

    const dayTheme = isEmergency
      ? `🚨 Day ${dayNum} Emergency Triage: ${focus1.subject} + ${focus2.subject}`
      : `${dayOfWeekLabel}: ${focus1.subject} (${focus1.title}) + ${focus2.subject} (${focus2.title})`;

    return {
      day: dayNum,
      dayOfWeekLabel,
      rhythmType,
      rhythmBadge,
      theme: dayTheme,
      chapterId: focus1.id,
      chapterTitle: focus1.title,
      subject: focus1.subject,
      secondaryChapterId: focus2.id,
      secondaryChapterTitle: focus2.title,
      secondarySubject: focus2.subject,
      slots,
      isPrerequisite: isPrereq1 || isPrereq2,
      isRecap: index >= queue.length,
      tasks,
    };
  });

  const selectedCount = resolvedChapterIds.length;
  let coverageNote: string;
  if (duration === 1) {
    coverageNote = `1-Day Emergency Sprint: Dual-subject emergency triage. Maximizes core formula proofs, exam traps, and high-probability problem archetypes within your ${minutesPerDay}-minute runway.`;
  } else if (duration === 3) {
    coverageNote = `3-Day Weekend Bootcamp: Dual-core weekend intensive. Balances core PCM/PCB subjects with high-yield numerical problem sets and Saturday/Sunday elective integration.`;
  } else if (duration === 14) {
    coverageNote = `14-Day Deep Revision: Comprehensive 2-week cycle covering your selected chapters with multi-subject daily pairings. Weekdays prioritize core sciences; Wednesdays and Weekends systematically clear English, Computer Science, and scoring booster electives.`;
  } else if (duration === 21) {
    coverageNote = `21-Day Habit Mastery: 3-week transformational curriculum track building unshakeable daily momentum across multiple subjects without 5-subject cognitive overload.`;
  } else if (duration === 30) {
    coverageNote = `30-Day Complete Overhaul: Full month master recovery plan covering your chosen subjects systematically with dedicated milestone checkpoints and full chapter mastery.`;
  } else {
    coverageNote = `7-Day Multi-Subject Recovery Route: Weekdays (Mon, Tue, Thu, Fri) anchor on Core Main Subjects (Physics, Chemistry, Maths, Biology). Wednesdays and Weekends pivot secondary focus to Electives and Scoring Boosters (English, CS, PE, Economics) alongside active recall.`;
  }

  const orderReason = isEmergency
    ? 'Single-day emergency triage protocol: Prioritizes instant recall, high-yield formulas, and error prevention over expansive reading.'
    : 'Dual-Subject Architecture: 2 subjects per day (52% prime core anchor + 35% secondary backlog sprint + 13% active recall). Wednesdays and Weekends prioritize auxiliary electives to eliminate board scoring blind spots.';

  return {
    board: input.board || 'CBSE Class 12',
    subjects: input.subjects || ['Physics', 'Chemistry', 'Mathematics'],
    goal: input.goal || 'Complete Backlog Recovery',
    priority: input.priority || 'backlog recovery',
    confidence: input.confidence || 'mixed',
    examDate: input.examDate || '',
    ...input,
    chapterIds: resolvedChapterIds,
    minutesPerDay,
    planDuration: duration,
    plannedChapterIds: planned.map(({ chapter }) => chapter.id),
    prerequisiteIds,
    orderReason,
    coverageNote,
    days,
    createdAt: new Date().toISOString(),
  };
}

export { kindLabels };