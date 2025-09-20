// src/components/car/CarCanvas.js
import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { buildLowPolyCar } from './LowPolyCar';

function Car({ bodyColor, wheelType }) {
  const carRef = useRef();

  useEffect(() => {
    const { group, wheels, setBodyColor } = buildLowPolyCar({ bodyColor, scale: 1 });

    // Remove default wheels
    Object.values(wheels).forEach(w => group.remove(w));

    // Map wheel type to radius & width
    const wheelParams = {
      standard: { radius: 0.55, width: 0.35 },
      offroad: { radius: 0.65, width: 0.45 },
      slim: { radius: 0.50, width: 0.30 },
    };

    const { radius, width } = wheelParams[wheelType] || wheelParams.standard;

    // Build new wheels
    function buildWheel(radius, width) {
      const gTire = new THREE.CylinderGeometry(radius, radius, width, 18);
      const gRim = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width * 1.02, 10);
      const tire = new THREE.Mesh(gTire, wheels.FL.children[0].material);
      tire.rotation.x = Math.PI / 2;
      const rim = new THREE.Mesh(gRim, wheels.FL.children[1].material);
      rim.rotation.x = Math.PI / 2;
      const w = new THREE.Group();
      w.add(tire, rim);
      return w;
    }

    const wheelFL = buildWheel(radius, width); wheelFL.position.set(1.35, 0.55, 0.95);
    const wheelFR = buildWheel(radius, width); wheelFR.position.set(1.35, 0.55, -0.95);
    const wheelRL = buildWheel(radius, width); wheelRL.position.set(-1.35, 0.55, 0.95);
    const wheelRR = buildWheel(radius, width); wheelRR.position.set(-1.35, 0.55, -0.95);

    group.add(wheelFL, wheelFR, wheelRL, wheelRR);

    // Adjust car height
    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3(), center = new THREE.Vector3();
    box.getSize(size); box.getCenter(center);
    group.position.y += (size.y / 2) - (box.min.y) - 0.1; // lower slightly if needed
    group.position.x -= center.x;
    group.position.z -= center.z;

    carRef.current.add(group);

    return () => {
      carRef.current.remove(group);
    };
  }, [bodyColor, wheelType]);

  // optional rotation
  useFrame(() => {
    if (carRef.current) {
      // can rotate on Z if needed
    }
  });

  return <group ref={carRef} />;
}

export default function CarCanvas({ bodyColor = 0xc0455e, wheelType = 'standard' }) {
  return (
    <Canvas shadows camera={{ position: [5, 3, 5], fov: 50 }} style={{ width: '100%', height: '100%' }}>
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
        maxDistance={10} // limit zoom
        minDistance={3}  // limit zoom
      />
    </Canvas>
  );
}
