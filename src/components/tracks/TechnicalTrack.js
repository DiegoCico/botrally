// src/components/tracks/TechnicalTrack.js
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

  // Smooth curve (closed)
  const curve = makeSmoothCurve(pts, { closed: true, smoothIter: 3, tension: 0.5 });

  // Build the ribbon road
  const road = buildRoad({ curve, width: 8, segments: 1600, closed: true, rails: true });
  const roadObj = road?.group ?? road;

  // --- Auto-lift so nothing goes under y=0 ---
  // Sample the curve densely to find the lowest point after smoothing
  const samples = 1024;
  let minY = Infinity;
  const p = new THREE.Vector3();
  for (let i = 0; i <= samples; i++) {
    curve.getPoint(i / samples, p);
    if (p.y < minY) minY = p.y;
  }
  const CLEARANCE = 0.06; // small gap above the ground to avoid z-fighting
  if (minY < CLEARANCE) {
    roadObj.position.y += (CLEARANCE - minY);
  }

  return road;
}
