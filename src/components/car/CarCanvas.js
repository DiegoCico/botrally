// src/components/car/CarCanvas.js
import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { buildLowPolyCar, fitCarOnGround } from './LowPolyCar';

function Car({ bodyColor, wheelType }) {
  const carRef = useRef();

  useEffect(() => {
    if (!carRef.current) return;

    // Build car
    const { group, wheels, setBodyColor } = buildLowPolyCar({ bodyColor, scale: 1 });
    fitCarOnGround(group);

    // Remove existing wheels
    Object.values(wheels).forEach(wheel => group.remove(wheel));

    // Add wheels according to wheelType
    const scaleMap = { standard: 1, offroad: 1.1, slim: 0.8 };
    Object.entries(wheels).forEach(([key, wheel]) => {
      const w = wheel.clone();
      const s = scaleMap[wheelType] || 1;
      w.scale.setScalar(s);
      group.add(w);
    });

    // Add car group to scene
    carRef.current.add(group);

    return () => {
      carRef.current.remove(group);
    };
  }, [bodyColor, wheelType]);

  return <group ref={carRef} />;
}

export default function CarCanvas({ bodyColor = 0xc0455e, wheelType = 'standard' }) {
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
      <Car bodyColor={bodyColor} wheelType={wheelType} />

      {/* Controls */}
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={0}
        maxDistance={10}   // limit zoom
        minDistance={3}    // limit zoom
      />
    </Canvas>
  );
}
