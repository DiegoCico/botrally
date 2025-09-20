// src/components/car/CarCanvas.js
import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { buildLowPolyCar, fitCarOnGround } from './LowPolyCar';

extend({ OrbitControls });

function Car({ bodyColor }) {
  const carRef = useRef();

  useEffect(() => {
    const { group, setBodyColor } = buildLowPolyCar({ bodyColor, scale : 1 });
    fitCarOnGround(group);

    group.position.y -= 0.1
    carRef.current.add(group);

    return () => {
      carRef.current.remove(group);
    };
  }, [bodyColor]);

  // optional animation
  useFrame(() => {
    if (carRef.current) {
      // only rotate on Z if you want
      // carRef.current.rotation.z += 0.005;
    }
  });

  return <group ref={carRef} />;
}

export default function CarCanvas({ bodyColor = 0xc0455e }) {
  return (
    <Canvas
      shadows
      camera={{ position: [5, 3, 5], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Lights */}
      <ambientLight intensity={0.4} />
      <directionalLight
        castShadow
        position={[5, 10, 5]}
        intensity={1.0}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <shadowMaterial transparent opacity={0.3} />
      </mesh>

      {/* Car */}
      <Car bodyColor={bodyColor} />

      {/* Controls: only rotate around Z-axis */}
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={0}
        enableRotate={true}
        rotateSpeed={0.5}
        onChange={(e) => {
          // lock X/Y rotation if needed
        }}
      />
    </Canvas>
  );
}