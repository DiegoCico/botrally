import * as THREE from 'three';
import { buildRoad } from './TrackUtils.js';

/**
 * Flat track with flowing curves at y=0.
 */
export function buildFlatTrack({ closed = true } = {}) {
  const pts = [];
  const radiusX = 80, radiusZ = 50;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = Math.cos(a) * (radiusX + 6 * Math.sin(2 * a));
    const z = Math.sin(a) * (radiusZ + 4 * Math.cos(3 * a));
    pts.push(new THREE.Vector3(x, 0, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts, closed, 'catmullrom', 0.15);
  return buildRoad({ curve, width: 10, thickness: 0.35, segments: 900, closed });
}
