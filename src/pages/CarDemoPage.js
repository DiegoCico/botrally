import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { buildLowPolyCar } from '../components/car/LowPolyCar';
import { CarAdapter } from '../components/functions/CarAdapter';
import { SensorRig } from '../components/functions/SensorRig';
import { BlockRuntime } from '../components/functions/BlockRuntime';

export default function CarDemoPage() {
  const mountRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // --- Scene & Camera ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x20232a);

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth/container.clientHeight, 0.1, 500);
    camera.position.set(15, 10, 15);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);

    // --- Lights ---
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // --- Ground ---
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshPhongMaterial({ color: 0x555555, depthWrite: true })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // --- Car setup ---
    const { group, wheels } = buildLowPolyCar({ scale: 0.5, wheelType: 'sporty' });
    group.position.set(0, 0.55, 0);
    scene.add(group);

    const car = new CarAdapter({ group, wheels });
    const sensors = new SensorRig(group, { rayLength: 35 });
    const brain = new BlockRuntime([
      { if: 'f_min < 10', then: { throttle: '0.2', steer: '(r_min - l_min) * 0.06' } },
      { if: 'f_min >= 10 && f_min < 20', then: { throttle: '0.6', steer: '(r_min - l_min) * 0.03' } },
      { if: 'f_min >= 20', then: { throttle: '1.0', steer: '(r_min - l_min) * 0.02' } },
    ]);

    const clock = new THREE.Clock();

    // --- Loop ---
    const tick = () => {
      const dt = clock.getDelta();
      const sensorData = sensors.sample([ground]);
      const controls = brain.step({ sensors: sensorData, speed: car.getScalarSpeed() });
      car.setControls(controls);
      car.tick(dt);

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(rafRef.current);
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height: '100vh' }} />;
}
