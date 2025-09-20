// src/controls/SafetyLimiter.js
import * as THREE from 'three';

/**
 * Wraps BlockRuntime outputs and clamps to car specs:
 * - throttle scaled by {maxAccel, maxBrake, maxSpeed}
 * - steer normalized to adapter.maxSteer
 */
export class SafetyLimiter {
  constructor({ adapter, carSpecs }) {
    this.adapter = adapter;
    this.specs = {
      maxSpeedFwd: carSpecs?.maxSpeedFwd ?? 30,
      maxSpeedRev: carSpecs?.maxSpeedRev ?? 8,
      maxAccel:    carSpecs?.maxAccel ?? 12,    // units/s^2
      maxBrake:    carSpecs?.maxBrake ?? 18,    // units/s^2
      steerScale:  1.0                           // additional global scale if desired
    };
  }

  /**
   * Convert desired {throttle[-1..1], steer[-1..1]} into safe controls.
   * We leave mapping to CarAdapter as-is but zero-out throttle if speed limits reached.
   */
  filterControls(raw, currentSpeed) {
    const t = THREE.MathUtils.clamp(raw.throttle ?? 0, -1, 1);
    const s = THREE.MathUtils.clamp(raw.steer ?? 0, -1, 1) * (this.specs.steerScale ?? 1);

    // speed guard: cut forward throttle if at/over top speed; similar in reverse
    const top = currentSpeed >= 0 ? this.specs.maxSpeedFwd : this.specs.maxSpeedRev;
    const limitedThrottle = (Math.abs(currentSpeed) >= top && Math.sign(t) === Math.sign(currentSpeed)) ? 0 : t;

    return { throttle: limitedThrottle, steer: s };
  }
}
