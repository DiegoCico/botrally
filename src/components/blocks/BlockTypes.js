// Enhanced Scratch-like Block System
export const SensorSide = ['forward', 'left', 'right', 'back'];
export const Metric = ['min', 'avg', 'max'];
export const Op = ['<', '<=', '>', '>=', '==', '!='];
export const TurnDir = ['none', 'left', 'right', 'auto'];
export const LogicOp = ['and', 'or', 'not'];

// Block Categories (Scratch-like)
export const CATEGORIES = {
  MOTION: { name: 'Motion', color: '#4C97FF', border: '#3373CC' },
  SENSING: { name: 'Sensing', color: '#5CB3CC', border: '#2E8EB8' },
  CONTROL: { name: 'Control', color: '#FFAB19', border: '#CF8B17' },
  LOGIC: { name: 'Logic', color: '#5CB712', border: '#389438' },
  VARIABLES: { name: 'Variables', color: '#FF8C1A', border: '#DB6E00' },
  EVENTS: { name: 'Events', color: '#FFD500', border: '#CC9900' }
};

export const BLOCK_TEMPLATES = {
  // MOTION BLOCKS
  MOVE_FORWARD: {
    type: 'MOTION',
    category: 'MOTION',
    label: 'Move forward',
    shape: 'stack',
    data: { speed: 0.8, duration: 1.0 }
  },
  SET_SPEED: {
    type: 'MOTION',
    category: 'MOTION', 
    label: 'Set speed to',
    shape: 'stack',
    data: { speed: 0.5 }
  },
  TURN_LEFT: {
    type: 'MOTION',
    category: 'MOTION',
    label: 'Turn left',
    shape: 'stack',
    data: { angle: 15, duration: 0.5 }
  },
  TURN_RIGHT: {
    type: 'MOTION',
    category: 'MOTION',
    label: 'Turn right', 
    shape: 'stack',
    data: { angle: 15, duration: 0.5 }
  },
  BRAKE: {
    type: 'MOTION',
    category: 'MOTION',
    label: 'Brake',
    shape: 'stack',
    data: { force: 0.8 }
  },
  STEER_TO: {
    type: 'MOTION',
    category: 'MOTION',
    label: 'Steer to',
    shape: 'stack',
    data: { direction: 0.0 }
  },

  // SENSING BLOCKS
  DISTANCE_SENSOR: {
    type: 'SENSING',
    category: 'SENSING',
    label: 'Distance',
    shape: 'reporter',
    data: { side: 'forward', metric: 'min' }
  },
  SPEED_SENSOR: {
    type: 'SENSING',
    category: 'SENSING', 
    label: 'Current speed',
    shape: 'reporter',
    data: {}
  },
  WALL_DETECTED: {
    type: 'SENSING',
    category: 'SENSING',
    label: 'Wall detected?',
    shape: 'boolean',
    data: { side: 'forward', threshold: 10 }
  },
  PATH_CLEAR: {
    type: 'SENSING',
    category: 'SENSING',
    label: 'Path clear?',
    shape: 'boolean', 
    data: { side: 'forward', distance: 15 }
  },
  COMPARE_DISTANCES: {
    type: 'SENSING',
    category: 'SENSING',
    label: 'Left vs Right',
    shape: 'reporter',
    data: {}
  },

  // CONTROL BLOCKS
  IF_THEN: {
    type: 'CONTROL',
    category: 'CONTROL',
    label: 'If then',
    shape: 'c-block',
    data: { condition: null, actions: [] }
  },
  IF_ELSE: {
    type: 'CONTROL',
    category: 'CONTROL',
    label: 'If else',
    shape: 'c-block',
    data: { condition: null, ifActions: [], elseActions: [] }
  },
  REPEAT: {
    type: 'CONTROL',
    category: 'CONTROL',
    label: 'Repeat',
    shape: 'c-block',
    data: { times: 10, actions: [] }
  },
  FOREVER: {
    type: 'CONTROL',
    category: 'CONTROL',
    label: 'Forever',
    shape: 'c-block',
    data: { actions: [] }
  },
  WAIT: {
    type: 'CONTROL',
    category: 'CONTROL',
    label: 'Wait',
    shape: 'stack',
    data: { seconds: 1.0 }
  },
  STOP: {
    type: 'CONTROL',
    category: 'CONTROL',
    label: 'Stop all',
    shape: 'cap',
    data: {}
  },

  // LOGIC BLOCKS
  COMPARE: {
    type: 'LOGIC',
    category: 'LOGIC',
    label: 'Compare',
    shape: 'boolean',
    data: { left: 0, op: '>', right: 0 }
  },
  AND: {
    type: 'LOGIC',
    category: 'LOGIC',
    label: 'And',
    shape: 'boolean',
    data: { left: null, right: null }
  },
  OR: {
    type: 'LOGIC',
    category: 'LOGIC',
    label: 'Or',
    shape: 'boolean',
    data: { left: null, right: null }
  },
  NOT: {
    type: 'LOGIC',
    category: 'LOGIC',
    label: 'Not',
    shape: 'boolean',
    data: { condition: null }
  },

  // VARIABLES BLOCKS
  SET_VARIABLE: {
    type: 'VARIABLES',
    category: 'VARIABLES',
    label: 'Set variable',
    shape: 'stack',
    data: { name: 'my variable', value: 0 }
  },
  GET_VARIABLE: {
    type: 'VARIABLES',
    category: 'VARIABLES',
    label: 'Get variable',
    shape: 'reporter',
    data: { name: 'my variable' }
  },
  CHANGE_VARIABLE: {
    type: 'VARIABLES',
    category: 'VARIABLES',
    label: 'Change variable by',
    shape: 'stack',
    data: { name: 'my variable', change: 1 }
  },

  // EVENT BLOCKS
  WHEN_STARTED: {
    type: 'EVENTS',
    category: 'EVENTS',
    label: 'When started',
    shape: 'hat',
    data: {}
  },
  WHEN_WALL_HIT: {
    type: 'EVENTS',
    category: 'EVENTS',
    label: 'When wall detected',
    shape: 'hat',
    data: { side: 'forward', threshold: 5 }
  },
  WHEN_SPEED_CHANGES: {
    type: 'EVENTS',
    category: 'EVENTS',
    label: 'When speed >',
    shape: 'hat',
    data: { threshold: 0.5 }
  },

  // LEGACY RULE BLOCKS (for backward compatibility)
  RULE_GENERIC: {
    type: 'RULE',
    category: 'CONTROL',
    label: 'If sensor then act',
    shape: 'stack',
    data: {
      cond: { sensor: 'forward', metric: 'min', op: '<', value: 10 },
      act: { accel: 0.6, turn: 'none', steer: 0.0 }
    }
  },
  RULE_ALWAYS: {
    type: 'RULE', 
    category: 'CONTROL',
    label: 'Always do',
    shape: 'stack',
    data: {
      cond: { sensor: 'forward', metric: 'min', op: '>=', value: -Infinity, always: true },
      act: { accel: 0.5, turn: 'none', steer: 0.0 }
    }
  }
};

