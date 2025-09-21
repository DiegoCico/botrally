// src/components/car/LowPolyCar.js
import * as THREE from 'three';

/* ----------------------------- Spoilers ----------------------------- */
function createDucktailSpoiler(materials) {
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 1.4), materials.body);
  spoiler.position.set(-0.1, 0.1, 0);
  spoiler.rotation.z = THREE.MathUtils.degToRad(-15);
  spoiler.userData.tag = 'body';
  return spoiler;
}

function createGtWingSpoiler(materials) {
  const wing = new THREE.Group();
  const uprightL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), materials.trim);
  uprightL.position.set(-0.2, 0.15, 0.5);
  const uprightR = uprightL.clone(); uprightR.position.z = -0.5;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 1.5), materials.body);
  blade.position.set(-0.3, 0.3, 0);
  blade.rotation.z = THREE.MathUtils.degToRad(-5);
  blade.userData.tag = 'body';
  wing.add(uprightL, uprightR, blade);
  return wing;
}

/* --------------------------- Wheel Helpers --------------------------- */
function makeBrakeSet(radius = 0.34, thickness = 0.06) {
  const grp = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, thickness, 28),
    new THREE.MeshStandardMaterial({ color: 0xb9bec6, roughness: 0.35, metalness: 0.85 })
  );
  disc.rotation.x = Math.PI / 2;
  grp.add(disc);

  const caliper = new THREE.Mesh(
    new THREE.BoxGeometry(thickness * 0.9, radius * 0.55, thickness * 1.4),
    new THREE.MeshStandardMaterial({ color: 0xd11f3a, roughness: 0.6, metalness: 0.1 })
  );
  caliper.position.y = radius * 0.15;
  grp.add(caliper);
  return grp;
}

function makeBeadlockRing(outerR, bolts = 16) {
  const ring = new THREE.Group();
  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(outerR * 0.98, outerR * 0.07, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0x202328, roughness: 0.85, metalness: 0.15 })
  );
  lip.rotation.x = Math.PI / 2;
  ring.add(lip);

  const boltMat = new THREE.MeshStandardMaterial({ color: 0xd0d4da, roughness: 0.35, metalness: 0.9 });
  for (let i = 0; i < bolts; i++) {
    const a = (i / bolts) * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 8), boltMat);
    bolt.position.set(Math.cos(a) * (outerR * 0.86), Math.sin(a) * (outerR * 0.86), 0.03);
    bolt.rotation.x = Math.PI / 2;
    ring.add(bolt);
  }
  return ring;
}

function makeMultiSpokeRim(rimR, width, materials, spokes = 10) {
  const grp = new THREE.Group();
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(rimR * 0.2, rimR * 0.2, width * 0.9, 16),
    materials.rim
  );
  grp.add(hub);

  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.1, rimR * 0.85, width * 0.08),
      materials.rim
    );
    spoke.position.y = (rimR * 0.85) / 2;
    const holder = new THREE.Group();
    holder.rotation.z = a;
    holder.add(spoke);
    grp.add(holder);
  }

  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(rimR, rimR, width * 0.2, 40, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x101215, roughness: 0.95, metalness: 0.05 })
  );
  grp.add(outer);
  return grp;
}

function makeHexRim(rimR, width) {
  const grp = new THREE.Group();
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(rimR * 0.25, rimR * 0.25, width, 12),
    new THREE.MeshStandardMaterial({ color: 0x2a2e33, roughness: 0.7, metalness: 0.25 })
  );
  grp.add(hub);

  const sides = 6;
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.22, rimR * 0.9, width * 0.22),
      new THREE.MeshStandardMaterial({ color: 0x2a2e33, roughness: 0.7, metalness: 0.25 })
    );
    spoke.position.y = (rimR * 0.9) / 2;
    const holder = new THREE.Group();
    holder.rotation.z = a;
    holder.add(spoke);
    grp.add(holder);
  }

  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(rimR, rimR, width * 0.5, 6, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.95, metalness: 0.05 })
  );
  grp.add(outer);
  return grp;
}

