export interface NCERTSubtopic {
  id: string;
  code: string; // e.g. "2.1", "3.4"
  title: string;
  highYield?: boolean; // 🔥 High weightage in JEE Main & CBSE
  coreConcepts: string[];
  keyFormula?: string;
  trapNote?: string;
}

export interface ChapterSubtopicCollection {
  chapterId: string;
  chapterTitle: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics';
  ncertBookChapterNo: number;
  totalSubtopics: number;
  subtopics: NCERTSubtopic[];
}

export const ncertSubtopicsData: Record<string, ChapterSubtopicCollection> = {
  // ==================== PHYSICS ====================
  'phy-world': {
    chapterId: 'phy-world',
    chapterTitle: 'Physical World',
    subject: 'Physics',
    ncertBookChapterNo: 1,
    totalSubtopics: 4,
    subtopics: [
      {
        id: 'phy-world-1',
        code: '1.1',
        title: 'What is Physics & Scope of Physics',
        coreConcepts: ['Macroscopic vs microscopic domains', 'Classical physics vs quantum mechanics'],
      },
      {
        id: 'phy-world-2',
        code: '1.2',
        title: 'Physics, Technology and Society',
        coreConcepts: ['Thermodynamics leading to heat engines', 'Silicon chips & semiconductor revolution'],
      },
      {
        id: 'phy-world-3',
        code: '1.3',
        title: 'Fundamental Forces in Nature',
        highYield: true,
        coreConcepts: ['Gravitational, Electromagnetic, Strong Nuclear, Weak Nuclear', 'Relative strengths and ranges'],
        trapNote: 'Strong nuclear force is ~100x electromagnetic force but only acts over ~10⁻¹⁵ m.',
      },
      {
        id: 'phy-world-4',
        code: '1.4',
        title: 'Nature of Physical Laws & Conservation Principles',
        coreConcepts: ['Conservation of Energy, Linear Momentum, Angular Momentum, Charge', 'Symmetry of space and time'],
      },
    ],
  },

  'phy-units': {
    chapterId: 'phy-units',
    chapterTitle: 'Units & Measurements',
    subject: 'Physics',
    ncertBookChapterNo: 2,
    totalSubtopics: 6,
    subtopics: [
      {
        id: 'phy-units-1',
        code: '2.1',
        title: 'SI Base & Supplementary Units',
        coreConcepts: ['7 Base units: m, kg, s, A, K, mol, cd', 'Plane angle (rad) & Solid angle (sr) are dimensionless'],
        trapNote: 'Radian and Steradian have units but no dimensions.',
      },
      {
        id: 'phy-units-2',
        code: '2.2',
        title: 'Measurement of Large & Small Distances',
        coreConcepts: ['Parallax method: b = D × θ', 'Estimation of molecular size using oleic acid'],
        keyFormula: 'θ = b / D',
      },
      {
        id: 'phy-units-3',
        code: '2.3',
        title: 'Errors in Measurement (Absolute, Relative & %)',
        highYield: true,
        coreConcepts: ['Systematic vs Random errors', 'Combination of errors in sums, differences, products, powers'],
        keyFormula: 'If Z = A^p B^q / C^r, ΔZ/Z = p(ΔA/A) + q(ΔB/B) + r(ΔC/C)',
        trapNote: 'Errors ALWAYS add, never subtract, even in quotients or differences.',
      },
      {
        id: 'phy-units-4',
        code: '2.4',
        title: 'Significant Figures & Rounding Off Rules',
        coreConcepts: ['Rules for non-zero digits, leading/trailing zeros', 'Rules for addition/subtraction (decimal places) vs multiplication/division (sig figs)'],
      },
      {
        id: 'phy-units-5',
        code: '2.5',
        title: 'Dimensions of Physical Quantities',
        highYield: true,
        coreConcepts: ['Dimensional formulas of Force, Energy, Planck Constant, Gravitational Constant, Viscosity'],
        keyFormula: '[h] = [ML²T⁻¹], [G] = [M⁻¹L³T⁻²]',
      },
      {
        id: 'phy-units-6',
        code: '2.6',
        title: 'Dimensional Analysis & Its Applications',
        highYield: true,
        coreConcepts: ['Principle of homogeneity', 'Checking consistency of equations', 'Deriving relations & converting unit systems'],
        trapNote: 'Arguments of exponential, trigonometric, and logarithmic functions must be dimensionless.',
      },
    ],
  },

  'phy-vectors': {
    chapterId: 'phy-vectors',
    chapterTitle: 'Motion in a Straight Line',
    subject: 'Physics',
    ncertBookChapterNo: 3,
    totalSubtopics: 6,
    subtopics: [
      {
        id: 'phy-vectors-1',
        code: '3.1',
        title: 'Position, Distance & Displacement',
        coreConcepts: ['Displacement is a vector, can be zero/negative', 'Distance ≥ |Displacement|'],
      },
      {
        id: 'phy-vectors-2',
        code: '3.2',
        title: 'Average & Instantaneous Velocity and Speed',
        coreConcepts: ['v_avg = Total Displacement / Total Time', 'v(t) = dx/dt, Speed = |v|'],
        trapNote: 'Average speed is NOT the magnitude of average velocity if the particle reverses direction.',
      },
      {
        id: 'phy-vectors-3',
        code: '3.3',
        title: 'Acceleration & Interpretation of x-t, v-t Graphs',
        highYield: true,
        coreConcepts: ['Slope of x-t curve = velocity', 'Slope of v-t curve = acceleration', 'Area under v-t curve = displacement'],
      },
      {
        id: 'phy-vectors-4',
        code: '3.4',
        title: 'Kinematic Equations for Uniform Acceleration',
        highYield: true,
        coreConcepts: ['Derivations using calculus & graphs', 'v = u + at', 's = ut + ½at²', 'v² = u² + 2as', 's_nth = u + a/2(2n - 1)'],
        keyFormula: 's_nth = u + \frac{a}{2}(2n - 1)',
        trapNote: 'These formulas ONLY hold when acceleration is strictly constant.',
      },
      {
        id: 'phy-vectors-5',
        code: '3.5',
        title: 'Motion Under Gravity & Free Fall',
        highYield: true,
        coreConcepts: ['Sign convention for upward vs downward motion', 'Time of ascent = Time of descent', 'Max height H = u²/(2g)'],
        keyFormula: 'H_{max} = \frac{u^2}{2g}, \quad T = \frac{2u}{g}',
      },
      {
        id: 'phy-vectors-6',
        code: '3.6',
        title: 'Relative Velocity in One Dimension',
        highYield: true,
        coreConcepts: ['v_{AB} = v_A - v_B', 'Trains crossing each other, overtaking scenarios'],
      },
    ],
  },

  'phy-motion-plane': {
    chapterId: 'phy-motion-plane',
    chapterTitle: 'Motion in a Plane',
    subject: 'Physics',
    ncertBookChapterNo: 4,
    totalSubtopics: 6,
    subtopics: [
      {
        id: 'phy-motion-plane-1',
        code: '4.1',
        title: 'Vectors: Resolution & Triangle/Parallelogram Law',
        highYield: true,
        coreConcepts: ['Resolution into orthogonal components: A_x = A cos θ, A_y = A sin θ', 'Resultant R = √(A² + B² + 2AB cos θ)'],
        keyFormula: 'R = \sqrt{A^2 + B^2 + 2AB\cos\theta}, \quad \tan\alpha = \frac{B\sin\theta}{A + B\cos\theta}',
      },
      {
        id: 'phy-motion-plane-2',
        code: '4.2',
        title: 'Scalar (Dot) and Vector (Cross) Products',
        highYield: true,
        coreConcepts: ['A · B = AB cos θ (Work, Power)', 'A × B = AB sin θ n̂ (Torque, Angular Momentum)', 'Determinant method for cross product'],
      },
      {
        id: 'phy-motion-plane-3',
        code: '4.3',
        title: '2D Motion with Constant Acceleration',
        coreConcepts: ['Independence of horizontal and vertical motions: x(t) and y(t) analyzed separately'],
      },
      {
        id: 'phy-motion-plane-4',
        code: '4.4',
        title: 'Projectile Motion: Trajectory & Core Formulas',
        highYield: true,
        coreConcepts: ['Parabolic path equation', 'Time of flight T = 2u sin θ / g', 'Max height H = u² sin² θ / (2g)', 'Range R = u² sin 2θ / g'],
        keyFormula: 'y = x\tan\theta - \frac{g x^2}{2u^2\cos^2\theta}, \quad R_{max} = \frac{u^2}{g} \text{ at } 45^\circ',
        trapNote: 'Range is the same for complementary angles θ and (90° - θ).',
      },
      {
        id: 'phy-motion-plane-5',
        code: '4.5',
        title: 'Horizontal & Inclined Plane Projectiles',
        coreConcepts: ['Projectile fired horizontally from a tower: t = √(2h/g), R = u√(2h/g)', 'Range along an inclined plane'],
      },
      {
        id: 'phy-motion-plane-6',
        code: '4.6',
        title: 'Uniform Circular Motion & Centripetal Acceleration',
        highYield: true,
        coreConcepts: ['Magnitude of centripetal acceleration a_c = v²/r = ω²r directed toward center', 'Angular velocity ω = 2π/T = v/r'],
        keyFormula: 'a_c = \frac{v^2}{r} = \omega^2 r',
      },
    ],
  },

  'phy-laws': {
    chapterId: 'phy-laws',
    chapterTitle: 'Laws of Motion',
    subject: 'Physics',
    ncertBookChapterNo: 5,
    totalSubtopics: 6,
    subtopics: [
      {
        id: 'phy-laws-1',
        code: '5.1',
        title: 'Newton\'s First Law & Inertia',
        coreConcepts: ['Concept of force and inertia (rest, motion, direction)', 'Inertial vs Non-inertial frames & Pseudo force'],
        trapNote: 'Pseudo force F_p = -m a_{frame} must ONLY be applied when working inside an accelerated frame.',
      },
      {
        id: 'phy-laws-2',
        code: '5.2',
        title: 'Newton\'s Second Law, Momentum & Impulse',
        highYield: true,
        coreConcepts: ['F = dp/dt = m(dv/dt) + v(dm/dt)', 'Impulse J = ∫ F dt = Δp', 'Area under F-t curve = Impulse'],
        keyFormula: 'J = \Delta p = F_{avg} \Delta t',
      },
      {
        id: 'phy-laws-3',
        code: '5.3',
        title: 'Newton\'s Third Law & Conservation of Momentum',
        highYield: true,
        coreConcepts: ['Action and reaction act on DIFFERENT bodies, never cancel each other', 'Recoil of gun, rocket propulsion'],
      },
      {
        id: 'phy-laws-4',
        code: '5.4',
        title: 'Free Body Diagrams & Connected Bodies',
        highYield: true,
        coreConcepts: ['Normal reaction, String tension, Pulley problems (Atwood machine)', 'Apparent weight in an accelerating lift'],
        keyFormula: 'a = \frac{(m_2 - m_1)g}{m_1 + m_2}, \quad T = \frac{2m_1 m_2 g}{m_1 + m_2}',
      },
      {
        id: 'phy-laws-5',
        code: '5.5',
        title: 'Friction: Static, Limiting & Kinetic',
        highYield: true,
        coreConcepts: ['f_s ≤ μ_s N, f_k = μ_k N', 'Angle of friction & Angle of repose (tan θ = μ_s)', 'Block on an inclined plane'],
        trapNote: 'Static friction is self-adjusting from 0 up to limiting friction μ_s N.',
      },
      {
        id: 'phy-laws-6',
        code: '5.6',
        title: 'Dynamics of Circular Motion & Banking of Roads',
        highYield: true,
        coreConcepts: ['Centripetal force provider (tension, friction, normal)', 'Optimum speed on banked road: v = √(rg tan θ)', 'Max safe speed with friction'],
        keyFormula: 'v_{opt} = \sqrt{rg\tan\theta}, \quad v_{max} = \sqrt{rg\left(\frac{\mu + \tan\theta}{1 - \mu\tan\theta}\right)}',
      },
    ],
  },

  'phy-work': {
    chapterId: 'phy-work',
    chapterTitle: 'Work, Energy & Power',
    subject: 'Physics',
    ncertBookChapterNo: 6,
    totalSubtopics: 6,
    subtopics: [
      {
        id: 'phy-work-1',
        code: '6.1',
        title: 'Work Done by Constant & Variable Force',
        highYield: true,
        coreConcepts: ['W = F · s = F s cos θ', 'Work as area under F-x curve: W = ∫ F dx', 'Sign of work (positive, negative, zero)'],
      },
      {
        id: 'phy-work-2',
        code: '6.2',
        title: 'Work-Energy Theorem',
        highYield: true,
        coreConcepts: ['W_{net} = ΔK = K_f - K_i', 'Applies to both constant and variable forces, valid in all inertial frames'],
        keyFormula: 'W_{all} = K_f - K_i = \frac{1}{2}m v_f^2 - \frac{1}{2}m v_i^2',
      },
      {
        id: 'phy-work-3',
        code: '6.3',
        title: 'Conservative Forces & Potential Energy',
        highYield: true,
        coreConcepts: ['Work done in a closed path is zero', 'F = -dU/dx', 'Gravitational potential energy U = mgh', 'Spring potential energy U = ½kx²'],
        keyFormula: 'F = -\frac{dU}{dx}, \quad U_{spring} = \frac{1}{2}kx^2',
      },
      {
        id: 'phy-work-4',
        code: '6.4',
        title: 'Conservation of Mechanical Energy',
        highYield: true,
        coreConcepts: ['ΔK + ΔU = 0 for conservative forces', 'Motion in a vertical circle (critical velocities: v_{bottom} = √(5gl), v_{top} = √(gl))'],
        trapNote: 'For a string in vertical circle, string goes slack if v_{top} < √(gl). For a light rigid rod, v_{top} can be zero (v_{bottom} = √(4gl)).',
      },
      {
        id: 'phy-work-5',
        code: '6.5',
        title: 'Power: Instantaneous & Average',
        coreConcepts: ['P_{avg} = W / Δt', 'P_{inst} = F · v', '1 hp = 746 Watts'],
        keyFormula: 'P = \vec{F} \cdot \vec{v}',
      },
      {
        id: 'phy-work-6',
        code: '6.6',
        title: 'Collisions in 1D & 2D (Elastic vs Inelastic)',
        highYield: true,
        coreConcepts: ['Coefficient of restitution e = (v_2 - v_1) / (u_1 - u_2)', 'e = 1 (Elastic), 0 < e < 1 (Inelastic), e = 0 (Perfectly Inelastic)', 'Loss of KE in inelastic collisions'],
        keyFormula: '\Delta K_{loss} = \frac{1}{2}\frac{m_1 m_2}{m_1 + m_2}(u_1 - u_2)^2(1 - e^2)',
      },
    ],
  },

  'phy-system': {
    chapterId: 'phy-system',
    chapterTitle: 'System of Particles',
    subject: 'Physics',
    ncertBookChapterNo: 7,
    totalSubtopics: 4,
    subtopics: [
      {
        id: 'phy-system-1',
        code: '7.1',
        title: 'Centre of Mass: Discrete & Continuous Systems',
        highYield: true,
        coreConcepts: ['R_{CM} = Σ(m_i r_i) / Σm_i', 'Continuous bodies: X_{CM} = (1/M) ∫ x dm', 'CM of rod, ring, disc, hemisphere'],
        keyFormula: 'X_{CM} = \frac{m_1 x_1 + m_2 x_2}{m_1 + m_2}',
      },
      {
        id: 'phy-system-2',
        code: '7.2',
        title: 'Motion of Centre of Mass & Conservation of Linear Momentum',
        highYield: true,
        coreConcepts: ['V_{CM} = P_{total} / M', 'F_{ext} = M a_{CM}', 'If F_{ext} = 0, CM moves with constant velocity or stays at rest'],
        trapNote: 'Internal forces (like explosion of a bomb or student walking on a boat) CANNOT shift the motion of the center of mass.',
      },
      {
        id: 'phy-system-3',
        code: '7.3',
        title: 'Vector Product of Two Vectors & Angular Velocity',
        coreConcepts: ['Cross product properties: non-commutative A × B = - (B × A)', 'Relation v = ω × r'],
      },
      {
        id: 'phy-system-4',
        code: '7.4',
        title: 'Centre of Gravity vs Centre of Mass',
        coreConcepts: ['CG is where total gravitational torque vanishes', 'CG coincides with CM only in a uniform gravitational field'],
      },
    ],
  },

  'phy-rotation': {
    chapterId: 'phy-rotation',
    chapterTitle: 'Rotational Motion',
    subject: 'Physics',
    ncertBookChapterNo: 7,
    totalSubtopics: 6,
    subtopics: [
      {
        id: 'phy-rotation-1',
        code: '7.5',
        title: 'Torque & Angular Momentum',
        highYield: true,
        coreConcepts: ['Torque τ = r × F = I α', 'Angular momentum L = r × p = I ω', 'Conservation of angular momentum (when τ_{ext} = 0)'],
        keyFormula: '\vec{\tau} = \frac{d\vec{L}}{dt}, \quad L = I\omega',
      },
      {
        id: 'phy-rotation-2',
        code: '7.6',
        title: 'Equilibrium of a Rigid Body',
        coreConcepts: ['Translational equilibrium: Σ F = 0', 'Rotational equilibrium: Σ τ = 0', 'Principle of moments (beam balance, levers)'],
      },
      {
        id: 'phy-rotation-3',
        code: '7.7',
        title: 'Moment of Inertia & Radius of Gyration',
        highYield: true,
        coreConcepts: ['I = Σ m_i r_i² = M k²', 'MI of rod (ML²/12), ring (MR²), disc (½MR²), solid cylinder (½MR²), solid sphere (⅖MR²), hollow sphere (⅔MR²)'],
        keyFormula: 'I = \int r^2 dm = M k^2',
      },
      {
        id: 'phy-rotation-4',
        code: '7.8',
        title: 'Theorems of Parallel & Perpendicular Axes',
        highYield: true,
        coreConcepts: ['Parallel axis theorem: I = I_{CM} + M d²', 'Perpendicular axis theorem (only for planar laminar bodies): I_z = I_x + I_y'],
        trapNote: 'Perpendicular axis theorem applies ONLY to flat (2D planar) objects, never to solid spheres or cylinders.',
      },
      {
        id: 'phy-rotation-5',
        code: '7.9',
        title: 'Kinematics & Dynamics of Rotational Motion',
        coreConcepts: ['ω = ω_0 + α t', 'θ = ω_0 t + ½ α t²', 'Work done W = ∫ τ dθ', 'Rotational KE = ½ I ω²'],
      },
      {
        id: 'phy-rotation-6',
        code: '7.10',
        title: 'Pure Rolling Motion & Rolling on Incline',
        highYield: true,
        coreConcepts: ['Condition for pure rolling: v_{CM} = R ω', 'Total KE = ½ M v²(1 + k²/R²)', 'Acceleration down an incline a = (g sin θ) / (1 + k²/R²)'],
        keyFormula: 'a = \frac{g\sin\theta}{1 + \frac{k^2}{R^2}}, \quad v = \sqrt{\frac{2gh}{1 + \frac{k^2}{R^2}}}',
      },
    ],
  },

  'phy-gravity': {
    chapterId: 'phy-gravity',
    chapterTitle: 'Gravitation',
    subject: 'Physics',
    ncertBookChapterNo: 8,
    totalSubtopics: 6,
    subtopics: [
      {
        id: 'phy-gravity-1',
        code: '8.1',
        title: 'Kepler\'s Laws of Planetary Motion',
        highYield: true,
        coreConcepts: ['Law of orbits (ellipses with Sun at one focus)', 'Law of areas (dA/dt = L/(2m) is constant, angular momentum conservation)', 'Law of periods (T² ∝ a³)'],
        keyFormula: 'T^2 \propto R^3, \quad \frac{dA}{dt} = \frac{L}{2m}',
      },
      {
        id: 'phy-gravity-2',
        code: '8.2',
        title: 'Universal Law of Gravitation & Constant G',
        coreConcepts: ['F = G m_1 m_2 / r²', 'Vector form and Cavendish experiment for measuring G = 6.67 × 10⁻¹¹ N m²/kg²'],
      },
      {
        id: 'phy-gravity-3',
        code: '8.3',
        title: 'Acceleration Due to Gravity (g) & Its Variations',
        highYield: true,
        coreConcepts: ['g = GM / R²', 'Variation with height h: g_h = g(1 - 2h/R) for h << R', 'Variation with depth d: g_d = g(1 - d/R)', 'Variation with latitude due to Earth rotation: g\' = g - R ω² cos² λ'],
        keyFormula: 'g_h = g\left(1 - \frac{2h}{R}\right), \quad g_d = g\left(1 - \frac{d}{R}\right)',
        trapNote: 'At the center of Earth (d = R), g = 0.',
      },
      {
        id: 'phy-gravity-4',
        code: '8.4',
        title: 'Gravitational Potential Energy & Gravitational Potential',
        highYield: true,
        coreConcepts: ['Potential V = -GM / r', 'Potential Energy U = -GMm / r', 'Change in PE for height h: ΔU = mgh / (1 + h/R)'],
        keyFormula: 'U = -\frac{GMm}{r}, \quad V = -\frac{GM}{r}',
      },
      {
        id: 'phy-gravity-5',
        code: '8.5',
        title: 'Escape Velocity',
        highYield: true,
        coreConcepts: ['Minimum speed to escape gravitational field: v_e = √(2GM/R) = √(2gR)', 'For Earth: v_e ≈ 11.2 km/s', 'Independent of mass and angle of projection'],
        keyFormula: 'v_e = \sqrt{\frac{2GM}{R}} = \sqrt{2gR} \approx 11.2\text{ km/s}',
      },
      {
        id: 'phy-gravity-6',
        code: '8.6',
        title: 'Earth Satellites & Orbital Velocity',
        highYield: true,
        coreConcepts: ['Orbital speed v_o = √(GM/r)', 'Time period T = 2π √(r³/GM)', 'Total energy E = -GMm / (2r) = -K = U/2', 'Geostationary (T = 24h, h ≈ 36000 km) vs Polar satellites'],
        keyFormula: 'v_o = \sqrt{\frac{GM}{R+h}}, \quad E_{total} = -\frac{GMm}{2r} = -K = \frac{U}{2}',
      },
    ],
  },

  'phy-solids': {
    chapterId: 'phy-solids',
    chapterTitle: 'Mechanical Properties of Solids',
    subject: 'Physics',
    ncertBookChapterNo: 9,
    totalSubtopics: 5,
    subtopics: [
      {
        id: 'phy-solids-1',
        code: '9.1',
        title: 'Stress, Strain & Hooke\'s Law',
        highYield: true,
        coreConcepts: ['Longitudinal, Volumetric, Shear stress and strain', 'Hooke\'s law: Stress = E × Strain within elastic limit'],
      },
      {
        id: 'phy-solids-2',
        code: '9.2',
        title: 'Stress-Strain Curve & Material Behavior',
        highYield: true,
        coreConcepts: ['Proportional limit, Yield point, Breaking stress', 'Ductile vs Brittle materials vs Elastomers'],
        trapNote: 'Elastomers (like rubber) do NOT obey Hooke\'s law and have high strain for small stress.',
      },
      {
        id: 'phy-solids-3',
        code: '9.3',
        title: 'Moduli of Elasticity (Young\'s, Shear, Bulk)',
        highYield: true,
        coreConcepts: ['Young\'s modulus Y = (F/A) / (ΔL/L)', 'Shear modulus G = (F/A) / θ', 'Bulk modulus B = - ΔP / (ΔV/V)', 'Compressibility k = 1/B'],
        keyFormula: 'Y = \frac{FL}{A\Delta L}, \quad B = -\frac{V\Delta P}{\Delta V}',
      },
      {
        id: 'phy-solids-4',
        code: '9.4',
        title: 'Poisson\'s Ratio (σ)',
        coreConcepts: ['Lateral strain / Longitudinal strain', 'Theoretical range (-1 to 0.5), practical range (0 to 0.5)'],
      },
      {
        id: 'phy-solids-5',
        code: '9.5',
        title: 'Elastic Potential Energy in a Stretched Wire',
        highYield: true,
        coreConcepts: ['U = ½ × Stress × Strain × Volume', 'Energy density u = ½ × Stress × Strain = ½ Y (Strain)²'],
        keyFormula: 'u = \frac{1}{2}\sigma \epsilon = \frac{1}{2}Y\epsilon^2',
      },
    ],
  },

  'phy-fluids': {
    chapterId: 'phy-fluids',
    chapterTitle: 'Mechanical Properties of Fluids',
    subject: 'Physics',
    ncertBookChapterNo: 10,
    totalSubtopics: 6,
    subtopics: [
      {
        id: 'phy-fluids-1',
        code: '10.1',
        title: 'Pressure in a Fluid & Pascal\'s Law',
        highYield: true,
        coreConcepts: ['P = F/A', 'Variation of pressure with depth: P = P_0 + ρgh', 'Pascal\'s law and hydraulic lift: F_1/A_1 = F_2/A_2'],
      },
      {
        id: 'phy-fluids-2',
        code: '10.2',
        title: 'Streamline Flow & Equation of Continuity',
        highYield: true,
        coreConcepts: ['Streamline vs turbulent flow', 'A_1 v_1 = A_2 v_2 (Conservation of mass for incompressible fluid)'],
        keyFormula: 'A_1 v_1 = A_2 v_2',
      },
      {
        id: 'phy-fluids-3',
        code: '10.3',
        title: 'Bernoulli\'s Principle & Applications',
        highYield: true,
        coreConcepts: ['P + ½ρv² + ρgh = constant', 'Torricelli\'s Law of Efflux: v = √(2gh)', 'Venturi-meter, Aerodynamic lift of aerofoil, Magnus effect'],
        keyFormula: 'P + \frac{1}{2}\rho v^2 + \rho gh = \text{constant}',
      },
      {
        id: 'phy-fluids-4',
        code: '10.4',
        title: 'Viscosity & Stokes\' Law',
        highYield: true,
        coreConcepts: ['Newtonian viscous force F = -η A (dv/dx)', 'Stokes\' Law for spherical body: F_v = 6πηrv', 'Terminal velocity v_t = 2/9 r²(ρ - σ)g / η'],
        keyFormula: 'v_t = \frac{2}{9}\frac{r^2(\rho - \sigma)g}{\eta}',
      },
      {
        id: 'phy-fluids-5',
        code: '10.5',
        title: 'Surface Tension & Surface Energy',
        highYield: true,
        coreConcepts: ['T = F / l = Work / ΔA', 'Angle of contact θ (<90° wetting, >90° non-wetting)', 'Excess pressure: ΔP = 2T/R (liquid drop), ΔP = 4T/R (soap bubble in air)'],
        keyFormula: '\Delta P_{drop} = \frac{2T}{R}, \quad \Delta P_{bubble} = \frac{4T}{R}',
        trapNote: 'A soap bubble in air has TWO interfaces (inner and outer), so its excess pressure is 4T/R instead of 2T/R.',
      },
      {
        id: 'phy-fluids-6',
        code: '10.6',
        title: 'Capillary Rise & Ascent Formula',
        highYield: true,
        coreConcepts: ['Capillary rise h = (2T cos θ) / (r ρ g)', 'Weight of liquid column balanced by upward surface tension force'],
        keyFormula: 'h = \frac{2T\cos\theta}{r\rho g}',
      },
    ],
  },

  'phy-thermal': {
    chapterId: 'phy-thermal',
    chapterTitle: 'Thermal Properties of Matter',
    subject: 'Physics',
    ncertBookChapterNo: 11,
    totalSubtopics: 5,
    subtopics: [
      {
        id: 'phy-thermal-1',
        code: '11.1',
        title: 'Thermal Expansion of Solids & Liquids',
        highYield: true,
        coreConcepts: ['Linear expansion ΔL = L_0 α ΔT', 'Area expansion ΔA = A_0 β ΔT', 'Volume expansion ΔV = V_0 γ ΔT', 'Relation: α = β/2 = γ/3', 'Anomalous expansion of water between 0°C and 4°C'],
      },
      {
        id: 'phy-thermal-2',
        code: '11.2',
        title: 'Specific Heat Capacity & Calorimetry',
        highYield: true,
        coreConcepts: ['Q = m c ΔT', 'Principle of Calorimetry: Heat Lost = Heat Gained', 'Water equivalent of calorimeter'],
      },
      {
        id: 'phy-thermal-3',
        code: '11.3',
        title: 'Change of State & Latent Heat',
        highYield: true,
        coreConcepts: ['Q = m L', 'Latent heat of fusion of ice L_f = 80 cal/g', 'Latent heat of vaporization of water L_v = 540 cal/g', 'Regelation & Triple point of water (273.16 K, 0.006 atm)'],
      },
      {
        id: 'phy-thermal-4',
        code: '11.4',
        title: 'Conduction, Convection & Radiation',
        highYield: true,
        coreConcepts: ['Rate of heat flow dQ/dt = k A (T_1 - T_2) / L', 'Thermal resistance R_{th} = L / (kA)', 'Series and parallel combination of thermal conductors'],
        keyFormula: '\frac{dQ}{dt} = \frac{kA(T_1 - T_2)}{L}',
      },
      {
        id: 'phy-thermal-5',
        code: '11.5',
        title: 'Newton\'s Law of Cooling, Wien\'s Law & Stefan\'s Law',
        highYield: true,
        coreConcepts: ['Stefan-Boltzmann: E = e σ T⁴', 'Net loss to surroundings: E_{net} = e σ (T⁴ - T_0⁴)', 'Newton\'s law of cooling: dT/dt = -K(T - T_0)', 'Wien\'s displacement law: λ_{max} T = b = 2.898 × 10⁻³ m K'],
        keyFormula: '\lambda_{max} T = b, \quad E = \sigma T^4',
      },
    ],
  },

  'phy-thermo': {
    chapterId: 'phy-thermo',
    chapterTitle: 'Thermodynamics',
    subject: 'Physics',
    ncertBookChapterNo: 12,
    totalSubtopics: 6,
    subtopics: [
      {
        id: 'phy-thermo-1',
        code: '12.1',
        title: 'Zeroth Law & First Law of Thermodynamics',
        highYield: true,
        coreConcepts: ['Zeroth law defines temperature', 'First law: ΔQ = ΔU + ΔW (Physics convention: ΔW done BY system is positive)', 'Internal energy is a state function U = n C_v T'],
        keyFormula: '\Delta Q = \Delta U + \Delta W, \quad \Delta W = \int P dV',
        trapNote: 'Be careful! In Physics ΔW = +PΔV (work by gas), whereas in Chemistry ΔW = -PΔV.',
      },
      {
        id: 'phy-thermo-2',
        code: '12.2',
        title: 'Molar Specific Heat Capacities (Cp, Cv & Mayer\'s Formula)',
        highYield: true,
        coreConcepts: ['C_p - C_v = R', 'Adiabatic index γ = C_p / C_v = 1 + 2/f', 'Values of γ for monoatomic (5/3), diatomic (7/5), polyatomic (4/3)'],
      },
      {
        id: 'phy-thermo-3',
        code: '12.3',
        title: 'Isothermal & Isochoric Processes',
        highYield: true,
        coreConcepts: ['Isothermal: T constant, ΔU = 0, W = nRT ln(V_2/V_1) = Q', 'Isochoric: V constant, W = 0, Q = ΔU = n C_v ΔT'],
      },
      {
        id: 'phy-thermo-4',
        code: '12.4',
        title: 'Adiabatic & Isobaric Processes',
        highYield: true,
        coreConcepts: ['Adiabatic: Q = 0, PV^γ = constant, TV^{γ-1} = constant', 'Adiabatic work W = (P_1 V_1 - P_2 V_2)/(γ - 1) = -ΔU', 'Isobaric: P constant, W = PΔV = nRΔT, Q = n C_p ΔT'],
        keyFormula: 'PV^\gamma = \text{const}, \quad W_{adia} = \frac{nR(T_1 - T_2)}{\gamma - 1}',
      },
      {
        id: 'phy-thermo-5',
        code: '12.5',
        title: 'Cyclic Processes & P-V Diagram Area',
        highYield: true,
        coreConcepts: ['Net work done in cyclic process = Area enclosed by P-V loop', 'Clockwise cycle = positive work (heat engine)', 'Counter-clockwise = negative work (refrigerator)'],
      },
      {
        id: 'phy-thermo-6',
        code: '12.6',
        title: 'Carnot Engine & Second Law of Thermodynamics',
        highYield: true,
        coreConcepts: ['Kelvin-Planck statement & Clausius statement', 'Carnot cycle (2 isothermals + 2 adiabatics)', 'Efficiency η = 1 - Q_2/Q_1 = 1 - T_2/T_1', 'Coefficient of performance of refrigerator β = T_2 / (T_1 - T_2)'],
        keyFormula: '\eta = 1 - \frac{T_2}{T_1}, \quad \beta = \frac{T_2}{T_1 - T_2}',
      },
    ],
  },

  'phy-kinetic': {
    chapterId: 'phy-kinetic',
    chapterTitle: 'Kinetic Theory',
    subject: 'Physics',
    ncertBookChapterNo: 13,
    totalSubtopics: 4,
    subtopics: [
      {
        id: 'phy-kinetic-1',
        code: '13.1',
        title: 'Kinetic Gas Model & Pressure Formula',
        highYield: true,
        coreConcepts: ['Assumptions of kinetic theory of gases', 'P = ⅓ ρ v_{rms}² = ⅓ (M/V) v_{rms}²', 'Average kinetic energy of gas: E = 3/2 nRT'],
        keyFormula: 'P = \frac{1}{3}\rho v_{rms}^2, \quad v_{rms} = \sqrt{\frac{3RT}{M}}',
      },
      {
        id: 'phy-kinetic-2',
        code: '13.2',
        title: 'Molecular Speeds: RMS, Average & Most Probable',
        highYield: true,
        coreConcepts: ['v_{rms} = √(3RT/M)', 'v_{avg} = √(8RT/πM)', 'v_{mp} = √(2RT/M)', 'Ratio: v_{mp} : v_{avg} : v_{rms} = √2 : √(8/π) : √3 ≈ 1 : 1.128 : 1.224'],
        keyFormula: 'v_{rms} = \sqrt{\frac{3RT}{M}}, \quad v_{mp} = \sqrt{\frac{2RT}{M}}',
      },
      {
        id: 'phy-kinetic-3',
        code: '13.3',
        title: 'Degrees of Freedom & Equipartition of Energy',
        highYield: true,
        coreConcepts: ['Law of equipartition: Energy per degree of freedom = ½ k_B T', 'Monoatomic: f = 3 (translational)', 'Diatomic: f = 5 (3 trans + 2 rot) at room temp, f = 7 with vibration', 'Total energy U = (f/2) nRT'],
      },
      {
        id: 'phy-kinetic-4',
        code: '13.4',
        title: 'Mean Free Path & Collision Frequency',
        coreConcepts: ['Mean free path λ = 1 / (√2 π n d²)', 'Variation with pressure and temperature: λ ∝ T / P'],
        keyFormula: '\lambda = \frac{1}{\sqrt{2} n \pi d^2}',
      },
    ],
  },

  'phy-oscillations': {
    chapterId: 'phy-oscillations',
    chapterTitle: 'Oscillations',
    subject: 'Physics',
    ncertBookChapterNo: 14,
    totalSubtopics: 5,
    subtopics: [
      {
        id: 'phy-oscillations-1',
        code: '14.1',
        title: 'Simple Harmonic Motion (SHM) Kinematics',
        highYield: true,
        coreConcepts: ['Displacement x(t) = A sin(ωt + φ)', 'Velocity v(t) = ω √(A² - x²)', 'Acceleration a(t) = - ω² x', 'Restoring force F = -kx'],
        keyFormula: 'a = -\omega^2 x, \quad v = \omega\sqrt{A^2 - x^2}',
      },
      {
        id: 'phy-oscillations-2',
        code: '14.2',
        title: 'Energy in Simple Harmonic Motion',
        highYield: true,
        coreConcepts: ['Kinetic Energy K = ½ m ω² (A² - x²)', 'Potential Energy U = ½ k x² = ½ m ω² x²', 'Total Energy E = K + U = ½ m ω² A² = constant', 'Average K = Average U = ¼ m ω² A²'],
        keyFormula: 'E = \frac{1}{2}m\omega^2 A^2 = \frac{1}{2}kA^2',
        trapNote: 'At x = A/√2, Kinetic Energy equals Potential Energy.',
      },
      {
        id: 'phy-oscillations-3',
        code: '14.3',
        title: 'Simple Pendulum & Angular SHM',
        highYield: true,
        coreConcepts: ['T = 2π √(L/g) for small angular amplitudes', 'Independent of mass and amplitude', 'Seconds pendulum has T = 2 seconds (length ≈ 1 m)'],
        keyFormula: 'T = 2\pi\sqrt{\frac{L}{g}}',
      },
      {
        id: 'phy-oscillations-4',
        code: '14.4',
        title: 'Spring-Mass Systems (Series & Parallel)',
        highYield: true,
        coreConcepts: ['T = 2π √(m/k)', 'Parallel springs: k_{eq} = k_1 + k_2', 'Series springs: 1/k_{eq} = 1/k_1 + 1/k_2', 'Cutting a spring into parts: k ∝ 1/L'],
        keyFormula: 'T = 2\pi\sqrt{\frac{m}{k_{eq}}}',
      },
      {
        id: 'phy-oscillations-5',
        code: '14.5',
        title: 'Damped & Forced Oscillations, Resonance',
        coreConcepts: ['Damped SHM: x(t) = A e^{-bt/2m} cos(ω\'t + φ)', 'Resonance condition: driving frequency equals natural frequency (amplitude peaks)'],
      },
    ],
  },

  'phy-waves': {
    chapterId: 'phy-waves',
    chapterTitle: 'Waves',
    subject: 'Physics',
    ncertBookChapterNo: 15,
    totalSubtopics: 5,
    subtopics: [
      {
        id: 'phy-waves-1',
        code: '15.1',
        title: 'Progressive Wave Equation & Wave Speed',
        highYield: true,
        coreConcepts: ['y(x, t) = A sin(kx - ωt + φ)', 'Wave number k = 2π/λ', 'Angular frequency ω = 2πν', 'Speed v = ω/k = ν λ', 'Speed of transverse wave on string: v = √(T/μ)'],
        keyFormula: 'v = \sqrt{\frac{T}{\mu}}, \quad y = A\sin(kx - \omega t)',
      },
      {
        id: 'phy-waves-2',
        code: '15.2',
        title: 'Speed of Sound & Newton-Laplace Formula',
        highYield: true,
        coreConcepts: ['Newton\'s isothermal assumption: v = √(P/ρ) (underestimated)', 'Laplace\'s adiabatic correction: v = √(γP/ρ) = √(γRT/M)', 'Dependence on temperature: v ∝ √T'],
        keyFormula: 'v = \sqrt{\frac{\gamma P}{\rho}} = \sqrt{\frac{\gamma RT}{M}}',
      },
      {
        id: 'phy-waves-3',
        code: '15.3',
        title: 'Standing Waves in Stretched Strings & Organ Pipes',
        highYield: true,
        coreConcepts: ['Nodes and Antinodes: Node-to-node separation = λ/2', 'String fixed at both ends: ν_n = n (v/2L)', 'Open organ pipe: ν_n = n (v/2L) (all harmonics)', 'Closed organ pipe: ν_n = (2n - 1)(v/4L) (only odd harmonics)'],
        keyFormula: '\nu_{open} = \frac{n v}{2L}, \quad \nu_{closed} = \frac{(2n-1) v}{4L}',
        trapNote: 'Closed pipe only produces ODD harmonics (1st, 3rd, 5th); even harmonics are completely missing!',
      },
      {
        id: 'phy-waves-4',
        code: '15.4',
        title: 'Beats & Interference of Sound Waves',
        highYield: true,
        coreConcepts: ['Beat frequency ν_b = |ν_1 - ν_2|', 'Tuning fork loading with wax (frequency decreases) vs filing (frequency increases)'],
        keyFormula: '\nu_{beat} = |\nu_1 - \nu_2|',
      },
      {
        id: 'phy-waves-5',
        code: '15.5',
        title: 'Doppler Effect in Sound',
        highYield: true,
        coreConcepts: ['Apparent frequency when source or observer moves', 'Formula: ν\' = ν [(v ± v_o) / (v ∓ v_s)]'],
        keyFormula: '\nu\' = \nu \left(\frac{v \pm v_o}{v \mp v_s}\right)',
      },
    ],
  },

  // ==================== CHEMISTRY ====================
  'chem-periodic': {
    chapterId: 'chem-periodic',
    chapterTitle: 'Classification of Elements',
    subject: 'Chemistry',
    ncertBookChapterNo: 3,
    totalSubtopics: 4,
    subtopics: [
      {
        id: 'chem-periodic-1',
        code: '3.1',
        title: 'Modern Periodic Law & Periodic Table Architecture',
        coreConcepts: ['Moseley\'s law: √ν ∝ Z', 'Classification into s, p, d, f blocks based on valence subshell'],
      },
      {
        id: 'chem-periodic-2',
        code: '3.2',
        title: 'Atomic & Ionic Radii Trends (Isoelectronic Species)',
        highYield: true,
        coreConcepts: ['Covalent, Metallic, van der Waals radii (vdW > metallic > covalent)', 'Isoelectronic species radius ∝ 1/Z (e.g. Al³⁺ < Mg²⁺ < Na⁺ < F⁻ < O²⁻ < N³⁻)'],
        trapNote: 'Among isoelectronic ions, the ion with the greatest positive nuclear charge Z has the smallest radius.',
      },
      {
        id: 'chem-periodic-3',
        code: '3.3',
        title: 'Ionization Enthalpy & Electron Gain Enthalpy Trends',
        highYield: true,
        coreConcepts: ['IE exceptions: B < Be (Be has stable 2s²), O < N (N has half-filled 2p³)', 'Second IE is always greater than first IE', 'Electron gain enthalpy: Cl > F (due to small size of F and interelectronic repulsion in 2p), S > O'],
        trapNote: 'Chlorine has a MORE negative electron gain enthalpy than Fluorine!',
      },
      {
        id: 'chem-periodic-4',
        code: '3.4',
        title: 'Electronegativity, Diagonal Relationship & Valence Trends',
        highYield: true,
        coreConcepts: ['Pauling scale: F (4.0) > O (3.5) > N ≈ Cl (3.0)', 'Diagonal pairs: Li-Mg, Be-Al, B-Si due to similar charge/radius ratio'],
      },
    ],
  },

  'chem-states': {
    chapterId: 'chem-states',
    chapterTitle: 'States of Matter',
    subject: 'Chemistry',
    ncertBookChapterNo: 5,
    totalSubtopics: 4,
    subtopics: [
      {
        id: 'chem-states-1',
        code: '5.1',
        title: 'Gas Laws (Boyle, Charles, Gay-Lussac, Avogadro)',
        coreConcepts: ['Boyle\'s: P ∝ 1/V', 'Charles\': V ∝ T', 'Ideal gas equation: PV = nRT = (w/M)RT', 'Gas density ρ = PM / RT'],
        keyFormula: 'PV = nRT, \quad \rho = \frac{PM}{RT}',
      },
      {
        id: 'chem-states-2',
        code: '5.2',
        title: 'Dalton\'s Law of Partial Pressures',
        highYield: true,
        coreConcepts: ['P_{total} = P_A + P_B + ...', 'Partial pressure P_A = X_A P_{total}', 'Dry gas pressure = P_{moist} - Aqueous tension'],
        keyFormula: 'P_i = X_i P_{total}',
      },
      {
        id: 'chem-states-3',
        code: '5.3',
        title: 'Real Gases: Van der Waals Equation & Compressibility Z',
        highYield: true,
        coreConcepts: ['(P + an²/V²)(V - nb) = nRT', '\'a\' measures intermolecular attraction, \'b\' measures molecular co-volume', 'Compressibility factor Z = PV / (nRT)', 'Z < 1 at low P (attractive forces dominate), Z > 1 at high P (repulsive forces dominate)', 'H₂ and He always have Z > 1'],
        keyFormula: '\left(P + \frac{an^2}{V^2}\right)(V - nb) = nRT, \quad Z = \frac{PV}{nRT}',
      },
      {
        id: 'chem-states-4',
        code: '5.4',
        title: 'Critical State & Liquefaction of Gases',
        coreConcepts: ['Critical temperature T_c = 8a / (27Rb)', 'Critical pressure P_c = a / (27b²)', 'Critical volume V_c = 3b', 'Boyle temperature T_b = a / (Rb)'],
      },
    ],
  },

  'chem-equilibrium': {
    chapterId: 'chem-equilibrium',
    chapterTitle: 'Equilibrium',
    subject: 'Chemistry',
    ncertBookChapterNo: 7,
    totalSubtopics: 6,
    subtopics: [
      {
        id: 'chem-equilibrium-1',
        code: '7.1',
        title: 'Law of Mass Action & Equilibrium Constants (Kc, Kp)',
        highYield: true,
        coreConcepts: ['Relation: K_p = K_c (RT)^{Δn_g}', 'If Δn_g = 0, K_p = K_c and equilibrium is independent of pressure', 'Properties: reversing reaction inverts K, multiplying coefficients raises K to power'],
        keyFormula: 'K_p = K_c(RT)^{\Delta n_g}',
      },
      {
        id: 'chem-equilibrium-2',
        code: '7.2',
        title: 'Reaction Quotient (Q) & Le Chatelier\'s Principle',
        highYield: true,
        coreConcepts: ['Q < K (forward), Q > K (backward)', 'Effect of temperature: Endothermic shifts forward on heating, Exothermic shifts backward', 'Effect of pressure/volume: increase in P shifts towards fewer moles of gas', 'Inert gas addition at constant V has NO effect; at constant P shifts to more moles'],
        trapNote: 'Adding an inert gas at CONSTANT VOLUME does not shift the equilibrium at all!',
      },
      {
        id: 'chem-equilibrium-3',
        code: '7.3',
        title: 'Acids, Bases & pH Calculations',
        highYield: true,
        coreConcepts: ['Arrhenius, Brønsted-Lowry (conjugate acid-base pairs), Lewis (electron pair acceptor/donor)', 'Ionic product of water K_w = [H⁺][OH⁻] = 10⁻¹⁴ at 298 K', 'pH = - log[H⁺], pH + pOH = 14', 'Weak acid ionization: [H⁺] = √(K_a C), pH = ½(pK_a - log C)'],
        keyFormula: 'pH = -\log_{10}[H^+], \quad [H^+] = \sqrt{K_a C}',
      },
      {
        id: 'chem-equilibrium-4',
        code: '7.4',
        title: 'Common Ion Effect & Salt Hydrolysis',
        highYield: true,
        coreConcepts: ['Common ion suppresses ionization of weak electrolytes', 'Weak Acid + Strong Base salt: pH = 7 + ½(pK_a + log C)', 'Strong Acid + Weak Base salt: pH = 7 - ½(pK_b + log C)', 'Weak Acid + Weak Base salt: pH = 7 + ½(pK_a - pK_b)'],
        keyFormula: 'pH = 7 + \frac{1}{2}(pK_a + \log C) \quad (\text{WA + SB salt})',
      },
      {
        id: 'chem-equilibrium-5',
        code: '7.5',
        title: 'Buffer Solutions & Henderson-Hasselbalch Equation',
        highYield: true,
        coreConcepts: ['Acidic buffer (CH₃COOH + CH₃COONa): pH = pK_a + log([Salt]/[Acid])', 'Basic buffer (NH₄OH + NH₄Cl): pOH = pK_b + log([Salt]/[Base])', 'Buffer capacity is maximum when [Salt] = [Acid] (pH = pK_a)'],
        keyFormula: 'pH = pK_a + \log_{10}\left(\frac{[\text{Salt}]}{[\text{Acid}]}\right)',
      },
      {
        id: 'chem-equilibrium-6',
        code: '7.6',
        title: 'Solubility Product (Ksp) & Precipitation Condition',
        highYield: true,
        coreConcepts: ['For A_x B_y ⇌ x A^{y+} + y B^{x-}, K_{sp} = x^x y^y S^{x+y}', 'Ionic product Q_{sp} vs K_{sp}: Q_{sp} > K_{sp} leads to precipitation', 'Applications in qualitative salt analysis (Group reagents)'],
        keyFormula: 'K_{sp} = [A^{y+}]^x [B^{x-}]^y',
      },
    ],
  },

  'chem-redox': {
    chapterId: 'chem-redox',
    chapterTitle: 'Redox Reactions',
    subject: 'Chemistry',
    ncertBookChapterNo: 8,
    totalSubtopics: 4,
    subtopics: [
      {
        id: 'chem-redox-1',
        code: '8.1',
        title: 'Oxidation Number Calculation Rules & Exceptions',
        highYield: true,
        coreConcepts: ['Rules for assigning oxidation numbers', 'Exceptions: CrO₅ (peroxide butterfly structure, Cr is +6 not +10), H₂SO₅ (Caro\'s acid, S is +6), Fe₃O₄ (fractional +8/3)'],
        trapNote: 'CrO₅ has two peroxide linkages (-O-O-), so its oxidation state is +6, never +10!',
      },
      {
        id: 'chem-redox-2',
        code: '8.2',
        title: 'Types of Redox Reactions',
        coreConcepts: ['Combination, Decomposition, Displacement reactions', 'Disproportionation reactions (same element simultaneously oxidized and reduced, e.g. H₂O₂, Cl₂ + NaOH)'],
      },
      {
        id: 'chem-redox-3',
        code: '8.3',
        title: 'Balancing Redox: Ion-Electron Method (Half-Reaction)',
        highYield: true,
        coreConcepts: ['Step-by-step balancing in acidic medium (balance O with H₂O, H with H⁺, charge with e⁻)', 'Balancing in basic medium (add OH⁻ equal to H⁺ to both sides)'],
      },
      {
        id: 'chem-redox-4',
        code: '8.4',
        title: 'Electrochemical Cells & Standard Electrode Potential',
        highYield: true,
        coreConcepts: ['Daniell cell (Zn|Zn²⁺ || Cu²⁺|Cu)', 'E°_{cell} = E°_{cathode} - E°_{anode}', 'Electrochemical series: lower reduction potential means stronger reducing agent (Li is strongest reducing agent in aqueous medium)'],
        keyFormula: 'E^\circ_{cell} = E^\circ_{cathode} - E^\circ_{anode}',
      },
    ],
  },

  'chem-organic': {
    chapterId: 'chem-organic',
    chapterTitle: 'Organic Chemistry: Basic Principles',
    subject: 'Chemistry',
    ncertBookChapterNo: 12,
    totalSubtopics: 6,
    subtopics: [
      {
        id: 'chem-organic-1',
        code: '12.1',
        title: 'IUPAC Nomenclature of Organic Compounds',
        highYield: true,
        coreConcepts: ['Longest chain rule, lowest locant rule', 'Priority order of principal functional groups: -COOH > -SO₃H > -COOR > -COCl > -CONH₂ > -CN > -CHO > >C=O > -OH > -NH₂ > C=C > C≡C', 'Naming polyfunctional compounds and aromatic derivatives'],
        trapNote: 'Carboxylic acid (-COOH) always takes highest priority (carbon #1) in IUPAC names.',
      },
      {
        id: 'chem-organic-2',
        code: '12.2',
        title: 'Isomerism: Structural & Introduction to Stereoisomerism',
        highYield: true,
        coreConcepts: ['Chain, Position, Functional, Metamerism, Tautomerism (Keto-Enol equilibrium)', 'Geometrical isomerism (cis-trans, conditions for restricted rotation)'],
      },
      {
        id: 'chem-organic-3',
        code: '12.3',
        title: 'Reaction Intermediates: Carbocations, Carbanions, Free Radicals',
        highYield: true,
        coreConcepts: ['Homolytic vs Heterolytic fission', 'Carbocation stability: 3° > 2° > 1° > CH₃⁺ (hyperconjugation + inductive effect)', 'Carbanion stability: CH₃⁻ > 1° > 2° > 3°', 'Electrophiles vs Nucleophiles'],
      },
      {
        id: 'chem-organic-4',
        code: '12.4',
        title: 'Inductive (+I, -I) & Electromeric (E) Effects',
        highYield: true,
        coreConcepts: ['Permanent polarization through σ bonds, diminishes with distance', '-I order: -NO₂ > -CN > -COOH > -F > -Cl > -Br > -I > -OH', '+I order: -C(CH₃)₃ > -CH(CH₃)₂ > -CH₂CH₃ > -CH₃', 'Acidity comparison of haloacetic acids'],
      },
      {
        id: 'chem-organic-5',
        code: '12.5',
        title: 'Resonance / Mesomeric (+M, -M) & Hyperconjugation',
        highYield: true,
        coreConcepts: ['Rules for writing resonance contributors & stability of resonating structures', '+M groups donate lone pair (OH, OR, NH₂, halogen)', '-M groups withdraw electrons (NO₂, CN, CHO, COOH)', 'Hyperconjugation (no-bond resonance): Baker-Nathan effect, depends on number of α-hydrogens'],
        trapNote: 'Halogens exhibit -I > +M (inductive dominates resonance for reactivity, but +M dictates ortho/para orientation).',
      },
      {
        id: 'chem-organic-6',
        code: '12.6',
        title: 'Purification & Quantitative Elemental Analysis',
        coreConcepts: ['Crystallization, Sublimation, Distillation (Fractional, Steam, Vacuum)', 'Chromatography (Thin-Layer, Column)', 'Lassaigne\'s test for N, S, Halogens', 'Dumas and Kjeldahl method for Nitrogen estimation', 'Carius method for Halogens and Sulfur'],
      },
    ],
  },

  'chem-hydrocarbons': {
    chapterId: 'chem-hydrocarbons',
    chapterTitle: 'Hydrocarbons',
    subject: 'Chemistry',
    ncertBookChapterNo: 13,
    totalSubtopics: 6,
    subtopics: [
      {
        id: 'chem-hydrocarbons-1',
        code: '13.1',
        title: 'Alkanes: Conformations & Free Radical Halogenation',
        highYield: true,
        coreConcepts: ['Sawhorse and Newman projections of Ethane: Staggered is more stable than Eclipsed by 12.5 kJ/mol (torsional strain)', 'Wurtz reaction: 2 R-X + 2 Na → R-R (not suitable for odd carbon alkanes)', 'Free radical chlorination mechanism (Initiation, Propagation, Termination)'],
        keyFormula: '2 R-X + 2 Na --(dry ether)--> R-R + 2 NaX',
      },
      {
        id: 'chem-hydrocarbons-2',
        code: '13.2',
        title: 'Alkenes: Preparation & Geometrical Isomerism',
        highYield: true,
        coreConcepts: ['Dehydrohalogenation of alkyl halides: Saytzeff (Zaitsev) rule (more substituted alkene is major)', 'Acid-catalyzed dehydration of alcohols', 'Cis vs Trans physical properties (Cis has higher dipole and boiling point; Trans has higher melting point due to symmetry)'],
      },
      {
        id: 'chem-hydrocarbons-3',
        code: '13.3',
        title: 'Alkene Reactions: Markovnikov Rule & Peroxide Effect',
        highYield: true,
        coreConcepts: ['Electrophilic addition of HX: Markovnikov rule (H adds to carbon with more H)', 'Peroxide effect (Kharasch effect): Anti-Markovnikov addition of HBr ONLY (does not work for HCl or HI due to endothermic propagation steps)', 'Ozonolysis of alkenes: Reductive cleavage using O₃ / Zn-H₂O to locate double bond position'],
        trapNote: 'The peroxide effect (anti-Markovnikov) is ONLY observed with HBr, NEVER with HCl or HI.',
      },
      {
        id: 'chem-hydrocarbons-4',
        code: '13.4',
        title: 'Alkynes: Acidity of Terminal Alkynes & Hydration',
        highYield: true,
        coreConcepts: ['Acidic nature of terminal alkynes: HC≡CH reacts with Na or NaNH₂ (50% s-character in sp carbon stabilizes carbanion)', 'Hydration with 20% H₂SO₄ + 1% HgSO₄: Ethyne gives Acetaldehyde, all other alkynes give Ketones'],
      },
      {
        id: 'chem-hydrocarbons-5',
        code: '13.5',
        title: 'Aromaticity & Hückel\'s (4n + 2) π-Electron Rule',
        highYield: true,
        coreConcepts: ['Conditions for aromaticity: Planar, Cyclic, Completely conjugated, (4n + 2) π electrons', 'Anti-aromatic: 4n π electrons (highly unstable)', 'Examples: Benzene, Cyclopentadienyl anion, Tropylium cation'],
        keyFormula: '\text{Aromatic } \implies (4n + 2)\pi \text{ electrons}, \quad \text{Anti-aromatic } \implies 4n\pi',
      },
      {
        id: 'chem-hydrocarbons-6',
        code: '13.6',
        title: 'Electrophilic Aromatic Substitution (EAS) in Benzene',
        highYield: true,
        coreConcepts: ['Mechanism of Nitration (HNO₃ + H₂SO₄ generates NO₂⁺ electrophile)', 'Halogenation (FeCl₃ + Cl₂ generates Cl⁺)', 'Friedel-Crafts Alkylation (RCl + AlCl₃, prone to carbocation rearrangement) & Acylation (RCOCl + AlCl₃, no rearrangement)', 'Activating & o/p directing (-OH, -NH₂, -CH₃) vs Deactivating & m-directing (-NO₂, -COOH, -CHO)'],
      },
    ],
  },

  // ==================== MATHEMATICS ====================
  'math-straight': {
    chapterId: 'math-straight',
    chapterTitle: 'Straight Lines',
    subject: 'Mathematics',
    ncertBookChapterNo: 10,
    totalSubtopics: 6,
    subtopics: [
      {
        id: 'math-straight-1',
        code: '10.1',
        title: 'Slope of a Line & Angle Between Two Lines',
        highYield: true,
        coreConcepts: ['Slope m = tan θ = (y₂ - y₁) / (x₂ - x₁)', 'Parallel lines: m₁ = m₂', 'Perpendicular lines: m₁ m₂ = -1', 'Angle tan θ = |(m₂ - m₁) / (1 + m₁ m₂)|'],
        keyFormula: 'm_1 m_2 = -1 \quad (\perp), \quad \tan\theta = \left|\frac{m_2 - m_1}{1 + m_1 m_2}\right|',
      },
      {
        id: 'math-straight-2',
        code: '10.2',
        title: 'Forms of Equations of a Line',
        highYield: true,
        coreConcepts: ['Slope-intercept form: y = mx + c', 'Point-slope form: y - y₁ = m(x - x₁)', 'Two-point form: y - y₁ = ((y₂ - y₁)/(x₂ - x₁))(x - x₁)', 'Intercept form: x/a + y/b = 1', 'Normal form: x cos ω + y sin ω = p'],
        keyFormula: '\frac{x}{a} + \frac{y}{b} = 1, \quad x\cos\omega + y\sin\omega = p',
      },
      {
        id: 'math-straight-3',
        code: '10.3',
        title: 'General Equation of Line & Reduction to Standard Forms',
        coreConcepts: ['Ax + By + C = 0 has slope m = -A/B, x-intercept = -C/A, y-intercept = -C/B'],
      },
      {
        id: 'math-straight-4',
        code: '10.4',
        title: 'Distance of a Point from a Line',
        highYield: true,
        coreConcepts: ['Perpendicular distance d = |Ax₁ + By₁ + C| / √(A² + B²)', 'Distance from origin: d = |C| / √(A² + B²)'],
        keyFormula: 'd = \frac{|Ax_1 + By_1 + C|}{\sqrt{A^2 + B^2}}',
      },
      {
        id: 'math-straight-5',
        code: '10.5',
        title: 'Distance Between Parallel Lines',
        highYield: true,
        coreConcepts: ['Lines Ax + By + C₁ = 0 and Ax + By + C₂ = 0: d = |C₁ - C₂| / √(A² + B²)'],
        keyFormula: 'd = \frac{|C_1 - C_2|}{\sqrt{A^2 + B^2}}',
        trapNote: 'Make sure the coefficients of x and y are identical in both equations before taking |C₁ - C₂|!',
      },
      {
        id: 'math-straight-6',
        code: '10.6',
        title: 'Family of Lines & Intersection Point',
        coreConcepts: ['Equation of family passing through intersection of L₁ and L₂: L₁ + λ L₂ = 0'],
      },
    ],
  },

  'math-conic': {
    chapterId: 'math-conic',
    chapterTitle: 'Conic Sections',
    subject: 'Mathematics',
    ncertBookChapterNo: 11,
    totalSubtopics: 5,
    subtopics: [
      {
        id: 'math-conic-1',
        code: '11.1',
        title: 'Circle: Standard & General Equations',
        highYield: true,
        coreConcepts: ['Standard form: (x - h)² + (y - k)² = r²', 'General form: x² + y² + 2gx + 2fy + c = 0 with Centre (-g, -f) and Radius r = √(g² + f² - c)', 'Parametric equations: x = h + r cos θ, y = k + r sin θ'],
        keyFormula: 'r = \sqrt{g^2 + f^2 - c}, \quad \text{Centre: } (-g, -f)',
      },
      {
        id: 'math-conic-2',
        code: '11.2',
        title: 'Parabola: 4 Standard Forms & Parameters',
        highYield: true,
        coreConcepts: ['y² = 4ax (Focus (a, 0), Directrix x = -a, Latus Rectum = 4a)', 'y² = -4ax, x² = 4ay, x² = -4ay', 'Eccentricity e = 1', 'Focal distance of point (x₁, y₁) on y² = 4ax is (x₁ + a)'],
        keyFormula: 'y^2 = 4ax \implies \text{Focus: } (a, 0), \text{ LR: } 4a',
      },
      {
        id: 'math-conic-3',
        code: '11.3',
        title: 'Ellipse: Horizontal & Vertical Equations',
        highYield: true,
        coreConcepts: ['x²/a² + y²/b² = 1 (a > b)', 'Eccentricity e = √(1 - b²/a²) < 1', 'Foci (±ae, 0), Directrices x = ±a/e', 'Length of Latus Rectum = 2b²/a', 'Sum of focal distances SP + S\'P = 2a'],
        keyFormula: 'b^2 = a^2(1 - e^2), \quad \text{Length of LR} = \frac{2b^2}{a}',
      },
      {
        id: 'math-conic-4',
        code: '11.4',
        title: 'Hyperbola: Standard & Conjugate',
        highYield: true,
        coreConcepts: ['x²/a² - y²/b² = 1', 'Eccentricity e = √(1 + b²/a²) > 1', 'Foci (±ae, 0), Directrices x = ±a/e', 'Length of Latus Rectum = 2b²/a', 'Difference of focal distances |SP - S\'P| = 2a', 'Rectangular hyperbola: a = b, e = √2'],
        keyFormula: 'b^2 = a^2(e^2 - 1), \quad e = \sqrt{1 + \frac{b^2}{a^2}}',
      },
      {
        id: 'math-conic-5',
        code: '11.5',
        title: 'Conic Identification by Eccentricity (e)',
        highYield: true,
        coreConcepts: ['e = 0 (Circle), e = 1 (Parabola), 0 < e < 1 (Ellipse), e > 1 (Hyperbola)'],
      },
    ],
  },

  'math-limits': {
    chapterId: 'math-limits',
    chapterTitle: 'Limits & Derivatives',
    subject: 'Mathematics',
    ncertBookChapterNo: 13,
    totalSubtopics: 6,
    subtopics: [
      {
        id: 'math-limits-1',
        code: '13.1',
        title: 'Concept of Limit & Left/Right Hand Limits',
        highYield: true,
        coreConcepts: ['Limit exists if and only if LHL = RHL = finite', 'Evaluating limits involving [x], |x|, sgn(x)'],
      },
      {
        id: 'math-limits-2',
        code: '13.2',
        title: 'Algebra of Limits & Indeterminate Forms',
        highYield: true,
        coreConcepts: ['Indeterminate forms (0/0, ∞/∞, 0 × ∞, ∞ - ∞)', 'Factoring and rationalization methods', 'Standard algebraic limit: lim_{x→a} (xⁿ - aⁿ)/(x - a) = n aⁿ⁻¹'],
        keyFormula: '\lim_{x \to a}\frac{x^n - a^n}{x - a} = n a^{n-1}',
      },
      {
        id: 'math-limits-3',
        code: '13.3',
        title: 'Trigonometric Limits & Sandwich Theorem',
        highYield: true,
        coreConcepts: ['lim_{x→0} (sin x)/x = 1 (x in radians)', 'lim_{x→0} (tan x)/x = 1', 'lim_{x→0} (1 - cos x)/x² = ½'],
        keyFormula: '\lim_{x \to 0}\frac{\sin x}{x} = 1, \quad \lim_{x \to 0}\frac{1 - \cos x}{x^2} = \frac{1}{2}',
        trapNote: 'lim_{x→0} (sin x)/x = 1 is true ONLY when x is measured in radians. If in degrees, answer is π/180.',
      },
      {
        id: 'math-limits-4',
        code: '13.4',
        title: 'Exponential & Logarithmic Limits',
        highYield: true,
        coreConcepts: ['lim_{x→0} (eˣ - 1)/x = 1', 'lim_{x→0} (aˣ - 1)/x = ln a', 'lim_{x→0} ln(1 + x)/x = 1'],
        keyFormula: '\lim_{x \to 0}\frac{e^x - 1}{x} = 1, \quad \lim_{x \to 0}\frac{\ln(1+x)}{x} = 1',
      },
      {
        id: 'math-limits-5',
        code: '13.5',
        title: 'Derivative by First Principle',
        highYield: true,
        coreConcepts: ['Definition: f\'(x) = lim_{h→0} [f(x + h) - f(x)] / h', 'Deriving derivatives of sin x, cos x, xⁿ, eˣ from first principle'],
        keyFormula: 'f\'(x) = \lim_{h \to 0}\frac{f(x+h) - f(x)}{h}',
      },
      {
        id: 'math-limits-6',
        code: '13.6',
        title: 'Rules of Differentiation (Product & Quotient Rules)',
        highYield: true,
        coreConcepts: ['Product rule: (uv)\' = u\'v + uv\'', 'Quotient rule: (u/v)\' = (u\'v - uv\') / v²', 'Standard formulas for d/dx(xⁿ), d/dx(sin x), d/dx(cos x), d/dx(tan x), d/dx(sec x)'],
        keyFormula: '\left(\frac{u}{v}\right)\' = \frac{u\'v - uv\'}{v^2}',
      },
    ],
  },
};

