// src/components/tracks/TrackUtils.js
import * as THREE from 'three';

/* ----------------------------- Smoothing Utils ----------------------------- */

/** Chaikin corner-cutting: rounds sharp corners (2–3 iterations is plenty). */
export function chaikinSmooth(points, iterations = 2) {
  let pts = points.slice();
  for (let it = 0; it < iterations; it++) {
    const next = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      next.push(new THREE.Vector3(
        0.75 * p.x + 0.25 * q.x,
        0.75 * p.y + 0.25 * q.y,
        0.75 * p.z + 0.25 * q.z
      ));
      next.push(new THREE.Vector3(
        0.25 * p.x + 0.75 * q.x,
        0.25 * p.y + 0.75 * q.y,
        0.25 * p.z + 0.75 * q.z
      ));
    }
    pts = next;
  }
  return pts;
}

/** Build a centripetal Catmull–Rom curve that avoids overshoot on tight bends. */
export function makeSmoothCurve(points, { closed = true, smoothIter = 2, tension = 0.5 } = {}) {
    // Do NOT duplicate the first point for closed curves; CatmullRom handles wrapping.
    const base = closed ? points : points;
    const smoothed = chaikinSmooth(base, smoothIter);
    return new THREE.CatmullRomCurve3(smoothed, closed, 'centripetal', tension);
  }
  

/* ------------------------------ Road Builder ------------------------------- */

/**
 * Build a flat ribbon road along a 3D curve (no Frenet twist).
 * Also adds: dashed center line, **side walls/barricades**, and optional
 * start/end blocking bars.
 *
 * Returns: { group, mesh, curve, walls: { left, right }, blockers?: { start, end } }
 */
