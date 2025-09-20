import * as THREE from 'three';

// --- Spoiler builders (No changes here) ---
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
  const uprightR = uprightL.clone();
  uprightR.position.z = -0.5;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 1.5), materials.body);
  blade.position.set(-0.3, 0.3, 0);
  blade.rotation.z = THREE.MathUtils.degToRad(-5);
  blade.userData.tag = 'body';
  wing.add(uprightL, uprightR, blade);
  return wing;
}

export function buildWheel(materials, type = 'default') {
    let radius = 0.55, width = 0.35;

    if (type === 'sporty') {
      radius = 0.5;
      width = 0.25;
    } else if (type === 'offroad') {
      radius = 0.65;
      width = 0.45;
    }

    const gTire = new THREE.CylinderGeometry(radius, radius, width, 18);
    const gRim  = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width * 1.02, 10);

    const tire = new THREE.Mesh(gTire, materials.tire);
    tire.rotation.x = Math.PI / 2;
    const rim = new THREE.Mesh(gRim, materials.rim);
    rim.rotation.x = Math.PI / 2;

    const w = new THREE.Group();
    w.add(tire, rim);
    return w;
  }

export function buildLowPolyCar({
  bodyColor   = 0xc0455e,
  trimColor   = 0x3b4556,
  glassColor  = 0x9fb4c6,
  lightColor  = 0xe9e5d8,
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
    light: new THREE.MeshStandardMaterial({ color: lightColor, roughness: 0.6 }),
    tire:  new THREE.MeshStandardMaterial({ color: tireColor, roughness: 1.0 }),
    rim:   new THREE.MeshStandardMaterial({ color: rimColor, roughness: 0.5, metalness: 0.2 }),
  };

  const add = (mesh, tag) => {
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    if (tag) mesh.userData.tag = tag;
    group.add(mesh);
    return mesh;
  };

  // --- Car Body (No changes here) ---
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.6, 1.9), materials.trim);
  chassis.position.set(0, 0.55, 0);
  add(chassis, 'trim');
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.9, 1.7), materials.body);
  body.position.set(0, 1.2, 0);
  add(body, 'body');
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.6), materials.body);
  hood.position.set(1.0, 1.0, 0);
  hood.rotation.z = THREE.MathUtils.degToRad(-5);
  add(hood, 'body');
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 1.5), materials.body);
  roof.position.set(-0.4, 1.55, 0);
  roof.rotation.z = THREE.MathUtils.degToRad(5);
  add(roof, 'body');
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 1.5), materials.glass);
  windshield.position.set(0.45, 1.45, 0);
  windshield.rotation.z = THREE.MathUtils.degToRad(-18);
  add(windshield, 'glass');
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 1.3), materials.glass);
  rearGlass.position.set(-1.2, 1.5, 0);
  rearGlass.rotation.z = THREE.MathUtils.degToRad(18);
  add(rearGlass, 'glass');
  const sideGlassL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.05), materials.glass);
  sideGlassL.position.set(-0.25, 1.45, 0.83);
  add(sideGlassL, 'glass');
  const sideGlassR = sideGlassL.clone();
  sideGlassR.position.z = -0.83;
  add(sideGlassR, 'glass');
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 1.9), materials.trim);
  bumperF.position.set(1.9, 0.8, 0);
  add(bumperF, 'trim');
  const bumperR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 1.9), materials.trim);
  bumperR.position.set(-1.9, 0.8, 0);
  add(bumperR, 'trim');
  const skirts = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.35, 2.0), materials.trim);
  skirts.position.set(0, 0.8, 0);
  add(skirts, 'trim');
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 1.7), materials.body);
  trunk.position.set(-1.7, 1.1, 0);
  add(trunk, 'body');
  const headL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.25), materials.light);
  headL.position.set(2.1, 0.95, 0.6);
  add(headL, 'light');
  const headR = headL.clone(); headR.position.z = -0.6; add(headR, 'light');
  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.25), new THREE.MeshStandardMaterial({ color: 0xaa3333, roughness: 0.7 }));
  tailL.position.set(-2.1, 0.95, 0.6);
  add(tailL, 'light');
  const tailR = tailL.clone(); tailR.position.z = -0.6; add(tailR, 'light');

  const spoilerContainer = new THREE.Group();
  spoilerContainer.name = 'SpoilerContainer';
  spoilerContainer.position.set(-1.8, 1.35, 0);
  group.add(spoilerContainer);
  
  // --- Wheels ---
  const wheelFL = buildWheel(wheelType); wheelFL.position.set(1.35, 0.55, 0.95);
  const wheelFR = buildWheel(wheelType); wheelFR.position.set(1.35, 0.55, -0.95);
  const wheelRL = buildWheel(wheelType); wheelRL.position.set(-1.35, 0.55, 0.95);
  const wheelRR = buildWheel(wheelType); wheelRR.position.set(-1.35, 0.55, -0.95);

  const wheels = { FL: wheelFL, FR: wheelFR, RL: wheelRL, RR: wheelRR };
  group.add(wheelFL, wheelFR, wheelRL, wheelRR);
  
  // --- API Functions ---
  function setBodyColor(color) {
    const c = new THREE.Color(color);
    group.traverse(o => {
      if (o.isMesh && o.userData.tag === 'body') o.material.color.copy(c);
    });
    materials.body.color.copy(c);
  }
  
  function setSpoilerType(type) {
    spoilerContainer.clear();
    let spoilerModel = null;
    if (type === 'ducktail') spoilerModel = createDucktailSpoiler(materials);
    else if (type === 'gtwing') spoilerModel = createGtWingSpoiler(materials);
    if (spoilerModel) spoilerContainer.add(spoilerModel);
  }

  // ✨ NEW function to dynamically change the wheels
  function setWheelType(type) {
    Object.keys(wheels).forEach(key => {
      const oldWheel = wheels[key];
      const newWheel = buildWheel(type, materials, castShadow, receiveShadow);
      newWheel.position.copy(oldWheel.position);
      group.remove(oldWheel);
      group.add(newWheel);
      wheels[key] = newWheel;
    });
  }

  setSpoilerType(spoilerType);

  // ✨ ADDED setWheelType to the return object
  return { group, materials, wheels, setBodyColor, setSpoilerType, setWheelType };
}


export function fitCarOnGround(group) {
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3(), center = new THREE.Vector3();
  box.getSize(size); box.getCenter(center);
  group.position.y += (size.y / 2) - (box.min.y);
  group.position.x -= center.x;
  group.position.z -= center.z;
}

