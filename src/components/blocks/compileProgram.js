// src/blocks/compileProgram.js
/**
 * Compile canvas blocks → BlockRuntime program (first match wins).
 * Numeric-only: we convert dropdown+numbers to JS expressions under the hood.
 */
export function compileBlocksToProgram(blocks) {
  const rules = blocks.filter(b => b.type === 'RULE');

  return rules.map(r => {
    const c = r.data.cond || {};
    const a = r.data.act || {};

    // Build condition expression
    let lhs;
    if (c.always) {
      lhs = 'true';
    } else {
      const sensorVar = sideMetricToVar(c.sensor, c.metric); // e.g., 'f_min'
      const val = isFinite(c.value) ? Number(c.value) : -999999;
      lhs = `${sensorVar} ${c.op || '<'} ${val}`;
    }

    // Build action expression
    // Throttle target: 0..1 (forward). (We keep reverse out of UI for simplicity; can add later.)
    const throttleExpr = clamp01(a.accel ?? 0).toFixed(3);

    // Steer: based on turn dir
    let steerExpr = '0';
    const steerAmt = clamp01(a.steer ?? 0).toFixed(3);
    switch (a.turn) {
      case 'left':  steerExpr = `+${steerAmt}`; break;
      case 'right': steerExpr = `-${steerAmt}`; break;
      case 'auto':  // steer toward freer side: (r_min - l_min) normalized by ~range
        steerExpr = `( (r_min - l_min) * ${Number(steerAmt) / 20} )`;
        break;
      default: steerExpr = '0';
    }

    return {
      if: lhs,
      then: { throttle: throttleExpr, steer: steerExpr }
    };
  });
}

function sideMetricToVar(side='forward', metric='min') {
  if (side === 'left')  return metric === 'avg' ? 'l_avg' : 'l_min';
  if (side === 'right') return metric === 'avg' ? 'r_avg' : 'r_min';
  // forward
  return metric === 'avg' ? 'f_avg' : 'f_min';
}

const clamp01 = (x) => Math.max(0, Math.min(1, Number(x || 0)));
