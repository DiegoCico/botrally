// src/blocks/BlockTypes.js
export const BLOCK_TEMPLATES = {
    RULE: {
      type: 'RULE',
      label: 'Rule',
      // default condition and action
      data: { condition: 'f_min < 10', throttle: '0.2', steer: '(r_min - l_min) * 0.06' }
    },
    CONDITION: {
      type: 'CONDITION',
      label: 'Condition',
      data: { condition: 'f_min < 10' }
    },
    ACTION: {
      type: 'ACTION',
      label: 'Action',
      data: { throttle: '0.5', steer: '0' }
    },
    // helpers the user can drag as starting points
    AVOID: {
      type: 'RULE',
      label: 'Avoid Obstacle',
      data: { condition: 'f_min < 10', throttle: '0.2', steer: '(r_min - l_min) * 0.06' }
    },
    CRUISE: {
      type: 'RULE',
      label: 'Cruise',
      data: { condition: 'f_min >= 20', throttle: '1.0', steer: '(r_min - l_min) * 0.02' }
    },
    SLOW_ZONE: {
      type: 'RULE',
      label: 'Slow Zone',
      data: { condition: 'f_min >= 10 && f_min < 20', throttle: '0.6', steer: '(r_min - l_min) * 0.03' }
    }
  };
  
  // Simple ID helper
  export const uid = () => Math.random().toString(36).slice(2, 9);
  