function makeDishRim(rimR, width) {
  const grp = new THREE.Group();
  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(rimR * 0.98, rimR * 0.98, width * 0.2, 40),
    new THREE.MeshStandardMaterial({ color: 0xd7dadf, roughness: 0.3, metalness: 0.9 })
  );
  grp.add(dish);

  const star = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.10, rimR * 0.9, width * 0.08),
      new THREE.MeshStandardMaterial({ color: 0xb0b6bd, roughness: 0.4, metalness: 0.7 })
    );
    spoke.position.y = (rimR * 0.9) / 2;
    const holder = new THREE.Group();
    holder.rotation.z = a + Math.PI / 10;
    holder.add(spoke);
    star.add(holder);
  }
  grp.add(star);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(rimR * 0.18, rimR * 0.18, width * 0.4, 24),
    new THREE.MeshStandardMaterial({ color: 0x0f1114, roughness: 0.9 })
  );
  grp.add(cap);

  return grp;
}

/* ------------------------------ Wheels (NEW) ------------------------------ */
export function buildWheel(type = 'standard', materials, castShadow, receiveShadow) {
  const g = new THREE.Group();
  const setShadows = (obj) => obj.traverse?.((o) => {
    o.castShadow = castShadow;
    o.receiveShadow = receiveShadow;
  });

  if (type === 'offroad') {
    // Big tire with lugs + beadlock + hex rim
    const radius = 0.65, width = 0.45;
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 18), materials.tire);

    const blocks = 14;
    for (let i = 0; i < blocks; i++) {
      const a = (i / blocks) * Math.PI * 2;
      const lug = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.16, width * 0.9),
        new THREE.MeshStandardMaterial({ color: 0x171a1d, roughness: 1.0 })
      );
      lug.position.set(Math.cos(a) * (radius * 0.92), Math.sin(a) * (radius * 0.92), 0);
      lug.rotation.z = a + Math.PI / 2;
      tire.add(lug);
    }

    const rim = makeHexRim(radius * 0.55, width * 0.6);
    const beadlock = makeBeadlockRing(radius * 0.95, 16);
    const brakes = makeBrakeSet(radius * 0.42, 0.06);

    g.add(tire, rim, beadlock, brakes);

  } else if (type === 'slim') {
    // Thin performance tire + aero dish
    const radius = 0.58, width = 0.30;
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 36), materials.tire);
    const dish = makeDishRim(radius * 0.80, width * 0.9);
    const brakes = makeBrakeSet(radius * 0.40, 0.05);
    g.add(tire, dish, brakes);

  } else {
    // STANDARD: medium tire + multi-spoke sport rim
    const radius = 0.55, width = 0.35;
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 28), materials.tire);
    const rim = makeMultiSpokeRim(radius * 0.78, width * 0.9, materials, 12);
    const brakes = makeBrakeSet(radius * 0.38, 0.055);
    g.add(tire, rim, brakes);
  }

  g.rotation.x = Math.PI / 2;
  setShadows(g);
  return g;
}

