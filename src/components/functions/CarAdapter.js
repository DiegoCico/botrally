// controls/CarAdapter.js
import * as THREE from 'three';

export class CarAdapter {
  constructor({ group, wheels }, {
    wheelBase = 2.7,     // distance between axles in model units
    track = 1.9,         // distance between left/right wheels (visual only)
    maxSteerRad = THREE.MathUtils.degToRad(30),
    tireRadius = 0.55,
  } = {}) {
    this.group = group;
    this.wheels = wheels;
    this.maxSteer = maxSteerRad;
    this.tireR = tireRadius;

    // state
    this.speed = 0;        // units/sec along +X in local space
    this.steer = 0;        // radians, + left
    this.wheelBase = wheelBase;

    // make small pivot groups so we can steer visuals around Y
    for (const key of ['FL','FR']) {
      const w = wheels[key];
      const pivot = new THREE.Group();
      w.parent.add(pivot);
      pivot.position.copy(w.position);
      pivot.add(w);
      w.position.set(0,0,0);
      this.wheels[key+'Pivot'] = pivot;
    }

    // helper vectors
    this._fwd = new THREE.Vector3(1,0,0);
    this._vel = new THREE.Vector3();
  }

  setControls({ throttle = 0, steer = 0 }) {
    // clamp to [-1,1]
    this.input = {
      throttle: Math.max(-1, Math.min(1, throttle)),
      steer:    Math.max(-1, Math.min(1, steer)),
    };
  }

  /** Simple kinematic bicycle + friction */
  tick(dt) {
    const ACCEL = 12;             // units/s^2
    const BRAKE = 18;
    const DRAG  = 1.6;            // linear drag
    const MAX_SPEED_FWD = 30;
    const MAX_SPEED_REV = 8;

    // throttle → target acceleration
    const t = this.input?.throttle ?? 0;
    let a = (t >= 0 ? ACCEL : BRAKE) * t;

    // integrate speed with drag
    const sign = Math.sign(this.speed || 1);
    this.speed += a * dt;
    this.speed -= DRAG * sign * dt;
    if (Math.abs(this.speed) < 0.02 && Math.abs(t) < 0.05) this.speed = 0;

    // clip max speeds
    const lim = (this.speed >= 0 ? MAX_SPEED_FWD : MAX_SPEED_REV);
    this.speed = THREE.MathUtils.clamp(this.speed, -lim, lim);

    // steering
    this.steer = (this.input?.steer ?? 0) * this.maxSteer;

    // bicycle model yaw rate
    const v = this.speed;
    if (Math.abs(v) > 1e-3) {
      const yawRate = (v / this.wheelBase) * Math.tan(this.steer); // rad/s
      this.group.rotateY(yawRate * dt);
    }

    // advance along local +X
    this._fwd.set(1,0,0).applyQuaternion(this.group.quaternion);
    this.group.position.addScaledVector(this._fwd, v * dt);

    // spin wheels (visual)
    const roll = (v * dt) / this.tireR;    // radians of spin around X
    for (const key of ['FL','FR','RL','RR']) {
      this.wheels[key].rotation.x += roll;
    }
    // steer visuals around Y (front pivots)
    this.wheels.FLPivot.rotation.y = this.steer;
    this.wheels.FRPivot.rotation.y = this.steer;
  }

  /** Approx scalar speed for sensors */
  getScalarSpeed() { return Math.abs(this.speed); }
  /** Unit forward vector in world space */
  getHeading(out=new THREE.Vector3()) {
    return out.set(1,0,0).applyQuaternion(this.group.quaternion).normalize();
  }
}
