export type Subject = 'Physics' | 'Chemistry' | 'Mathematics';
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