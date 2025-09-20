import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { buildWheel } from './LowPolyCar'; // Make sure this path is correct!

const materials = {
  tire: new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 1.0 }),
  rim: new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.2 }),
};

function PreviewWheel({ wheelType }) {
  const wheel = useMemo(() => {
    return buildWheel(wheelType, materials, false, false);
  }, [wheelType]);

  return <primitive object={wheel} />;
}

export default function WheelPreview({ wheelType }) {
  return (
    <div style={{ width: '100px', height: '80px' }}>
      <Canvas shadows camera={{ position: [0, 0, 1.5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <PreviewWheel wheelType={wheelType} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={5}
        />
      </Canvas>
    </div>
  );
}