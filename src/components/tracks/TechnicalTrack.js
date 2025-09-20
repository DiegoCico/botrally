// TechnicalTrack.js
import * as THREE from 'three';
import { buildRibbonRoad as buildRoad, makeSmoothCurve } from './TrackUtils';

export function buildTechnicalTrack({ closed = true } = {}) {
  const pts = [];
  const push = (x, y, z) => pts.push(new THREE.Vector3(x, y, z));

  // Intentional hairpins/chicanes; smoothing will round them just enough
  push(-100, 6, 0);  push(-60, 6, 0);
  push(-40, 8, 20);  push(-30, 10, 40);
  push(-10, 12, 55); push(20, 10, 40);
  push(35, 6, 0);    push(50, 2, -10);
  push(70, -2, 0);   push(85, -4, 15);
  push(70, -6, 35);  push(50, -4, 45);
  push(20, 2, 55);   push(0, 8, 45);
  push(-20, 12, 25); push(-55, 6, -10);
  push(-95, 4, -10);

  const curve = makeSmoothCurve(pts, { closed: true, smoothIter: 3, tension: 0.5 });
  return buildRoad({ curve, width: 8, segments: 1600, closed: true, rails: true });
}
