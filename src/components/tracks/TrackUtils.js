import * as THREE from 'three';

/**
 * Create a road mesh by extruding a rectangle shape along a 3D CatmullRom curve.
 */
export function buildRoad({
  curve,
  width = 8,
  thickness = 0.4,
  segments = 800,
  closed = true,
  rails = true,
  railHeight = 1.2,
  railRadius = 0.08,
} = {}) {
  const group = new THREE.Group();

  // Road geometry
  const halfW = width / 2;
  const roadShape = new THREE.Shape([
    new THREE.Vector2(-halfW, 0),
    new THREE.Vector2(halfW, 0),
    new THREE.Vector2(halfW, -thickness),
    new THREE.Vector2(-halfW, -thickness),
  ]);
  const extrudeSettings = { steps: segments, bevelEnabled: false, extrudePath: curve };
  const roadGeom = new THREE.ExtrudeGeometry(roadShape, extrudeSettings);
  const road = new THREE.Mesh(
    roadGeom,
    new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.9 })
  );
  road.receiveShadow = true;
  group.add(road);

  // Center dashed line
  const linePoints = curve.getSpacedPoints(segments);
  const lineGeom = new THREE.BufferGeometry().setFromPoints(
    linePoints.map(p => new THREE.Vector3(p.x, p.y + 0.01, p.z))
  );
  const lineMat = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 4, gapSize: 3 });
  const centerLine = new THREE.Line(lineGeom, lineMat);
  centerLine.computeLineDistances();
  group.add(centerLine);

  // Guard rails
  if (rails) {
    const frames = curve.computeFrenetFrames(segments, closed);
    const leftPts = [], rightPts = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = curve.getPoint(t);
      const normal = frames.normals[i];
      const left = new THREE.Vector3().copy(p).addScaledVector(normal, halfW + 0.35);
      const right = new THREE.Vector3().copy(p).addScaledVector(normal, -(halfW + 0.35));
      left.y += railHeight;
      right.y += railHeight;
      leftPts.push(left);
      rightPts.push(right);
    }
    const leftCurve = new THREE.CatmullRomCurve3(leftPts, closed);
    const rightCurve = new THREE.CatmullRomCurve3(rightPts, closed);
    const railMat = new THREE.MeshStandardMaterial({ color: 0xbfbfbf, metalness: 0.4 });
    group.add(new THREE.Mesh(new THREE.TubeGeometry(leftCurve, segments, railRadius, 8, closed), railMat));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(rightCurve, segments, railRadius, 8, closed), railMat));
  }

  return { group, road, curve };
}

export function addLightsAndGround(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x111122, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(60, 120, 80);
  dir.castShadow = true;
  scene.add(dir);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshStandardMaterial({ color: 0x0f3d0f })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
}
