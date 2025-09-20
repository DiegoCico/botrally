// HillyTrack.js
import * as THREE from 'three';
import { buildRibbonRoad as buildRoad, makeSmoothCurve } from './TrackUtils';

export function buildHillyTrack({ closed = true } = {}) {
  const pts = [];
  const radiusX = 90, radiusZ = 60;
  for (let i = 0; i < 18; i++) {
    const t = i / 18;
    const a = t * Math.PI * 2;
    const x = Math.cos(a) * (radiusX + 10 * Math.sin(3 * t * Math.PI * 2));
    const z = Math.sin(a) * (radiusZ + 8 * Math.cos(2 * t * Math.PI * 2));
    const y = 8 * Math.sin(a * 1.5) + 4 * Math.sin(3 * a);
    pts.push(new THREE.Vector3(x, y, z));
  }
  const curve = makeSmoothCurve(pts, { closed, smoothIter: 2, tension: 0.5 });
  return buildRoad({ curve, width: 9, segments: 1500, closed, rails: true });
}
