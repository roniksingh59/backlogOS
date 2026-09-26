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
  confidence: Confidence;
  examDate: string;
};

export type StudentPlan = StudentPlanInput & {
  plannedChapterIds: string[];
  prerequisiteIds: string[];
  orderReason: string;
  coverageNote: string;
  days: PlanDay[];
  createdAt: string;
};

export type Flashcard = {
  front: string;
  back: string;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

export type StudyContent = {
  summary: string;
  outcomes: string[];
  formulaNotes: string[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
};

export const chapters: Chapter[] = [
  { id: 'phy-world', subject: 'Physics', title: 'Physical World', note: 'Scope, models and the role of measurement', order: 0, tag: 'Start here' },
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
  flashcards: Flashcard[],
  quiz: QuizQuestion[],
): StudyContent => ({ summary, outcomes, formulaNotes, flashcards, quiz });

export const studyContent: Record<string, StudyContent> = {
  'phy-units': content(
    'Physics becomes easier when every number has a unit and every measurement has a sensible precision.',
    ['Use dimensional analysis to test an equation.', 'Separate systematic and random error.', 'Round answers using significant-figure rules.'],
    ['Percentage error in a product: add percentage errors.', 'Dimensions of force: [M L T⁻²].', '1 N = 1 kg m s⁻².'],
    [
      { front: 'What is dimensional analysis useful for?', back: 'Checking dimensional consistency, deriving relations up to a dimensionless constant, and converting units.' },
      { front: 'What do significant figures communicate?', back: 'The precision supported by a measurement, not extra certainty.' },
      { front: 'What is least count?', back: 'The smallest measurement an instrument can resolve.' },
    ],
    [
      { question: 'Which quantity has dimensions [M L² T⁻²]?', options: ['Force', 'Work', 'Power', 'Pressure'], answer: 1, explanation: 'Work is force × displacement, so [M L T⁻²] × [L].' },
      { question: 'If length has 2% error and width has 3% error, the area error is approximately…', options: ['1%', '5%', '6%', '9%'], answer: 1, explanation: 'For a product, percentage errors add: 2% + 3% = 5%.' },
    ],
  ),
  'phy-vectors': content(
    'Motion in one dimension is about choosing a sign convention, reading graphs, and connecting position, velocity, and acceleration.',
    ['Interpret x–t and v–t graphs.', 'Use constant-acceleration equations.', 'Distinguish distance from displacement.'],
    ['v = u + at', 's = ut + ½at²', 'v² − u² = 2as'],
    [
      { front: 'What is the slope of a position–time graph?', back: 'Velocity.' },
      { front: 'What is the area under a velocity–time graph?', back: 'Displacement.' },
      { front: 'When is average speed equal to magnitude of average velocity?', back: 'When the object does not reverse direction.' },
    ],
    [
      { question: 'A horizontal position–time graph means the object is…', options: ['Accelerating', 'At rest', 'Moving uniformly', 'Moving backward'], answer: 1, explanation: 'Zero slope means zero velocity.' },
      { question: 'For constant acceleration, which equation avoids time?', options: ['v = u + at', 's = ut + ½at²', 'v² − u² = 2as', 'a = Δv/Δt'], answer: 2, explanation: 'The third equation connects velocity, displacement, and acceleration directly.' },
    ],
  ),
  'phy-motion-plane': content(
    'Two-dimensional motion becomes two independent one-dimensional problems when you resolve vectors along perpendicular axes.',
    ['Resolve vectors into components.', 'Use projectile symmetry.', 'Combine horizontal and vertical motion correctly.'],
    ['R = √(A² + B² + 2AB cos θ)', 'Projectile range: R = u² sin 2θ / g', 'At top of projectile: vᵧ = 0'],
    [
      { front: 'Why can projectile motion be split into x and y parts?', back: 'Gravity acts vertically, so horizontal and vertical equations can be solved independently and combined.' },
      { front: 'What is the horizontal acceleration of an ideal projectile?', back: 'Zero, if air resistance is ignored.' },
      { front: 'At what angle is range maximum on level ground?', back: '45°.' },
    ],
    [
      { question: 'At the highest point of a projectile, which component is zero?', options: ['Horizontal velocity', 'Vertical velocity', 'Acceleration', 'Displacement'], answer: 1, explanation: 'The vertical velocity briefly becomes zero; acceleration due to gravity remains.' },
      { question: 'The resultant of perpendicular vectors A and B is…', options: ['A + B', 'A − B', '√(A² + B²)', 'AB'], answer: 2, explanation: 'Perpendicular components form a right triangle.' },
    ],
  ),
  'phy-laws': content(
    'Dynamics starts with a careful free-body diagram: list forces, choose axes, then apply Newton’s second law.',
    ['Draw free-body diagrams.', 'Handle friction and connected bodies.', 'Use net force rather than one force in isolation.'],
    ['ΣF = ma', 'Static friction: fₛ ≤ μₛN', 'Kinetic friction: fₖ = μₖN'],
    [
      { front: 'What does inertia measure?', back: 'Resistance to a change in motion; mass is the measure of inertia.' },
      { front: 'What direction does friction take?', back: 'Opposite the relative or impending relative motion at the contact.' },
      { front: 'What is an inertial frame?', back: 'A frame where Newton’s first law holds and no fictitious force is needed.' },
    ],
    [
      { question: 'If net force is zero, an object can be…', options: ['Only at rest', 'Only accelerating', 'At rest or moving with constant velocity', 'Only moving in a circle'], answer: 2, explanation: 'Zero net force means zero acceleration, not necessarily zero velocity.' },
      { question: 'For a block on a rough horizontal surface, normal force is usually…', options: ['mg', 'ma', 'μmg', 'Zero'], answer: 0, explanation: 'With no vertical acceleration, N balances weight.' },
    ],
  ),
  'phy-work': content(
    'Energy methods often turn a long force calculation into a short comparison between initial and final states.',
    ['Compute work from force and displacement.', 'Use conservation of mechanical energy.', 'Relate power to the rate of doing work.'],
    ['W = F s cos θ', 'K = ½mv²', 'P = dW/dt = F·v'],
    [
      { front: 'When is work by a force zero?', back: 'When there is no displacement or the force is perpendicular to displacement.' },
      { front: 'What forces are conservative?', back: 'Forces whose work depends only on endpoints, such as gravity and spring force.' },
      { front: 'What does power measure?', back: 'How quickly work is done or energy is transferred.' },
    ],
    [
      { question: 'The work done by centripetal force in uniform circular motion is…', options: ['Positive', 'Negative', 'Zero', 'Maximum'], answer: 2, explanation: 'The force is perpendicular to instantaneous displacement.' },
      { question: 'If speed doubles, kinetic energy becomes…', options: ['Double', 'Half', 'Four times', 'Unchanged'], answer: 2, explanation: 'K is proportional to v².' },
    ],
  ),
  'phy-system': content(
    'Momentum and centre of mass let you study a group of particles without tracking every internal force.',
    ['Locate a centre of mass.', 'Apply momentum conservation.', 'Distinguish internal and external forces.'],
    ['r_cm = Σmᵢrᵢ / Σmᵢ', 'p = mv', 'Impulse J = Δp'],
    [
      { front: 'Can internal forces change total momentum?', back: 'Not by themselves; total momentum changes only due to external impulse.' },
      { front: 'Where is the centre of mass of two equal masses?', back: 'At the midpoint between them.' },
      { front: 'What is impulse?', back: 'The change in momentum caused by a force over a time interval.' },
    ],
    [
      { question: 'In an isolated collision, which quantity is conserved?', options: ['Kinetic energy always', 'Momentum', 'Speed of each particle', 'Force'], answer: 1, explanation: 'Total linear momentum is conserved when external impulse is zero.' },
      { question: 'The centre of mass moves as if…', options: ['Only internal forces act', 'All mass were concentrated there and external force acted there', 'Mass were zero', 'Gravity were absent'], answer: 1, explanation: 'The translational motion of the system follows M a_cm = F_ext.' },
    ],
  ),
  'phy-rotation': content(
    'Rotational motion mirrors linear motion, but torque, moment of inertia, and angular momentum replace force, mass, and momentum.',
    ['Calculate torque about a point.', 'Use rotational kinematics.', 'Compare rolling and slipping.'],
    ['τ = r × F', 'τ = Iα', 'L = Iω', 'K_rot = ½Iω²'],
    [
      { front: 'What determines moment of inertia?', back: 'The mass distribution relative to the axis, not just total mass.' },
      { front: 'When is torque zero?', back: 'When the line of action passes through the axis or the force is zero.' },
      { front: 'Rolling without slipping condition?', back: 'v_cm = Rω.' },
    ],
    [
      { question: 'Angular momentum is conserved when external torque is…', options: ['Maximum', 'Zero', 'Constant and non-zero', 'Parallel to velocity'], answer: 1, explanation: 'τ_ext = dL/dt, so zero external torque keeps angular momentum constant.' },
      { question: 'Rotational kinetic energy depends on…', options: ['I and ω²', 'I and ω', 'm and v only', 'Torque only'], answer: 0, explanation: 'K_rot = ½Iω².' },
    ],
  ),
  'phy-gravity': content(
    'Gravitation connects inverse-square force, potential energy, orbital speed, and escape speed.',
    ['Use Newton’s law of gravitation.', 'Relate g to altitude and depth.', 'Solve basic satellite questions.'],
    ['F = GMm/r²', 'g = GM/R²', 'v_orbit = √(GM/r)', 'v_escape = √(2GM/R)'],
    [
      { front: 'How does gravitational force change with distance?', back: 'It varies inversely as the square of separation.' },
      { front: 'What is escape speed?', back: 'The minimum speed needed to reach infinity with zero final speed, ignoring air resistance.' },
      { front: 'Is gravitational potential energy zero at Earth’s surface?', back: 'It can be chosen as a reference; conventionally it is zero at infinity.' },
    ],
    [
      { question: 'A satellite in a circular orbit is continuously…', options: ['At rest', 'Falling toward Earth', 'Moving away from Earth', 'Accelerating tangentially only'], answer: 1, explanation: 'Gravity provides centripetal acceleration, so it is in continuous free fall.' },
      { question: 'If orbital radius increases, orbital speed…', options: ['Increases', 'Decreases', 'Stays same', 'Becomes zero'], answer: 1, explanation: 'v_orbit is proportional to 1/√r.' },
    ],
  ),
  'phy-properties': content(
    'Properties of matter explain how solids deform and how fluids respond to pressure, depth, and flow.',
    ['Relate stress and strain.', 'Apply pressure and buoyancy ideas.', 'Use continuity in simple flow problems.'],
    ['Stress = force/area', 'Strain = change/original dimension', 'P = P₀ + ρgh', 'A₁v₁ = A₂v₂'],
    [
      { front: 'What is Young’s modulus?', back: 'The ratio of longitudinal stress to longitudinal strain within the elastic limit.' },
      { front: 'Why does pressure rise with depth?', back: 'A deeper point supports a taller column of fluid.' },
      { front: 'What does continuity express?', back: 'Conservation of mass in steady incompressible flow.' },
    ],
    [
      { question: 'Buoyant force equals…', options: ['Weight of object', 'Weight of displaced fluid', 'Mass of object', 'Pressure at surface'], answer: 1, explanation: 'Archimedes’ principle gives buoyant force as displaced-fluid weight.' },
      { question: 'For incompressible steady flow, if area halves, speed…', options: ['Halves', 'Doubles', 'Stays same', 'Becomes zero'], answer: 1, explanation: 'A v is constant.' },
    ],
  ),
  'phy-thermo': content(
    'Thermodynamics tracks energy transfer as heat and work, with the first law keeping the accounting honest.',
    ['Distinguish heat from temperature.', 'Apply the first law.', 'Read simple process diagrams.'],
    ['ΔQ = ΔU + ΔW', 'For ideal gas: PV = nRT', 'Efficiency = useful output/input'],
    [
      { front: 'What is the first law?', back: 'Heat supplied equals increase in internal energy plus work done by the system.' },
      { front: 'What is an isothermal process?', back: 'A process at constant temperature.' },
      { front: 'What is a state function?', back: 'A quantity determined by the state, independent of the path taken.' },
    ],
    [
      { question: 'For an ideal gas in an isothermal process, ΔU is…', options: ['Positive', 'Negative', 'Zero', 'Infinite'], answer: 2, explanation: 'Internal energy depends only on temperature for an ideal gas.' },
      { question: 'The area under a P–V curve represents…', options: ['Heat only', 'Work done', 'Temperature', 'Entropy only'], answer: 1, explanation: 'Work is ∫P dV.' },
    ],
  ),
  'phy-world': content(
    'Physics is a way of building models from observation, measurement, and evidence rather than memorising isolated facts.',
    ['Identify the scope of classical physics.', 'Distinguish a model from the real system.', 'Recognise the role of units and uncertainty.'],
    ['A physical law should be testable.', 'Every measurement has a unit and a limit of precision.', 'Models are useful within stated assumptions.'],
    [
      { front: 'What is a physical model?', back: 'A simplified description used to explain or predict a real system.' },
      { front: 'Why are experiments important?', back: 'They test whether a model’s predictions agree with observations.' },
      { front: 'What does a scientific law describe?', back: 'A repeatable relationship observed under defined conditions.' },
    ],
    [
      { question: 'A useful scientific model should be…', options: ['Untestable', 'Predictive and testable', 'Independent of evidence', 'Always complete'], answer: 1, explanation: 'Models are judged by how well their testable predictions match observations.' },
      { question: 'Measurement uncertainty means…', options: ['Every value is wrong', 'A measured value has a precision limit', 'Units are unnecessary', 'Experiments cannot help'], answer: 1, explanation: 'Uncertainty describes the range or precision supported by an instrument and method.' },
    ],
  ),
  'phy-solids': content(
    'Solids resist deformation, and the way they stretch or compress is captured by stress, strain, and elastic constants.',
    ['Read stress–strain behaviour.', 'Use Young’s, bulk, and shear modulus.', 'Distinguish elastic and plastic deformation.'],
    ['Stress = F/A', 'Strain = ΔL/L', 'Young’s modulus = stress/longitudinal strain', 'Elastic energy density = ½ × stress × strain'],
    [
      { front: 'What is elastic deformation?', back: 'Deformation that disappears when the deforming force is removed, within the elastic limit.' },
      { front: 'What does Young’s modulus measure?', back: 'Resistance to change in length under longitudinal stress.' },
      { front: 'What is the elastic limit?', back: 'The largest stress for which a material returns to its original shape after unloading.' },
    ],
    [
      { question: 'If the same force acts on a smaller area, stress…', options: ['Decreases', 'Increases', 'Stays zero', 'Becomes strain'], answer: 1, explanation: 'Stress is force divided by area.' },
      { question: 'A perfectly rigid material would have Young’s modulus…', options: ['Zero', 'Very small', 'Very large', 'Negative'], answer: 2, explanation: 'A rigid material needs very large stress for a tiny strain.' },
    ],
  ),
  'phy-fluids': content(
    'Fluid mechanics begins with pressure and builds toward buoyancy, continuity, and Bernoulli’s energy picture.',
    ['Relate pressure to depth.', 'Apply Archimedes’ principle.', 'Use continuity and Bernoulli’s equation in simple flows.'],
    ['P = F/A', 'P = P₀ + ρgh', 'A₁v₁ = A₂v₂', 'P + ½ρv² + ρgh = constant'],
    [
      { front: 'What is Pascal’s law?', back: 'An external pressure change applied to an enclosed fluid is transmitted undiminished throughout the fluid.' },
      { front: 'What does buoyant force equal?', back: 'The weight of the fluid displaced by the immersed body.' },
      { front: 'What does Bernoulli’s equation express?', back: 'Conservation of mechanical energy per unit volume along a streamline for ideal flow.' },
    ],
    [
      { question: 'Pressure in a liquid at rest depends on…', options: ['Depth and density', 'Shape of the container only', 'Colour', 'Surface area only'], answer: 0, explanation: 'Gauge pressure is ρgh.' },
      { question: 'Where fluid speed is higher in a narrow pipe, ideal-fluid pressure is generally…', options: ['Higher', 'Lower', 'Always zero', 'Unchanged by speed'], answer: 1, explanation: 'Bernoulli’s relation trades pressure energy for kinetic energy.' },
    ],
  ),
  'phy-thermal': content(
    'Thermal properties explain how temperature changes size, heat capacity, and the flow of energy through matter.',
    ['Use linear expansion.', 'Apply calorimetry and heat capacity.', 'Compare conduction, convection, and radiation.'],
    ['ΔL = αLΔT', 'Q = mcΔT', 'Q = mL for a phase change', 'Stefan’s law: P ∝ AT⁴'],
    [
      { front: 'What is specific heat capacity?', back: 'Heat required to raise the temperature of unit mass by one degree.' },
      { front: 'Why does a phase change occur at constant temperature?', back: 'Supplied heat changes intermolecular arrangement rather than average kinetic energy.' },
      { front: 'Which transfer needs no medium?', back: 'Radiation.' },
    ],
    [
      { question: 'During melting of pure ice, temperature…', options: ['Rises steadily', 'Falls', 'Stays constant until melting ends', 'Becomes absolute zero'], answer: 2, explanation: 'Heat supplied goes into latent heat during the phase change.' },
      { question: 'The SI unit of thermal conductivity is…', options: ['W m⁻¹ K⁻¹', 'J kg⁻¹', 'N m⁻²', 'K m⁻¹'], answer: 0, explanation: 'Thermal conductivity measures heat flow rate per area per temperature gradient.' },
    ],
  ),
  'phy-kinetic': content(
    'Kinetic theory explains gas pressure and temperature using the motion and collisions of microscopic particles.',
    ['Connect temperature to average kinetic energy.', 'Use the ideal-gas picture.', 'Interpret mean free path qualitatively.'],
    ['PV = nRT', 'Average translational kinetic energy per molecule = 3/2 kT', 'P = 1/3 ρ c_rms²'],
    [
      { front: 'What does temperature measure microscopically?', back: 'It is proportional to the average translational kinetic energy of particles in an ideal gas.' },
      { front: 'What is an ideal gas assumption?', back: 'Particles have negligible volume and intermolecular forces except during collisions.' },
      { front: 'What is mean free path?', back: 'The average distance a molecule travels between successive collisions.' },
    ],
    [
      { question: 'At the same temperature, all ideal gases have the same…', options: ['Mass', 'Average translational kinetic energy per molecule', 'Density', 'Molar mass'], answer: 1, explanation: 'Average kinetic energy depends on absolute temperature.' },
      { question: 'Absolute temperature is measured in…', options: ['Celsius only', 'Kelvin', 'Metres', 'Joules'], answer: 1, explanation: 'Kelvin is the SI temperature scale used in gas laws.' },
    ],
  ),
  'phy-oscillations': content(
    'Oscillation is repeated motion about an equilibrium position; simple harmonic motion is the special case with restoring force proportional to displacement.',
    ['Identify SHM conditions.', 'Relate displacement, velocity, and energy.', 'Use spring and pendulum periods.'],
    ['a = −ω²x', 'x = A sin(ωt + φ)', 'T_spring = 2π√(m/k)', 'T_pendulum = 2π√(l/g)'],
    [
      { front: 'What is the equilibrium position?', back: 'The position where the net restoring force is zero.' },
      { front: 'What makes motion simple harmonic?', back: 'Acceleration is proportional to displacement and directed toward equilibrium.' },
      { front: 'Where is SHM speed maximum?', back: 'At the equilibrium position.' },
    ],
    [
      { question: 'In SHM, acceleration at the mean position is…', options: ['Maximum', 'Zero', 'Infinite', 'Equal to amplitude'], answer: 1, explanation: 'a = −ω²x, and x=0 at the mean position.' },
      { question: 'The time period of a simple pendulum depends on…', options: ['Mass of bob', 'Length and g', 'Amplitude for all amplitudes', 'Bob colour'], answer: 1, explanation: 'For small oscillations, T=2π√(l/g).' },
    ],
  ),
  'phy-waves': content(
    'Waves carry energy and information through oscillations, while superposition explains interference, beats, and standing waves.',
    ['Distinguish longitudinal and transverse waves.', 'Use the wave equation.', 'Describe standing-wave patterns.'],
    ['v = fλ', 'y = A sin(kx − ωt)', 'Beat frequency = |f₁ − f₂|', 'For a string: v = √(T/μ)'],
    [
      { front: 'Do particles travel with a progressive wave?', back: 'They oscillate about equilibrium while the disturbance and energy propagate.' },
      { front: 'What is a standing wave?', back: 'A pattern formed by two identical waves travelling in opposite directions, with nodes and antinodes.' },
      { front: 'What is resonance?', back: 'Large-amplitude response when driving frequency matches a natural frequency.' },
    ],
    [
      { question: 'Sound in air is usually a…', options: ['Transverse wave', 'Longitudinal wave', 'Matter particle', 'Standing wave only'], answer: 1, explanation: 'Air particles oscillate parallel to the direction of propagation.' },
      { question: 'If frequency doubles while speed stays constant, wavelength…', options: ['Doubles', 'Halves', 'Stays same', 'Becomes zero'], answer: 1, explanation: 'λ = v/f.' },
    ],
  ),
  'chem-basic': content(
    'The mole concept is chemistry’s counting system: it connects microscopic particles to measurable mass and volume.',
    ['Convert between mass, moles, and particles.', 'Balance equations.', 'Calculate limiting reagent and percentage yield.'],
    ['n = mass / molar mass', 'N = nN_A', 'Molarity = moles / volume in litres'],
    [
      { front: 'What is one mole?', back: '6.022 × 10²³ specified entities.' },
      { front: 'What is the limiting reagent?', back: 'The reactant consumed first, limiting the amount of product.' },
      { front: 'Why balance an equation?', back: 'To conserve atoms and charge.' },
    ],
    [
      { question: 'How many moles are in 18 g of water?', options: ['0.5', '1', '18', '36'], answer: 1, explanation: 'Molar mass of water is 18 g mol⁻¹.' },
      { question: 'Molarity changes with temperature because volume can…', options: ['Change', 'Never change', 'Become mass', 'Become moles'], answer: 0, explanation: 'Molarity uses solution volume, which can expand or contract.' },
    ],
  ),
  'chem-structure': content(
    'Atomic structure explains why electrons occupy quantised energy levels and why spectra contain discrete lines.',
    ['Use quantum numbers.', 'Write electronic configurations.', 'Connect transitions to spectra.'],
    ['E_n ∝ −1/n² for hydrogen-like atoms', 'c = νλ', 'ΔE = hν'],
    [
      { front: 'What does the principal quantum number n describe?', back: 'The main energy level and approximate size of an orbital.' },
      { front: 'How many electrons can one orbital hold?', back: 'Two, with opposite spins.' },
      { front: 'What causes an emission line?', back: 'An electron falls to a lower energy level and emits a photon.' },
    ],
    [
      { question: 'Which quantum number determines orbital shape?', options: ['n', 'l', 'm_l', 'm_s'], answer: 1, explanation: 'Azimuthal quantum number l identifies s, p, d, f shapes.' },
      { question: 'A photon’s energy is proportional to…', options: ['Wavelength', 'Frequency', 'Mass only', 'Amplitude only'], answer: 1, explanation: 'E = hν.' },
    ],
  ),
  'chem-periodic': content(
    'The periodic table is a map of repeating electronic patterns, so position helps predict properties and reactivity.',
    ['Read groups and periods.', 'Explain atomic-size trends.', 'Compare ionisation energy and electronegativity.'],
    ['Across a period: effective nuclear charge generally rises.', 'Down a group: shells and size generally rise.', 'Cation radius < atom radius < anion radius.'],
    [
      { front: 'Why does atomic radius decrease across a period?', back: 'Nuclear charge rises while electrons enter the same shell, pulling them closer.' },
      { front: 'What is ionisation energy?', back: 'Energy required to remove the most loosely held electron from an isolated gaseous atom.' },
      { front: 'Which is more electronegative, F or Cl?', back: 'F.' },
    ],
    [
      { question: 'Elements in the same group tend to share…', options: ['The same mass', 'Similar valence-electron patterns', 'The same period', 'The same neutron count'], answer: 1, explanation: 'Valence configuration drives many chemical similarities.' },
      { question: 'Metallic character generally increases…', options: ['Across a period', 'Down a group', 'Toward upper right', 'With ionisation energy'], answer: 1, explanation: 'Larger atoms lose electrons more readily down a group.' },
    ],
  ),
  'chem-bonding': content(
    'Chemical bonding is a model for how atoms lower their energy by sharing, transferring, or delocalising electrons.',
    ['Draw Lewis structures.', 'Predict basic molecular shape.', 'Distinguish ionic, covalent, and coordinate bonding.'],
    ['Formal charge = valence − nonbonding − ½ bonding electrons.', 'Steric number = sigma bonds + lone pairs.', 'Dipole moment depends on charge separation and geometry.'],
    [
      { front: 'What does VSEPR predict?', back: 'Electron pairs arrange to minimise repulsion, giving approximate molecular geometry.' },
      { front: 'What is a coordinate bond?', back: 'A covalent bond where both shared electrons come from one atom.' },
      { front: 'Why can CO₂ be non-polar?', back: 'Its polar bonds cancel because the molecule is linear and symmetric.' },
    ],
    [
      { question: 'The shape of NH₃ is…', options: ['Linear', 'Trigonal planar', 'Trigonal pyramidal', 'Tetrahedral with no lone pair'], answer: 2, explanation: 'Three bonds and one lone pair give a trigonal pyramidal shape.' },
      { question: 'An ionic bond is best described as…', options: ['Sharing of protons', 'Electrostatic attraction between ions', 'Shared neutron pair', 'Metallic sea only'], answer: 1, explanation: 'Ionic solids are held by electrostatic attraction between oppositely charged ions.' },
    ],
  ),
  'chem-thermo': content(
    'Chemical thermodynamics applies energy accounting to reactions, especially enthalpy changes measured at constant pressure.',
    ['Use enthalpy signs.', 'Apply Hess’s law.', 'Relate spontaneity to energy and disorder qualitatively.'],
    ['ΔH = H_products − H_reactants', 'ΔG = ΔH − TΔS', 'q = m c ΔT'],
    [
      { front: 'What does an exothermic reaction do?', back: 'Releases heat to the surroundings; ΔH is negative.' },
      { front: 'What is Hess’s law?', back: 'Total enthalpy change is path independent, so reaction steps can be added.' },
      { front: 'What does entropy describe?', back: 'The dispersal of energy and the number of accessible microscopic arrangements.' },
    ],
    [
      { question: 'If reactants have more enthalpy than products, the reaction is…', options: ['Endothermic', 'Exothermic', 'Impossible', 'Isothermal only'], answer: 1, explanation: 'Products − reactants is negative, so heat is released.' },
      { question: 'A process can be spontaneous when ΔG is…', options: ['Positive', 'Zero only', 'Negative', 'Infinite'], answer: 2, explanation: 'Negative Gibbs energy change indicates spontaneity at the stated conditions.' },
    ],
  ),
  'chem-states': content(
    'States of matter connects observable gas behaviour to particle motion, pressure, temperature, and intermolecular forces.',
    ['Use gas laws.', 'Apply the ideal-gas equation.', 'Compare intermolecular forces in liquids and gases.'],
    ['PV = nRT', 'P₁V₁/T₁ = P₂V₂/T₂', 'd = PM/RT', 'ΔT(K) = ΔT(°C)'],
    [
      { front: 'What is Boyle’s law?', back: 'At constant temperature, pressure is inversely proportional to volume.' },
      { front: 'What is an ideal gas?', back: 'A model whose particles have negligible volume and no intermolecular attraction except during collisions.' },
      { front: 'Why are liquids less compressible than gases?', back: 'Their particles are already much closer together.' },
    ],
    [
      { question: 'At constant pressure, gas volume is proportional to…', options: ['Absolute temperature', 'Mass only', '1/temperature', 'Density only'], answer: 0, explanation: 'Charles’ law says V/T is constant at fixed pressure.' },
      { question: 'The ideal gas constant R connects…', options: ['P, V, n and T', 'Only mass and volume', 'Only density and pressure', 'Charge and field'], answer: 0, explanation: 'PV=nRT.' },
    ],
  ),
  'chem-equilibrium': content(
    'Equilibrium is dynamic: forward and reverse reactions continue, but their rates become equal in a closed system.',
    ['Write equilibrium expressions.', 'Use Le Chatelier’s principle.', 'Handle basic acid–base equilibrium.'],
    ['K_c = products/reactants with powers as coefficients', 'pH = −log[H⁺]', 'K_w = [H⁺][OH⁻]'],
    [
      { front: 'What is dynamic equilibrium?', back: 'A state where opposing reaction rates are equal while concentrations remain constant.' },
      { front: 'What does a catalyst change?', back: 'It speeds both directions and helps reach equilibrium sooner, but does not change K.' },
      { front: 'What does Le Chatelier’s principle predict?', back: 'An equilibrium shifts to oppose an imposed change in conditions.' },
    ],
    [
      { question: 'At equilibrium, forward and reverse rates are…', options: ['Both zero', 'Equal', 'Always unequal', 'Infinite'], answer: 1, explanation: 'Equal rates cause constant macroscopic concentrations.' },
      { question: 'A lower pH means…', options: ['Lower [H⁺]', 'Higher [H⁺]', 'No ions', 'Only neutral water'], answer: 1, explanation: 'pH is −log[H⁺].' },
    ],
  ),
  'chem-redox': content(
    'Redox reactions move electrons between species; oxidation numbers make that movement trackable even when electrons are not shown directly.',
    ['Assign oxidation numbers.', 'Identify oxidising and reducing agents.', 'Balance simple redox changes.'],
    ['Oxidation = increase in oxidation number', 'Reduction = decrease in oxidation number', 'Oxidant is reduced; reductant is oxidised.'],
    [
      { front: 'What is oxidation?', back: 'Loss of electrons or increase in oxidation number.' },
      { front: 'What is a reducing agent?', back: 'A species that donates electrons and is itself oxidised.' },
      { front: 'Why must redox equations balance charge?', back: 'Electron transfer conserves total charge as well as atoms.' },
    ],
    [
      { question: 'The oxidising agent is the species that…', options: ['Is oxidised', 'Is reduced', 'Never reacts', 'Loses protons only'], answer: 1, explanation: 'It accepts electrons and causes another species to be oxidised.' },
      { question: 'Oxidation number of oxygen in most oxides is…', options: ['+2', '−2', '0 always', '+1'], answer: 1, explanation: 'Oxygen is usually −2 except in special compounds such as peroxides.' },
    ],
  ),
  'chem-hydrogen': content(
    'Hydrogen is the lightest element but forms a wide range of bonds, isotopes, hydrides, and hydrogen-bonded substances.',
    ['Compare hydrogen isotopes.', 'Classify hydrides.', 'Explain water’s unusual properties.'],
    ['H₂ is a diatomic molecule.', 'Hard water contains Ca²⁺/Mg²⁺ salts.', 'Hydrogen bonding raises boiling point.'],
    [
      { front: 'What are the isotopes of hydrogen?', back: 'Protium, deuterium, and tritium.' },
      { front: 'What is hard water?', back: 'Water containing dissolved calcium or magnesium salts that reduce soap lather.' },
      { front: 'Why does ice float?', back: 'Its hydrogen-bonded structure is more open and less dense than liquid water.' },
    ],
    [
      { question: 'The most abundant hydrogen isotope is…', options: ['Protium', 'Deuterium', 'Tritium', 'Muonium'], answer: 0, explanation: 'Protium has one proton and no neutron and dominates natural hydrogen.' },
      { question: 'Hydrogen peroxide has formula…', options: ['H₂O', 'H₂O₂', 'HO₂', 'H₃O'], answer: 1, explanation: 'Hydrogen peroxide contains two hydrogen and two oxygen atoms.' },
    ],
  ),
  'chem-sblock': content(
    'The s-block elements tend to lose their outer s electrons and form ionic compounds with predictable group trends.',
    ['Read group 1 and 2 trends.', 'Compare important compounds.', 'Explain anomalous first-member behaviour.'],
    ['Group 1 configuration: ns¹', 'Group 2 configuration: ns²', 'Basic strength of many hydroxides increases down the group.'],
    [
      { front: 'Why do alkali metals form +1 ions?', back: 'They have one valence electron that is relatively easy to remove.' },
      { front: 'What is the diagonal relationship?', back: 'Similarities between certain diagonally placed elements such as Li and Mg.' },
      { front: 'Why is sodium stored under oil?', back: 'To prevent rapid reaction with oxygen and moisture.' },
    ],
    [
      { question: 'Alkaline earth metals usually form ions with charge…', options: ['+1', '+2', '−1', '−2'], answer: 1, explanation: 'They lose two valence electrons.' },
      { question: 'Reactivity of alkali metals generally…', options: ['Decreases down group', 'Increases down group', 'Never changes', 'Depends only on colour'], answer: 1, explanation: 'Larger atoms lose the outer electron more readily down the group.' },
    ],
  ),
  'chem-pblock': content(
    'The p-block contains metals, metalloids, and non-metals whose properties change across a period as valence electrons are added to p orbitals.',
    ['Use group 13 and 14 trends.', 'Compare boron and carbon families.', 'Recognise inert-pair effects qualitatively.'],
    ['p-block valence configuration: ns²np¹–⁶', 'Catenation is strong in carbon.', 'Inert pair effect increases down heavier groups.'],
    [
      { front: 'Why does carbon show strong catenation?', back: 'The C–C bond is strong and carbon can form four covalent bonds.' },
      { front: 'What is an amphoteric oxide?', back: 'An oxide that reacts with both acids and bases.' },
      { front: 'What is the inert-pair effect?', back: 'The tendency of the ns² electrons to remain less available for bonding in heavier p-block atoms.' },
    ],
    [
      { question: 'The valence configuration of group 14 is…', options: ['ns²np²', 'ns²np⁴', 'ns¹', 'ns²'], answer: 0, explanation: 'Group 14 has four valence electrons.' },
      { question: 'Boron is classified as a…', options: ['Noble gas', 'Metalloid', 'Alkali metal', 'Lanthanide'], answer: 1, explanation: 'Boron has mixed metallic and non-metallic characteristics.' },
    ],
  ),
  'chem-organic': content(
    'Organic chemistry becomes manageable when structure, nomenclature, electronic effects, and reaction mechanisms are treated as a connected language.',
    ['Name basic organic compounds.', 'Identify functional groups.', 'Use inductive and resonance effects.'],
    ['Homologous series differ by –CH₂–.', 'Degree of unsaturation = (2C+2+N−H−X)/2.', 'Electrophile accepts an electron pair; nucleophile donates one.'],
    [
      { front: 'What is a functional group?', back: 'An atom or group of atoms responsible for characteristic reactions of an organic compound.' },
      { front: 'What is isomerism?', back: 'The existence of compounds with the same molecular formula but different arrangements.' },
      { front: 'What is a nucleophile?', back: 'An electron-rich species that donates an electron pair to an electrophile.' },
    ],
    [
      { question: 'Members of a homologous series differ by…', options: ['H₂O', 'CH₂', 'CO₂', 'Only charge'], answer: 1, explanation: 'Successive members differ by one –CH₂– unit.' },
      { question: 'A Lewis acid accepts…', options: ['An electron pair', 'A proton only', 'A neutron', 'A photon only'], answer: 0, explanation: 'Lewis acids are electron-pair acceptors.' },
    ],
  ),
  'chem-hydrocarbons': content(
    'Hydrocarbons contain only carbon and hydrogen, but bonding changes their shapes, reactivity, and common addition or substitution reactions.',
    ['Classify alkanes, alkenes, and alkynes.', 'Use basic IUPAC names.', 'Recognise addition and substitution patterns.'],
    ['Alkane: CₙH₂ₙ₊₂', 'Alkene: CₙH₂ₙ', 'Alkyne: CₙH₂ₙ₋₂', 'Aromatic benzene: C₆H₆'],
    [
      { front: 'What is saturated hydrocarbon?', back: 'A hydrocarbon containing only single carbon–carbon bonds.' },
      { front: 'What is the common reaction of alkenes?', back: 'Addition across the carbon–carbon double bond.' },
      { front: 'Why is benzene unusually stable?', back: 'Its π electrons are delocalised over a planar aromatic ring.' },
    ],
    [
      { question: 'Ethene contains…', options: ['Only single bonds', 'A carbon–carbon double bond', 'A triple bond', 'No hydrogen'], answer: 1, explanation: 'Ethene is C₂H₄ with one C=C bond.' },
      { question: 'Complete combustion of a hydrocarbon forms…', options: ['CO₂ and H₂O', 'Only carbon', 'H₂ only', 'Nitrogen salts'], answer: 0, explanation: 'With sufficient oxygen, carbon becomes CO₂ and hydrogen becomes H₂O.' },
    ],
  ),
  'chem-environment': content(
    'Environmental chemistry connects familiar pollutants to their sources, effects, and the chemical choices that can reduce harm.',
    ['Identify major air pollutants.', 'Explain ozone depletion and smog.', 'Use green-chemistry thinking.'],
    ['Primary pollutant is emitted directly.', 'Secondary pollutant forms in the atmosphere.', 'Green chemistry aims to reduce waste and hazardous substances at source.'],
    [
      { front: 'What is a primary pollutant?', back: 'A pollutant released directly from a source, such as CO from incomplete combustion.' },
      { front: 'What does stratospheric ozone absorb?', back: 'Much of the Sun’s harmful ultraviolet radiation.' },
      { front: 'What is eutrophication?', back: 'Nutrient enrichment of water that can cause algal growth and oxygen depletion.' },
    ],
    [
      { question: 'Photochemical smog needs sunlight and…', options: ['Nitrogen oxides and hydrocarbons', 'Only water vapour', 'Table salt', 'Helium'], answer: 0, explanation: 'Sunlight drives reactions between NOx and hydrocarbons that form secondary pollutants.' },
      { question: 'A good green-chemistry solution prevents waste…', options: ['After disposal only', 'At the source', 'By hiding it', 'By increasing toxicity'], answer: 1, explanation: 'Prevention is better than end-of-pipe treatment.' },
    ],
  ),
  'math-sets': content(
    'Sets and functions give mathematics a precise language for inputs, outputs, domains, and relationships.',
    ['Use set notation and operations.', 'Find domains and ranges.', 'Test whether a relation is a function.'],
    ['(f ∘ g)(x) = f(g(x))', 'n(A ∪ B) = n(A) + n(B) − n(A ∩ B)', 'A\\B = A ∩ Bᶜ'],
    [
      { front: 'What is a function?', back: 'A relation assigning exactly one output to each allowed input.' },
      { front: 'What is the domain?', back: 'The set of allowed input values.' },
      { front: 'What does one-to-one mean?', back: 'Different inputs produce different outputs.' },
    ],
    [
      { question: 'If f(x)=x² on all real numbers, f is…', options: ['One-to-one', 'Not one-to-one', 'Constant', 'Undefined'], answer: 1, explanation: 'f(1)=f(−1), so distinct inputs share an output.' },
      { question: 'The complement of A relative to U is…', options: ['A ∪ U', 'U − A', 'A ∩ U', 'A only'], answer: 1, explanation: 'Aᶜ contains elements in the universal set that are not in A.' },
    ],
  ),
  'math-trig': content(
    'Trigonometry connects angles to ratios, identities, graphs, and periodic behaviour.',
    ['Use standard identities.', 'Solve basic trigonometric equations.', 'Read amplitude and period from graphs.'],
    ['sin²x + cos²x = 1', '1 + tan²x = sec²x', 'sin(A ± B) = sinA cosB ± cosA sinB'],
    [
      { front: 'What is the period of sin x?', back: '2π radians or 360°.' },
      { front: 'What does tan x equal?', back: 'sin x / cos x, wherever cos x is non-zero.' },
      { front: 'What is the amplitude of 3 sin x?', back: '3.' },
    ],
    [
      { question: 'If sin θ = 3/5 for an acute angle, cos θ is…', options: ['3/5', '4/5', '5/3', '1/5'], answer: 1, explanation: 'Use the 3–4–5 triangle or cos²θ=1−sin²θ.' },
      { question: 'The period of sin(2x) is…', options: ['2π', 'π', '4π', 'π/2'], answer: 1, explanation: 'Period is 2π divided by the coefficient of x.' },
    ],
  ),
  'math-complex': content(
    'Complex numbers extend the real line so equations such as x² + 1 = 0 have solutions.',
    ['Perform complex arithmetic.', 'Use conjugates and modulus.', 'Represent numbers on the Argand plane.'],
    ['i² = −1', 'z z̄ = |z|²', 'z = r(cos θ + i sin θ)'],
    [
      { front: 'What is the conjugate of a+ib?', back: 'a−ib.' },
      { front: 'What does modulus represent geometrically?', back: 'Distance from the origin in the Argand plane.' },
      { front: 'What is i⁴?', back: '1.' },
    ],
    [
      { question: 'The modulus of 3+4i is…', options: ['1', '5', '7', '25'], answer: 1, explanation: '|z| = √(3²+4²) = 5.' },
      { question: 'Multiplying a complex number by its conjugate gives…', options: ['A pure imaginary number', 'Its modulus squared', 'Zero always', 'The conjugate'], answer: 1, explanation: '(a+ib)(a−ib)=a²+b².' },
    ],
  ),
  'math-sequence': content(
    'Sequences and series turn repeated patterns into formulas for terms, sums, and growth.',
    ['Identify AP and GP patterns.', 'Find nth terms.', 'Use finite and infinite sum formulas.'],
    ['AP: a_n = a + (n−1)d', 'AP sum: S_n = n/2[2a+(n−1)d]', 'GP sum: S_n = a(rⁿ−1)/(r−1)'],
    [
      { front: 'What is common difference?', back: 'The constant amount added between consecutive terms in an arithmetic progression.' },
      { front: 'What is common ratio?', back: 'The constant multiplier between consecutive terms in a geometric progression.' },
      { front: 'When does an infinite GP converge?', back: 'When |r| < 1.' },
    ],
    [
      { question: 'The nth term of 2, 5, 8, … is…', options: ['2n', '3n−1', '3n+1', 'n+3'], answer: 1, explanation: 'a=2 and d=3, so a_n=2+3(n−1)=3n−1.' },
      { question: 'The sum to infinity of a GP exists when…', options: ['r > 1', '|r| < 1', 'r = 2', 'a = 0 only'], answer: 1, explanation: 'Terms shrink to zero only for |r|<1.' },
    ],
  ),
  'math-straight': content(
    'Coordinate geometry turns lines into equations so slope, distance, and intersection become computable.',
    ['Use multiple line forms.', 'Calculate angle and distance.', 'Find intersections and families of lines.'],
    ['Slope m = (y₂−y₁)/(x₂−x₁)', 'Point-slope: y−y₁ = m(x−x₁)', 'Distance from ax+by+c=0: |ax₁+by₁+c|/√(a²+b²)'],
    [
      { front: 'What does slope represent?', back: 'Change in y per unit change in x.' },
      { front: 'Condition for parallel lines?', back: 'Equal slopes, unless both are vertical.' },
      { front: 'Condition for perpendicular non-vertical lines?', back: 'm₁m₂ = −1.' },
    ],
    [
      { question: 'The slope of 2x+3y=6 is…', options: ['2/3', '−2/3', '3/2', '−3/2'], answer: 1, explanation: 'Rearrange to y=−(2/3)x+2.' },
      { question: 'The distance between (0,0) and (3,4) is…', options: ['1', '5', '7', '12'], answer: 1, explanation: '√(3²+4²)=5.' },
    ],
  ),
  'math-inequalities': content(
    'Linear inequalities describe ranges rather than single answers, so the sign and the number line matter as much as the algebra.',
    ['Solve one-variable inequalities.', 'Represent intervals on a number line.', 'Handle compound inequalities.'],
    ['Multiplying or dividing by a negative reverses the inequality sign.', 'Use open endpoints for strict inequalities.', 'Intersection means satisfy both conditions.'],
    [
      { front: 'What happens when an inequality is multiplied by a negative?', back: 'The inequality sign reverses.' },
      { front: 'What does x ≥ 3 mean on a number line?', back: 'A closed point at 3 and the ray extending to the right.' },
      { front: 'What is a compound inequality?', back: 'Two inequalities connected to describe a restricted interval.' },
    ],
    [
      { question: 'Solving −2x > 6 gives…', options: ['x > 3', 'x < −3', 'x > −3', 'x < 3'], answer: 1, explanation: 'Divide by −2 and reverse the sign: x < −3.' },
      { question: 'The solution of x≤2 and x>−1 is…', options: ['(−1,2]', '[−1,2]', '(−∞,2]', '(−1,∞)'], answer: 0, explanation: 'The lower bound is strict and the upper bound is inclusive.' },
    ],
  ),
  'math-pnc': content(
    'Counting becomes reliable when you first decide whether order matters and whether repetition is allowed.',
    ['Choose between permutations and combinations.', 'Count arrangements with restrictions.', 'Use factorial notation.'],
    ['n! = n(n−1)…1', 'ⁿPᵣ = n!/(n−r)!', 'ⁿCᵣ = n!/[r!(n−r)!]', 'ⁿCᵣ = ⁿCₙ₋ᵣ'],
    [
      { front: 'When do you use a permutation?', back: 'When order matters.' },
      { front: 'When do you use a combination?', back: 'When selecting a group and order does not matter.' },
      { front: 'What is 0!?', back: '1.' },
    ],
    [
      { question: 'The number of ways to arrange 3 distinct books is…', options: ['3', '6', '9', '1'], answer: 1, explanation: '3! = 6.' },
      { question: 'Choosing 2 students from 5 uses…', options: ['⁵P₂', '⁵C₂', '5²', '2⁵'], answer: 1, explanation: 'Selection ignores order, so use a combination.' },
    ],
  ),
  'math-binomial': content(
    'The binomial theorem replaces repeated multiplication with a predictable coefficient pattern and powers of the two terms.',
    ['Expand a binomial.', 'Find a specific term.', 'Use coefficient symmetry.'],
    ['(a+b)ⁿ = Σ ⁿCᵣ aⁿ⁻ʳbʳ', 'General term Tᵣ₊₁ = ⁿCᵣ aⁿ⁻ʳbʳ', 'ⁿCᵣ = ⁿCₙ₋ᵣ'],
    [
      { front: 'What are binomial coefficients?', back: 'The combination numbers that multiply terms in a binomial expansion.' },
      { front: 'What is the middle term count when n is even?', back: 'One middle term.' },
      { front: 'What is the general term?', back: 'Tᵣ₊₁ = ⁿCᵣ aⁿ⁻ʳbʳ.' },
    ],
    [
      { question: 'The coefficient of x² in (1+x)⁴ is…', options: ['2', '4', '6', '8'], answer: 2, explanation: 'The coefficient is ⁴C₂ = 6.' },
      { question: 'In an expansion, powers of the first term generally…', options: ['Increase', 'Decrease', 'Stay absent', 'Become factorials'], answer: 1, explanation: 'The first power decreases while the second power increases.' },
    ],
  ),
  'math-conic': content(
    'Conic sections are curves created by slicing a cone; their equations encode distance, symmetry, and focus–directrix properties.',
    ['Recognise standard conics.', 'Find centre, vertex, and radius.', 'Use basic focus and eccentricity ideas.'],
    ['Circle: (x−h)²+(y−k)²=r²', 'Parabola: y²=4ax', 'Ellipse: x²/a²+y²/b²=1', 'Hyperbola: x²/a²−y²/b²=1'],
    [
      { front: 'What is the eccentricity of a parabola?', back: '1.' },
      { front: 'What is the centre of (x−h)²+(y−k)²=r²?', back: '(h,k).' },
      { front: 'What does a parabola describe geometrically?', back: 'Points equidistant from a focus and a directrix.' },
    ],
    [
      { question: 'The radius of x²+y²=25 is…', options: ['5', '25', '10', '√5'], answer: 0, explanation: 'Compare with x²+y²=r².' },
      { question: 'A hyperbola has eccentricity…', options: ['Less than 1', 'Equal to 1', 'Greater than 1', 'Always zero'], answer: 2, explanation: 'Ellipse e<1, parabola e=1, hyperbola e>1.' },
    ],
  ),
  'math-3d': content(
    'Three-dimensional geometry extends coordinate ideas to points and distances in space.',
    ['Use coordinates in space.', 'Calculate distance and section formula.', 'Interpret direction ratios.'],
    ['Distance = √[(x₂−x₁)²+(y₂−y₁)²+(z₂−z₁)²]', 'Midpoint = ((x₁+x₂)/2, …)', 'Direction cosines satisfy l²+m²+n²=1'],
    [
      { front: 'What are direction ratios?', back: 'Any three numbers proportional to the direction cosines of a line.' },
      { front: 'What is the origin in 3D?', back: '(0,0,0).' },
      { front: 'What does distance formula use?', back: 'The square root of the sum of squared coordinate differences.' },
    ],
    [
      { question: 'Distance from (0,0,0) to (1,2,2) is…', options: ['3', '5', '√5', '1'], answer: 0, explanation: '√(1+4+4)=3.' },
      { question: 'The sum of squares of direction cosines is…', options: ['0', '1', '3', 'Depends on units'], answer: 1, explanation: 'l²+m²+n²=1.' },
    ],
  ),
  'math-limits': content(
    'A limit describes the value a function approaches, while a derivative measures the instantaneous rate of change at a point.',
    ['Evaluate basic limits.', 'Use derivative definitions.', 'Interpret slope and rate of change.'],
    ['f′(x) = limₕ→0 [f(x+h)−f(x)]/h', 'd(xⁿ)/dx = n xⁿ⁻¹', 'd(sin x)/dx = cos x'],
    [
      { front: 'What does a limit describe?', back: 'The value a function approaches as the input approaches a point.' },
      { front: 'What is a derivative geometrically?', back: 'The slope of the tangent to a curve.' },
      { front: 'What is continuity informally?', back: 'The graph has no break at the point being considered.' },
    ],
    [
      { question: 'The derivative of x² is…', options: ['x', '2x', 'x³', '2'], answer: 1, explanation: 'Use d(xⁿ)/dx = n xⁿ⁻¹.' },
      { question: 'A derivative measures…', options: ['Average only', 'Instantaneous rate of change', 'Area only', 'A set'], answer: 1, explanation: 'The derivative is the limiting slope.' },
    ],
  ),
  'math-statistics': content(
    'Statistics summarises a data set while also showing how spread out the observations are around a centre.',
    ['Calculate mean and variance.', 'Use standard deviation.', 'Compare consistency of data sets.'],
    ['Mean = Σx/n', 'Variance = mean of squared deviations', 'Standard deviation = √variance', 'Coefficient of variation = SD/mean × 100'],
    [
      { front: 'What does standard deviation measure?', back: 'Typical spread of observations around the mean.' },
      { front: 'What is variance?', back: 'The mean of squared deviations from the mean.' },
      { front: 'Why square deviations?', back: 'To prevent positive and negative deviations cancelling.' },
    ],
    [
      { question: 'Standard deviation is measured in…', options: ['Squared units', 'The same units as data', 'No units always', 'Percent only'], answer: 1, explanation: 'Taking the square root of variance returns the original units.' },
      { question: 'A lower standard deviation generally means…', options: ['More spread', 'Less spread', 'Higher mean always', 'No observations'], answer: 1, explanation: 'Lower spread means observations cluster more closely.' },
    ],
  ),
  'math-probability': content(
    'Probability turns uncertainty into a number between zero and one, with events built from possible outcomes.',
    ['Define sample space and events.', 'Use complements.', 'Calculate simple event probabilities.'],
    ['P(E) = favourable outcomes/total equally likely outcomes', 'P(Eᶜ)=1−P(E)', '0≤P(E)≤1'],
    [
      { front: 'What is a sample space?', back: 'The set of all possible outcomes of an experiment.' },
      { front: 'What is the complement of an event?', back: 'All outcomes in the sample space where the event does not occur.' },
      { front: 'What does probability 0 mean?', back: 'The event is impossible under the model.' },
    ],
    [
      { question: 'The probability of a sure event is…', options: ['0', '1', '−1', 'Greater than 1'], answer: 1, explanation: 'A sure event has probability one.' },
      { question: 'For a fair die, P(even number) is…', options: ['1/6', '1/3', '1/2', '2/3'], answer: 2, explanation: 'Three of six outcomes are even.' },
    ],
  ),
};

export function getStudyContent(chapterId: string): StudyContent {
  return studyContent[chapterId] ?? {
    summary: 'Use the chapter title as your anchor, then explain the idea in your own words before attempting questions.',
    outcomes: ['Define the core terms.', 'Work through one example.', 'Test yourself without looking at the notes.'],
    formulaNotes: ['Write the relationship in symbols.', 'Label every quantity and unit.', 'Check whether the answer is sensible.'],
    flashcards: [{ front: 'What is the main idea?', back: 'Explain it aloud in one sentence, then add one example.' }],
    quiz: [{ question: 'What should you do after reading?', options: ['Close the book and recall', 'Skip practice', 'Memorise every line', 'Start another chapter'], answer: 0, explanation: 'Retrieval practice is more useful than rereading alone.' }],
  };
}

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
  // Try finding in legacy list, otherwise check dynamic/curriculum registry
  const selected: Chapter[] = [];
  for (const id of chapterIds) {
    const existing = chapters.find((c) => c.id === id);
    if (existing) {
      selected.push(existing);
    } else {
      // Lazy import or fallback lookup
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
          candidate.subject === chapter.subject &&
          candidate.order < chapter.order,
      )
      .forEach((candidate) => prerequisiteIds.add(candidate.id));
  });

  const planned = [
    ...chapters.filter(
      (chapter) =>
        selectedIds.has(chapter.id) || prerequisiteIds.has(chapter.id),
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
           : input.confidence === 'rusty'
             ? `Read the core ideas and make a one-page concept sheet`
             : `Recall the core ideas, then make a one-page concept sheet`,
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