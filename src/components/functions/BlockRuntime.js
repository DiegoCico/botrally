// blocks/BlockRuntime.js
/** Minimal runtime that evaluates a list of rules in order. */
export class BlockRuntime {
    constructor(program=[]) { this.program = program; }
  
    /** ctx: { sensors, speed } → { throttle, steer } */
    step(ctx){
      for (const rule of this.program){
        if (this._match(rule.if, ctx)) return this._action(rule.then, ctx);
      }
      return { throttle: 0, steer: 0 }; // default idle
    }
  
    _match(cond, { sensors, speed }){
      if (!cond) return true;
      const v = {
        f_min: sensors.forward.min,
        l_min: sensors.left.min,
        r_min: sensors.right.min,
        f_avg: sensors.forward.avg,
        speed,
      };
      // supports comparisons like "f_min < 10 && r_min > l_min"
      try { return Function('f_min','l_min','r_min','f_avg','speed', `return (${cond});`)
        (v.f_min,v.l_min,v.r_min,v.f_avg,v.speed); }
      catch { return false; }
    }
  
    _action(act, { sensors, speed }){
      if (!act) return { throttle:0, steer:0 };
      const evalNum = (expr, def=0) => {
        if (typeof expr === 'number') return expr;
        try {
          return Function('f_min','l_min','r_min','f_avg','speed', `return (${expr});`)
            (sensors.forward.min, sensors.left.min, sensors.right.min, sensors.forward.avg, speed);
        } catch { return def; }
      };
      return {
        throttle: Math.max(-1, Math.min(1, evalNum(act.throttle, 0)) ),
        steer:    Math.max(-1, Math.min(1, evalNum(act.steer, 0)) ),
      };
    }
  }
  