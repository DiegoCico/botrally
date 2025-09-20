import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { addLightsAndGround } from '../components/tracks/TrackUtils';
import { buildFlatTrack } from '../components/tracks/FlatTrack';
import { buildHillyTrack } from '../components/tracks/HillyTrack';
import { buildTechnicalTrack } from '../components/tracks/TechnicalTrack';

const TRACKS = [
  { name: 'Flat Track', build: buildFlatTrack },
  { name: 'Hilly Track', build: buildHillyTrack },
  { name: 'Technical Track', build: buildTechnicalTrack },
];

function TrackViewerPage() {
  const mountRef = useRef(null);
  const rafRef = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x88aadd);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(140, 140, 180);
    camera.lookAt(0, 0, 0);

    addLightsAndGround(scene);

    let currentTrack = null;
    const loadTrack = (idx) => {
      if (currentTrack) scene.remove(currentTrack.group);
      currentTrack = TRACKS[idx].build();
      scene.add(currentTrack.group);
    };
    loadTrack(currentIndex);

    const onKey = (e) => {
      if (e.key === 'ArrowRight') {
        const next = (currentIndex + 1) % TRACKS.length;
        setCurrentIndex(next);
        loadTrack(next);
      } else if (e.key === 'ArrowLeft') {
        const prev = (currentIndex - 1 + TRACKS.length) % TRACKS.length;
        setCurrentIndex(prev);
        loadTrack(prev);
      }
    };
    window.addEventListener('keydown', onKey);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const canvas = renderer.domElement;
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once; we manage track swaps inside

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
        {TRACKS[currentIndex].name} — press ← / →
      </div>
    </div>
  );
}

export default TrackViewerPage;
