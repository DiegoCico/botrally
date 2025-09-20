// src/components/tracks/HillyTrack.js
import * as THREE from 'three';
import { buildRibbonRoad as buildRoad, makeSmoothCurve } from './TrackUtils';

export function buildHillyTrack({ closed = true } = {}) {
  // Parametric “hilly ellipse” with small radial ripples
  const pts = [];
  const N = 18;                 // base control points (then smoothed)
  const radiusX = 90, radiusZ = 60;

  for (let i = 0; i < N; i++) {
    const t = i / N;
    const a = t * Math.PI * 2;

    const rippleX = 10 * Math.sin(3 * a);
    const rippleZ =  8 * Math.cos(2 * a);

    const x = Math.cos(a) * (radiusX + rippleX);
    const z = Math.sin(a) * (radiusZ + rippleZ);

    // gentle hills; keep vertical range reasonable
    const y = 6 * Math.sin(1.5 * a) + 3 * Math.sin(3 * a);

    pts.push(new THREE.Vector3(x, y, z));
  }

  // Smooth centripetal Catmull-Rom (no endpoint duplication when closed)
  const curve = makeSmoothCurve(pts, { closed, smoothIter: 2, tension: 0.5 });

  // Build the road
  const width = 9;
  const segments = 1800;  // a bit more for cleaner walls/rails on curves
  const road = buildRoad({ curve, width, segments, closed, rails: true });
  const roadObj = road?.group ?? road;

  // ---- Auto-lift so the lowest point sits slightly above y=0 ----
  const samples = 1024;
  let minY = Infinity;
  const p = new THREE.Vector3();
  for (let i = 0; i <= samples; i++) {
    curve.getPoint(i / samples, p);
    if (p.y < minY) minY = p.y;
  }
  const CLEARANCE = 0.06; // tiny gap to avoid z-fighting with ground
  if (minY < CLEARANCE) {
    roadObj.position.y += (CLEARANCE - minY);
  }

  return road;
}
