// src/pages/CarViewerPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { addLightsAndGround } from '../components/tracks/TrackUtils';
import { buildLowPolyCar } from '../components/car/LowPolyCar';

const COLORS = [
  { name: 'Crimson',  value: 0xc0455e },
  { name: 'Sky',      value: 0x3aa7ff },
  { name: 'Lime',     value: 0x73d13d },
  { name: 'Sunset',   value: 0xff884d },
  { name: 'Violet',   value: 0x8a7aff },
  { name: 'Pearl',    value: 0xdedede },
  { name: 'Jet Black',value: 0x111111 },
];

function CarViewerPage() {
  const mountRef = useRef(null);
  const rafRef = useRef(0);
  const controlsRef = useRef(null);
  const carApiRef = useRef(null);   // { group, setBodyColor, ... }
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // --- Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x88aadd);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(6.5, 4.0, 8.5);
    camera.lookAt(0, 1.1, 0);

    // Lights + ground (your helper)
    addLightsAndGround(scene);

    // Soft rim light
    const rim = new THREE.DirectionalLight(0xffffff, 0.25);
    rim.position.set(-6, 5, -6);
    scene.add(rim);

    // --- Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1.0, 0);
    controls.minDistance = 4;
    controls.maxDistance = 16;
    controls.maxPolarAngle = Math.PI * 0.49;
    controlsRef.current = controls;

    // --- Car
    const carApi = buildLowPolyCar({ bodyColor: COLORS[currentIndex].value, scale: 0.5 });
    carApiRef.current = carApi;
    scene.add(carApi.group);

    // Subtle turntable rotation for showcase
    const turntable = true;

    // --- Input: switch color with arrows
    const loadColor = (idx) => {
      setCurrentIndex(idx);
      if (carApiRef.current) {
        carApiRef.current.setBodyColor(COLORS[idx].value);
      }
    };

    const onKey = (e) => {
      if (e.key === 'ArrowRight') {
        const next = (currentIndex + 1) % COLORS.length;
        loadColor(next);
      } else if (e.key === 'ArrowLeft') {
        const prev = (currentIndex - 1 + COLORS.length) % COLORS.length;
        loadColor(prev);
      }
    };
    window.addEventListener('keydown', onKey);

    // --- Resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // --- Animate
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      if (turntable && carApiRef.current) {
        carApiRef.current.group.rotation.y += 0.0035;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // --- Cleanup
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      controls.dispose();
      if (carApiRef.current) {
        scene.remove(carApiRef.current.group);
      }
      const canvas = renderer.domElement;
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once

  // If color index changes from outside (e.g., future UI), reflect on car
  useEffect(() => {
    if (carApiRef.current) {
      carApiRef.current.setBodyColor(COLORS[currentIndex].value);
    }
  }, [currentIndex]);

  return (
    <div
      ref={mountRef}
      style={{ width: '100vw', height: '100vh', margin: 0, overflow: 'hidden', position: 'relative' }}
    >
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          padding: '6px 10px',
          background: 'rgba(0,0,0,0.45)',
          color: '#fff',
          borderRadius: 8,
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          fontSize: 14,
        }}
      >
        {COLORS[currentIndex].name} — press ← / →
      </div>
    </div>
  );
}

export default CarViewerPage;