// Storage helper for tracking cleared subtopics
const STORAGE_CLEARED_SUBTOPICS = 'backlogos_cleared_subtopics_v1';

export function readClearedSubtopics(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_CLEARED_SUBTOPICS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveClearedSubtopic(chapterId: string, subtopicId: string, isCleared: boolean): Record<string, string[]> {
  try {
    const data = readClearedSubtopics();
    const current = data[chapterId] || [];
    const updated = isCleared
      ? Array.from(new Set([...current, subtopicId]))
      : current.filter((id) => id !== subtopicId);
    data[chapterId] = updated;
    localStorage.setItem(STORAGE_CLEARED_SUBTOPICS, JSON.stringify(data));
    return data;
  } catch {
    return {};
  }
}

import { MASTER_ADDITIONAL_CHAPTERS, synthesizeSubtopicsFromCurriculum } from './curriculum/master-mindmap-database';

// Helper function to get subtopics for any chapter id (with intelligent curriculum fallback)
export function getChapterSubtopics(chapterId: string, chapterTitle?: string, subject?: string): NCERTSubtopic[] {
  if (ncertSubtopicsData[chapterId]) {
    return ncertSubtopicsData[chapterId].subtopics;
  }

  if (MASTER_ADDITIONAL_CHAPTERS[chapterId]) {
    return MASTER_ADDITIONAL_CHAPTERS[chapterId].subtopics;
  }

  return synthesizeSubtopicsFromCurriculum(chapterId, chapterTitle, subject);
}