// Block shapes define visual appearance and connection points
export const BLOCK_SHAPES = {
  stack: { // Regular command blocks that stack vertically
    hasNotch: true,
    hasBump: true,
    height: 32
  },
  reporter: { // Oval blocks that return values
    hasNotch: false,
    hasBump: false, 
    height: 24,
    rounded: true
  },
  boolean: { // Hexagonal blocks for true/false values
    hasNotch: false,
    hasBump: false,
    height: 24,
    hexagon: true
  },
  'c-block': { // C-shaped blocks that contain other blocks
    hasNotch: true,
    hasBump: true,
    height: 64,
    hasInner: true
  },
  hat: { // Top blocks that start scripts
    hasNotch: false,
    hasBump: true,
    height: 32,
    rounded: true
  },
  cap: { // Bottom blocks that end scripts
    hasNotch: true,
    hasBump: false,
    height: 32
  }
};

// Utility functions
export const uid = () => Math.random().toString(36).slice(2, 9);

export const getBlockCategory = (blockType) => {
  const template = BLOCK_TEMPLATES[blockType];
  return template ? CATEGORIES[template.category] : CATEGORIES.CONTROL;
};

export const getBlockShape = (blockType) => {
  const template = BLOCK_TEMPLATES[blockType];
  return template ? BLOCK_SHAPES[template.shape] : BLOCK_SHAPES.stack;
};
