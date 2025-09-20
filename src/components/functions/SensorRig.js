// sensors/SensorRig.js
import * as THREE from 'three';

export class SensorRig {
  constructor(carGroup, {
    rayLength = 30,
    fanRaysPerSide = 3,
    fovDeg = 60,
    sideOffset = 0.9,
    debug = false,
  } = {}) {
    this.car = carGroup;
    this.rayLen = rayLength;
    this.n = Math.max(1, fanRaysPerSide);
    this.fov = THREE.MathUtils.degToRad(fovDeg);
    this.sideOffset = sideOffset;
    this.rc = new THREE.Raycaster();
    this.debug = debug;
    if (debug) this._buildDebug();
  }

  sample(colliders=[]) {
    const forward = this._fan(0, 0, colliders);
    const left    = this._fan(+this.sideOffset, +this.fov*0.5, colliders);
    const right   = this._fan(-this.sideOffset, -this.fov*0.5, colliders);
    return { forward, left, right };
  }

  _fan(xOffset, yawOffset, colliders) {
    const origin = new THREE.Vector3(xOffset, 0.7, 0)
      .applyMatrix4(this.car.matrixWorld);
    const baseDir = new THREE.Vector3(1,0,0)
      .applyQuaternion(this.car.quaternion)
      .applyAxisAngle(new THREE.Vector3(0,1,0), yawOffset);

    const hits = [];
    for (let i=0;i<this.n;i++){
      const t = (i/(this.n-1) - 0.5) || 0; // spread [-0.5,0.5]
      const dir = baseDir.clone()
        .applyAxisAngle(new THREE.Vector3(0,1,0), t*this.fov/2)
        .normalize();
      this.rc.set(origin, dir);
      const inter = this.rc.intersectObjects(colliders, true)[0];
      const dist = inter ? Math.min(inter.distance, this.rayLen) : this.rayLen;
      hits.push({ dist, point: inter?.point || null, normal: inter?.face?.normal || null });
      if (this.debug) this._drawRay(dir, origin, dist);
    }
    const min = Math.min(...hits.map(h=>h.dist));
    const avg = hits.reduce((s,h)=>s+h.dist,0)/hits.length;
    return { min, avg, hits };
  }

  _buildDebug(){
    this._rayGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1,0,0)]);
    this._rayMat = new THREE.LineBasicMaterial({ transparent:true, opacity:0.5 });
    this._rays = [];
    this._debugRoot = new THREE.Group();
    this.car.add(this._debugRoot);
  }
  _drawRay(dir, origin, dist){
    if (!this._rays) return;
    const line = new THREE.Line(this._rayGeom, this._rayMat.clone());
    line.position.copy(origin);
    line.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0), dir);
    line.scale.set(dist,1,1);
    this._debugRoot.add(line);
    this._rays.push(line);
    if (this._rays.length>80){
      const old=this._rays.shift(); old.parent?.remove(old); old.geometry.dispose(); old.material.dispose();
    }
  }
}
