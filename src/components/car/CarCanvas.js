// src/components/car/CarCanvas.js
import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { buildLowPolyCar, fitCarOnGround } from './LowPolyCar';

function Car({ bodyColor, wheelType }) {
  // Build a fresh car group whenever props change.
  const carGroup = useMemo(() => {
    const { group, wheels } = buildLowPolyCar({ bodyColor, scale: 1 });

    // Place the car on the ground once.
    fitCarOnGround(group);

    // Scale existing wheel meshes IN-PLACE (no cloning, no add/remove).
    const scaleMap = { standard: 1, offroad: 1.1, slim: 0.8 };
    const s = scaleMap[wheelType] ?? 1;
    Object.values(wheels).forEach((wheel) => {
      // Defend against undefined wheels
      if (wheel && wheel.scale) wheel.scale.setScalar(s);
    });

    return group;
  }, [bodyColor, wheelType]);

  // No refs, no effects, no manual cleanup.
  return <primitive object={carGroup} />;
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
        enableZoom
        enablePan={false}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={0}
        maxDistance={10}
        minDistance={3}
      />
    </Canvas>
  );
}
