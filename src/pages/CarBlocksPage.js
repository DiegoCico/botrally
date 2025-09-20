// src/pages/CarBlocksPage.js
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { buildLowPolyCar } from '../components/car/LowPolyCar';
import { CarAdapter } from '../components/functions/CarAdapter';
import { SensorRig } from '../components/functions/SensorRig';
import { BlockRuntime } from '../components/functions/BlockRuntime';
import BlockWorkbench from '../components/blocks/BlockWorkbench';
import { SafetyLimiter } from '../components/blocks/SafetyLimiter';

export default function CarBlocksPage() {
  const mountRef = useRef(null);
  const rafRef = useRef(0);

  const [runtime, setRuntime] = useState(() => new BlockRuntime([
    { if: 'f_min < 10', then: { throttle: '0.2', steer: '(r_min - l_min) * 0.06' } },
    { if: 'f_min >= 10 && f_min < 20', then: { throttle: '0.6', steer: '(r_min - l_min) * 0.03' } },
    { if: 'f_min >= 20', then: { throttle: '1.0', steer: '(r_min - l_min) * 0.02' } }
  ]));

  const handleProgramCompiled = (program) => {
    setRuntime(new BlockRuntime(program));
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Scene + Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x16181e);

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 500);
    camera.position.set(16, 10, 16);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lights
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(12, 18, 8);
    sun.castShadow = true;
    scene.add(sun);

    // Ground + simple obstacles
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0x3b3f49 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const obstacles = [];
    for (let i = 0; i < 8; i++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(2, 1, 2),
        new THREE.MeshStandardMaterial({ color: 0x854444 })
      );
      box.position.set((Math.random() - 0.5) * 60, 0.5, (Math.random() - 0.5) * 60);
      box.castShadow = true;
      box.receiveShadow = true;
      scene.add(box);
      obstacles.push(box);
    }
    const colliders = [ground, ...obstacles];

    // Car
    const { group, wheels } = buildLowPolyCar({ scale: 0.5, wheelType: 'sporty' });
    group.position.set(0, 0.55, 0);
    group.castShadow = true;
    scene.add(group);

    // Adapter + Specs (per-car)
    const car = new CarAdapter({ group, wheels }, { wheelBase: 2.7, tireRadius: 0.55, maxSteerRad: THREE.MathUtils.degToRad(30) });
    const carSpecs = { maxSpeedFwd: 28, maxSpeedRev: 7, maxAccel: 12, maxBrake: 18 };
    const limiter = new SafetyLimiter({ adapter: car, carSpecs });

    const sensors = new SensorRig(group, { rayLength: 35 });

    const clock = new THREE.Clock();

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    const loop = () => {
      const dt = clock.getDelta();
      controls.update();

      const sensorData = sensors.sample(colliders);
      const desired = runtime.step({ sensors: sensorData, speed: car.getScalarSpeed() });
      const safe = limiter.filterControls(desired, car.getScalarSpeed());

      car.setControls(safe);
      car.tick(dt);

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [runtime]);

  return (
    <div style={{ display: 'grid', gridTemplateRows: '1fr 360px', height: '100vh' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <BlockWorkbench onProgramCompiled={handleProgramCompiled} />
    </div>
  );
}
