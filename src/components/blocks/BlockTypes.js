// src/blocks/BlockTypes.js
export const SensorSide = ['forward', 'left', 'right'];
export const Metric = ['min', 'avg'];
export const Op = ['<', '<=', '>', '>='];
export const TurnDir = ['none', 'left', 'right'];

export const BLOCK_TEMPLATES = {
  RULE_GENERIC: {
    type: 'RULE',
    label: 'If sensor then act',
    data: {
      cond: { sensor: 'forward', metric: 'min', op: '<', value: 10 },
      act:  { accel: 0.6, turn: 'none', steer: 0.0 }  // accel: 0..1 (− is brake if needed later)
    }
  },
  RULE_ALWAYS: {
    type: 'RULE',
    label: 'Always do',
    data: {
      cond: { sensor: 'forward', metric: 'min', op: '>=', value: -Infinity, always: true },
      act:  { accel: 0.5, turn: 'none', steer: 0.0 }
    }
  },
  PRESET_AVOID: {
    type: 'RULE',
    label: 'Avoid obstacle',
    data: {
      cond: { sensor: 'forward', metric: 'min', op: '<', value: 10 },
      act:  { accel: 0.2, turn: 'auto', steer: 0.6 } // auto = choose freer side
    }
  },
  PRESET_CRUISE: {
    type: 'RULE',
    label: 'Cruise (open road)',
    data: {
      cond: { sensor: 'forward', metric: 'min', op: '>=', value: 20 },
      act:  { accel: 1.0, turn: 'none', steer: 0.0 }
    }
  },
  PRESET_BRAKE: {
    type: 'RULE',
    label: 'Brake if too close',
    data: {
      cond: { sensor: 'forward', metric: 'min', op: '<', value: 6 },
      act:  { accel: 0.0, turn: 'none', steer: 0.0 }
    }
  },
  PRESET_NUDGE_LEFT: {
    type: 'RULE',
    label: 'Nudge left when right is tighter',
    data: {
      cond: { sensor: 'right', metric: 'min', op: '<', value: 8 },
      act:  { accel: 0.5, turn: 'left', steer: 0.4 }
    }
  },
  PRESET_NUDGE_RIGHT: {
    type: 'RULE',
    label: 'Nudge right when left is tighter',
    data: {
      cond: { sensor: 'left', metric: 'min', op: '<', value: 8 },
      act:  { accel: 0.5, turn: 'right', steer: 0.4 }
    }
  }
};

// simple ids for canvas blocks
export const uid = () => Math.random().toString(36).slice(2, 9);
