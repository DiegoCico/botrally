// src/components/car/SpoilerPreview.js
import React, { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// We reuse the same builder functions from LowPolyCar.js for consistency.
// A simple materials object for the preview.
const materials = {
  body: new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8, metalness: 0.05 }),
  trim: new THREE.MeshStandardMaterial({ color: 0x3b4556, roughness: 1.0 }),
};

function createDucktailSpoiler(materials) {
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 1.4), materials.body);
  spoiler.position.set(-0.1, 0.25, 0);
  spoiler.rotation.z = THREE.MathUtils.degToRad(-15);
  return spoiler;
}

function createGtWingSpoiler(materials) {
  const wing = new THREE.Group();
  const uprightL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), materials.trim);
  uprightL.position.set(0, 0.15, 0.5);
  const uprightR = uprightL.clone();
  uprightR.position.z = -0.5;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 1.5), materials.body);
  blade.position.set(0.05, 0.3, 0);
  blade.rotation.z = THREE.MathUtils.degToRad(-5);
  wing.add(uprightL, uprightR, blade);
  return wing;
}

// A component that manages swapping the spoiler model
function PreviewSpoilerModel({ spoilerType }) {
  const groupRef = useRef();

  useEffect(() => {
    // Clear any previous model
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }

    let spoilerModel = null;
    if (spoilerType === 'ducktail') {
      spoilerModel = createDucktailSpoiler(materials);
    } else if (spoilerType === 'gtwing') {
      spoilerModel = createGtWingSpoiler(materials);
    }

    if (spoilerModel) {
      groupRef.current.add(spoilerModel);
    }
  }, [spoilerType]);

  return <group ref={groupRef} />;
}

// The main export component that sets up the canvas
export default function SpoilerPreview({ spoilerType }) {
  return (
    <div style={{ width: '100px', height: '80px' }}>
      <Canvas shadows camera={{ position: [0.5, 0.5, 1.5], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <PreviewSpoilerModel spoilerType={spoilerType} />
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