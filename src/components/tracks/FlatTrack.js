// FlatTrack.js
import * as THREE from 'three';
import { buildRibbonRoad as buildRoad, makeSmoothCurve } from './TrackUtils';

export function buildFlatTrack({ closed = true } = {}) {
  const pts = [];
  const radiusX = 80, radiusZ = 50;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = Math.cos(a) * (radiusX + 6 * Math.sin(2 * a));
    const z = Math.sin(a) * (radiusZ + 4 * Math.cos(3 * a));
    pts.push(new THREE.Vector3(x, 0, z));
  }
  const curve = makeSmoothCurve(pts, { closed, smoothIter: 1, tension: 0.5 });
  return buildRoad({ curve, width: 10, segments: 1200, closed, rails: true });
}
