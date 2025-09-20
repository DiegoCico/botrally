import * as THREE from 'three';
import { buildRoad } from './TrackUtils.js';

/**
 * Technical track: sharp curves + altitude swings.
 */
export function buildTechnicalTrack({ closed = true } = {}) {
  const pts = [];
  const push = (x, y, z) => pts.push(new THREE.Vector3(x, y, z));

  push(-100, 6, 0); push(-60, 6, 0);
  push(-40, 8, 20); push(-30, 10, 40);
  push(-10, 12, 55); push(20, 10, 40);
  push(35, 6, 0); push(50, 2, -10);
  push(70, -2, 0); push(85, -4, 15);
  push(50, -4, 45); push(20, 2, 55);
  push(0, 8, 45); push(-20, 12, 25);
  push(-55, 6, -10); push(-95, 4, -10);

  const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.06);
  return buildRoad({ curve, width: 8, thickness: 0.42, segments: 1400, closed });
}
