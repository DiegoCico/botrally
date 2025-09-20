// Enhanced Block Compiler for Scratch-like System
/**
 * Compile canvas blocks → BlockRuntime program.
 * Supports multiple block types and execution models.
 */

export function compileBlocksToProgram(blocks) {
  // Group blocks by execution context
  const eventBlocks = blocks.filter(b => b.type === 'EVENTS');
  const ruleBlocks = blocks.filter(b => b.type === 'RULE');
  const motionBlocks = blocks.filter(b => b.type === 'MOTION');
  
  // For now, compile to the existing rule-based system
  // TODO: Implement full event-driven execution
  
  const compiledRules = [];
  
  // Compile legacy RULE blocks
  ruleBlocks.forEach(r => {
    const rule = compileRuleBlock(r);
    if (rule) compiledRules.push(rule);
  });
  
  // Compile MOTION blocks as simple rules
  motionBlocks.forEach(m => {
    const rule = compileMotionBlock(m);
    if (rule) compiledRules.push(rule);
  });
  
  // Compile SENSING blocks as conditions
  // (These are typically used within other blocks)
  
  return compiledRules;
}

function compileRuleBlock(block) {
  const c = block.data.cond || {};
  const a = block.data.act || {};

  // Build condition expression
  let lhs;
  if (c.always) {
    lhs = 'true';
  } else {
    const sensorVar = sideMetricToVar(c.sensor, c.metric);
    const val = isFinite(c.value) ? Number(c.value) : -999999;
    lhs = `${sensorVar} ${c.op || '<'} ${val}`;
  }

  // Build action expression
  const throttleExpr = clamp01(a.accel ?? 0).toFixed(3);

  let steerExpr = '0';
  const steerAmt = clamp01(a.steer ?? 0).toFixed(3);
  switch (a.turn) {
    case 'left':  steerExpr = `+${steerAmt}`; break;
    case 'right': steerExpr = `-${steerAmt}`; break;
    case 'auto':  
      steerExpr = `( (r_min - l_min) * ${Number(steerAmt) / 20} )`;
      break;
    default: steerExpr = '0';
  }

  return {
    if: lhs,
    then: { throttle: throttleExpr, steer: steerExpr }
  };
}

function compileMotionBlock(block) {
  const data = block.data;
  
  switch (block.blockType) {
    case 'MOVE_FORWARD':
      return {
        if: 'true',
        then: { 
          throttle: clamp01(data.speed ?? 0.8).toFixed(3), 
          steer: '0' 
        }
      };
      
    case 'SET_SPEED':
      return {
        if: 'true',
        then: { 
          throttle: clamp01(data.speed ?? 0.5).toFixed(3), 
          steer: '0' 
        }
      };
      
    case 'TURN_LEFT':
      return {
        if: 'true',
        then: { 
          throttle: '0.3', 
          steer: clamp01(data.angle / 90 ?? 0.2).toFixed(3)
        }
      };
      
    case 'TURN_RIGHT':
      return {
        if: 'true',
        then: { 
          throttle: '0.3', 
          steer: (-clamp01(data.angle / 90 ?? 0.2)).toFixed(3)
        }
      };
      
    case 'BRAKE':
      return {
        if: 'true',
        then: { 
          throttle: '0', 
          steer: '0' 
        }
      };
      
    case 'STEER_TO':
      return {
        if: 'true',
        then: { 
          throttle: '0.5', 
          steer: clamp(-1, 1, data.direction ?? 0).toFixed(3)
        }
      };
      
    default:
      return null;
  }
}

function compileSensingBlock(block) {
  const data = block.data;
  
  switch (block.blockType) {
    case 'DISTANCE_SENSOR':
      return sideMetricToVar(data.side, data.metric);
      
    case 'SPEED_SENSOR':
      return 'speed';
      
    case 'WALL_DETECTED':
      const sensorVar = sideMetricToVar(data.side, 'min');
      return `${sensorVar} < ${data.threshold ?? 10}`;
      
    case 'PATH_CLEAR':
      const pathVar = sideMetricToVar(data.side, 'min');
      return `${pathVar} >= ${data.distance ?? 15}`;
      
    default:
      return 'true';
  }
}

function compileLogicBlock(block) {
  const data = block.data;
  
  switch (block.blockType) {
    case 'COMPARE':
      return `${data.left ?? 0} ${data.op ?? '>'} ${data.right ?? 0}`;
      
    case 'AND':
      return `(${data.left ?? 'true'}) && (${data.right ?? 'true'})`;
      
    case 'OR':
      return `(${data.left ?? 'false'}) || (${data.right ?? 'false'})`;
      
    case 'NOT':
      return `!(${data.condition ?? 'false'})`;
      
    default:
      return 'true';
  }
}

function sideMetricToVar(side = 'forward', metric = 'min') {
  if (side === 'left') return metric === 'avg' ? 'l_avg' : metric === 'max' ? 'l_max' : 'l_min';
  if (side === 'right') return metric === 'avg' ? 'r_avg' : metric === 'max' ? 'r_max' : 'r_min';
  if (side === 'back') return metric === 'avg' ? 'b_avg' : metric === 'max' ? 'b_max' : 'b_min';
  // forward
  return metric === 'avg' ? 'f_avg' : metric === 'max' ? 'f_max' : 'f_min';
}

const clamp01 = (x) => Math.max(0, Math.min(1, Number(x || 0)));
const clamp = (min, max, x) => Math.max(min, Math.min(max, Number(x || 0)));