/* ----------------------------- Car Builder ----------------------------- */
export function buildLowPolyCar({
  bodyColor   = 0xc0455e,
  trimColor   = 0x3b4556,
  glassColor  = 0x9fb4c6,
  tireColor   = 0x22262b,
  rimColor    = 0xcfd6dd,
  scale       = 1.0,
  spoilerType = 'none',
  wheelType   = 'standard',
  castShadow  = true,
  receiveShadow = true,
} = {}) {
  const group = new THREE.Group();
  group.name = 'LowPolyCar';
  group.scale.setScalar(scale);

  const materials = {
    body:  new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8, metalness: 0.05 }),
    trim:  new THREE.MeshStandardMaterial({ color: trimColor, roughness: 1.0 }),
    glass: new THREE.MeshStandardMaterial({ color: glassColor, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.9 }),
    tire:  new THREE.MeshStandardMaterial({ color: tireColor, roughness: 1.0 }),
    rim:   new THREE.MeshStandardMaterial({ color: rimColor, roughness: 0.5, metalness: 0.25 }),
    // Neon look (emissive only)
    headlight: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0xb5f3ff),
      emissiveIntensity: 3.0,
      roughness: 0.6
    }),
    taillight: new THREE.MeshStandardMaterial({
      color: 0xaa3333,
      emissive: new THREE.Color(0xff2222),
      emissiveIntensity: 3.0,
      roughness: 0.7
    }),
  };

  const add = (mesh, tag) => {
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    if (tag) mesh.userData.tag = tag;
    group.add(mesh);
    return mesh;
  };

  // Body
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.6, 1.9), materials.trim);
  chassis.position.set(0, 0.55, 0); add(chassis, 'trim');

  const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.9, 1.7), materials.body);
  body.position.set(0, 1.2, 0); add(body, 'body');

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.6), materials.body);
  hood.position.set(1.0, 1.0, 0);
  hood.rotation.z = THREE.MathUtils.degToRad(-5); add(hood, 'body');

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 1.5), materials.body);
  roof.position.set(-0.4, 1.55, 0);
  roof.rotation.z = THREE.MathUtils.degToRad(5); add(roof, 'body');

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 1.5), materials.glass);
  windshield.position.set(0.45, 1.45, 0);
  windshield.rotation.z = THREE.MathUtils.degToRad(-18); add(windshield, 'glass');

  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 1.3), materials.glass);
  rearGlass.position.set(-1.2, 1.5, 0);
  rearGlass.rotation.z = THREE.MathUtils.degToRad(18); add(rearGlass, 'glass');

  const sideGlassL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.05), materials.glass);
  sideGlassL.position.set(-0.25, 1.45, 0.83); add(sideGlassL, 'glass');
  const sideGlassR = sideGlassL.clone(); sideGlassR.position.z = -0.83; add(sideGlassR, 'glass');

  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 1.9), materials.trim);
  bumperF.position.set(1.9, 0.8, 0); add(bumperF, 'trim');

  const bumperR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 1.9), materials.trim);
  bumperR.position.set(-1.9, 0.8, 0); add(bumperR, 'trim');

  const skirts = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.35, 2.0), materials.trim);
  skirts.position.set(0, 0.8, 0); add(skirts, 'trim');

  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 1.7), materials.body);
  trunk.position.set(-1.7, 1.1, 0); add(trunk, 'body');

  // Neon lights (blocks only)
  const headL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.25), materials.headlight);
  headL.position.set(2.1, 0.95, 0.6); add(headL, 'light');
  const headR = headL.clone(); headR.position.z = -0.6; add(headR, 'light');

  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.25), materials.taillight);
  tailL.position.set(-2.1, 0.95, 0.6); add(tailL, 'light');
  const tailR = tailL.clone(); tailR.position.z = -0.6; add(tailR, 'light');

  // Spoiler container
  const spoilerContainer = new THREE.Group();
  spoilerContainer.name = 'SpoilerContainer';
  spoilerContainer.position.set(-1.8, 1.35, 0);
  group.add(spoilerContainer);

  // Wheels
  const wheelFL = buildWheel(wheelType, materials, castShadow, receiveShadow); wheelFL.position.set( 1.35, 0.55,  0.95);
  const wheelFR = buildWheel(wheelType, materials, castShadow, receiveShadow); wheelFR.position.set( 1.35, 0.55, -0.95);
  const wheelRL = buildWheel(wheelType, materials, castShadow, receiveShadow); wheelRL.position.set(-1.35, 0.55,  0.95);
  const wheelRR = buildWheel(wheelType, materials, castShadow, receiveShadow); wheelRR.position.set(-1.35, 0.55, -0.95);
  const wheels = { FL: wheelFL, FR: wheelFR, RL: wheelRL, RR: wheelRR };
  group.add(wheelFL, wheelFR, wheelRL, wheelRR);

  // API
  function setSpoilerType(type) {
    spoilerContainer.clear();
    let model = null;
    if (type === 'ducktail') model = createDucktailSpoiler(materials);
    else if (type === 'gtwing') model = createGtWingSpoiler(materials);
    if (model) spoilerContainer.add(model);
  }

  function setWheelType(type) {
    Object.keys(wheels).forEach((k) => {
      const oldW = wheels[k];
      const nw = buildWheel(type, materials, castShadow, receiveShadow);
      nw.position.copy(oldW.position);
      group.remove(oldW);
      group.add(nw);
      wheels[k] = nw;
    });
  }

  setSpoilerType(spoilerType);

  return { group, materials, wheels, setSpoilerType, setWheelType };
}

/* ----------------------------- Fit on Ground ----------------------------- */
export function fitCarOnGround(group) {
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3(), center = new THREE.Vector3();
  box.getSize(size); box.getCenter(center);
  group.position.y += (size.y / 2) - (box.min.y);
  group.position.x -= center.x;
  group.position.z -= center.z;
}