export function buildRibbonRoad({
  curve,                 // THREE.Curve (e.g., CatmullRomCurve3)
  width = 10,
  segments = 1000,
  color = 0x2b2b2b,
  closed = true,
  // Decorations
  rails = false,         // keep false if you prefer walls only
  railHeight = 1.2,
  railRadius = 0.08,
  // Side barricade walls (continuous)
  walls = true,
  wallHeight = 2.0,
  wallThickness = 0.12,  // visual thickness for the vertical plane (not physics)
  // Start/End blockers (physical bars across the track)
  startEndBlockers = true,
  blockerHeight = 2.0,
  blockerThickness = 0.6,
  blockerColor = 0xaa0000,
} = {}) {
  const group = new THREE.Group();

  const halfW = width / 2;
  const up = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const side = new THREE.Vector3();

  /* ---- Top ribbon (two strips: left/right) ---- */
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices = new Uint32Array(segments * 2 * 3);

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    curve.getPoint(u, p);
    curve.getTangent(u, t).normalize();

    side.crossVectors(up, t).normalize();
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);

    const left = new THREE.Vector3().copy(p).addScaledVector(side, -halfW);
    const right = new THREE.Vector3().copy(p).addScaledVector(side, halfW);

    const base = i * 2 * 3;
    positions[base + 0] = left.x;  positions[base + 1] = left.y;  positions[base + 2] = left.z;
    positions[base + 3] = right.x; positions[base + 4] = right.y; positions[base + 5] = right.z;

    const vBase = i * 2 * 2;
    uvs[vBase + 0] = 0; uvs[vBase + 1] = u * 50;
    uvs[vBase + 2] = 1; uvs[vBase + 3] = u * 50;
  }

  let idx = 0;
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices[idx++] = a; indices[idx++] = b; indices[idx++] = d;
    indices[idx++] = a; indices[idx++] = d; indices[idx++] = c;
  }

  const roadGeom = new THREE.BufferGeometry();
  roadGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  roadGeom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  roadGeom.setIndex(new THREE.BufferAttribute(indices, 1));
  roadGeom.computeVertexNormals();

  const roadMat = new THREE.MeshStandardMaterial({
    color, roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(roadGeom, roadMat);
  mesh.receiveShadow = true;
  group.add(mesh);

  /* ---- Center dashed line (slightly lifted to avoid z-fighting) ---- */
  const linePts = curve.getSpacedPoints(segments).map(pt => new THREE.Vector3(pt.x, pt.y + 0.03, pt.z));
  const lineGeom = new THREE.BufferGeometry().setFromPoints(linePts);
  const lineMat = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 4, gapSize: 3 });
  const centerLine = new THREE.Line(lineGeom, lineMat);
  centerLine.computeLineDistances();
  group.add(centerLine);

  /* ---- Side walls (continuous barricades) ---- */
  let wallLeft = null, wallRight = null;

  if (walls) {
    const buildVerticalWall = (edgePts) => {
      // Build a vertical strip: bottom at edgePts, top at edgePts + (0, wallHeight, 0)
      const n = edgePts.length;
      const pos = new Float32Array(n * 2 * 3);
      const idxs = new Uint32Array((n - 1) * 2 * 3);
      for (let i = 0; i < n; i++) {
        const a = edgePts[i];
        const b = new THREE.Vector3(a.x, a.y + wallHeight, a.z);
        const base = i * 2 * 3;
        pos[base + 0] = a.x; pos[base + 1] = a.y; pos[base + 2] = a.z;
        pos[base + 3] = b.x; pos[base + 4] = b.y; pos[base + 5] = b.z;
      }
      let k = 0;
      for (let i = 0; i < n - 1; i++) {
        const A = i * 2, B = A + 1, C = A + 2, D = A + 3;
        // A-B-D and A-D-C (two triangles)
        idxs[k++] = A; idxs[k++] = B; idxs[k++] = D;
        idxs[k++] = A; idxs[k++] = D; idxs[k++] = C;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setIndex(new THREE.BufferAttribute(idxs, 1));
      g.computeVertexNormals();

      return new THREE.Mesh(
        g,
        new THREE.MeshStandardMaterial({
          color: 0x3c3c3c,
          roughness: 0.9,
          metalness: 0.0,
          side: THREE.DoubleSide
        })
      );
    };

    const leftPts = [], rightPts = [];
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      curve.getPoint(u, p);
      curve.getTangent(u, t).normalize();
      side.crossVectors(up, t).normalize();
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0);

      const l = new THREE.Vector3().copy(p).addScaledVector(side, -halfW - wallThickness);
      const r = new THREE.Vector3().copy(p).addScaledVector(side, halfW + wallThickness);
      leftPts.push(l); rightPts.push(r);
    }

    wallLeft = buildVerticalWall(leftPts);
    wallRight = buildVerticalWall(rightPts);
    wallLeft.castShadow = wallRight.castShadow = true;
    group.add(wallLeft, wallRight);
  }

  /* ---- Optional guard rails (metal tubes) ---- */
  if (rails) {
    const leftRailPts = [], rightRailPts = [];
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      curve.getPoint(u, p);
      curve.getTangent(u, t).normalize();
      side.crossVectors(up, t).normalize();
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0);

      const l = new THREE.Vector3().copy(p).addScaledVector(side, -halfW - 0.35);
      const r = new THREE.Vector3().copy(p).addScaledVector(side, halfW + 0.35);
      l.y += railHeight; r.y += railHeight;
      leftRailPts.push(l); rightRailPts.push(r);
    }
    const leftCurve = new THREE.CatmullRomCurve3(leftRailPts, closed, 'centripetal', 0.5);
    const rightCurve = new THREE.CatmullRomCurve3(rightRailPts, closed, 'centripetal', 0.5);
    const railMat = new THREE.MeshStandardMaterial({ color: 0xbfbfbf, metalness: 0.4, roughness: 0.6 });
    const railL = new THREE.Mesh(new THREE.TubeGeometry(leftCurve, segments, railRadius, 8, closed), railMat);
    const railR = new THREE.Mesh(new THREE.TubeGeometry(rightCurve, segments, railRadius, 8, closed), railMat);
    railL.castShadow = railR.castShadow = true;
    group.add(railL, railR);
  }

  /* ---- Start/End blocking barricades ---- */
  let blockerStart = null, blockerEnd = null;
  if (startEndBlockers) {
    const makeBlocker = (u) => {
      curve.getPoint(u, p);
      curve.getTangent(u, t).normalize();
      // Side vector points across the track; align the bar with it
      side.crossVectors(up, t).normalize();
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0);

      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(width, blockerHeight, blockerThickness),
        new THREE.MeshStandardMaterial({ color: blockerColor, roughness: 0.7, metalness: 0.1 })
      );

      bar.position.copy(p).addScaledVector(up, blockerHeight / 2); // sit on road
      // Orient X axis to match "side" direction across the track
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), side);
      bar.setRotationFromQuaternion(q);
      bar.castShadow = true;
      return bar;
    };

    blockerStart = makeBlocker(0);
    group.add(blockerStart);

    if (!closed) {
      blockerEnd = makeBlocker(1);
      group.add(blockerEnd);
    }
  }

  return {
    group,
    mesh,
    curve,
    walls: walls ? { left: wallLeft, right: wallRight } : undefined,
    blockers: startEndBlockers ? { start: blockerStart, end: blockerEnd } : undefined,
  };
}

/* ----------------------- Quick lights + ground helper ---------------------- */

export function addLightsAndGround(
    scene,
    {
      groundColor = 0x0f3d0f,   // ← default kept (green), override from caller to 0x000000
      groundSize  = 4000,
      hemiIntensity = 0.6,
      dirIntensity  = 0.9
    } = {}
  ) {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x111122, hemiIntensity);
    scene.add(hemi);
  
    const dir = new THREE.DirectionalLight(0xffffff, dirIntensity);
    dir.position.set(60, 120, 80);
    dir.castShadow = true;
    scene.add(dir);
  
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(groundSize, groundSize),
      new THREE.MeshStandardMaterial({ color: groundColor, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
  
    return { hemi, dir, ground };
  }
  
