// // src/components/car/WheelPreview.js
// import React, { useEffect, useRef } from 'react';
// import { Canvas } from '@react-three/fiber';
// import * as THREE from 'three';
// import { buildLowPolyCar } from './LowPolyCar';

// function WheelModel({ wheelType }) {
//   const groupRef = useRef();

//   useEffect(() => {
//     const { wheels } = buildLowPolyCar({ bodyColor: 0xffffff, scale: 0.5 });

//     // Remove default wheels
//     Object.values(wheels).forEach(w => w.parent?.remove(w));

//     // Wheel parameters
//     const wheelParams = {
//       standard: { radius: 0.55, width: 0.35 },
//       offroad: { radius: 0.65, width: 0.45 },
//       slim: { radius: 0.50, width: 0.30 },
//     };
//     const { radius, width } = wheelParams[wheelType] || wheelParams.standard;

//     function buildWheel(radius, width) {
//       const gTire = new THREE.CylinderGeometry(radius, radius, width, 18);
//       const gRim = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width * 1.02, 10);
//       const tire = new THREE.Mesh(gTire, new THREE.MeshStandardMaterial({ color: 0x222222 }));
//       tire.rotation.x = Math.PI / 2;
//       const rim = new THREE.Mesh(gRim, new THREE.MeshStandardMaterial({ color: 0x888888 }));
//       rim.rotation.x = Math.PI / 2;
//       const w = new THREE.Group();
//       w.add(tire, rim);
//       return w;
//     }

//     const wheel = buildWheel(radius, width);
//     groupRef.current.add(wheel);

//     return () => {
//       groupRef.current.remove(wheel);
//     };
//   }, [wheelType]);

//   return <group ref={groupRef} />;
// }

// export default function WheelPreview({ wheelType }) {
//   return (
//     <div className="w-full h-24">
//       <Canvas camera={{ position: [2, 1.5, 2], fov: 35 }}>
//         <ambientLight intensity={0.6} />
//         <directionalLight position={[5, 5, 5]} intensity={1} />
//         <WheelModel wheelType={wheelType} />
//       </Canvas>
//     </div>
//   );
// }

// src/components/car/WheelPreview.js
import React, { useMemo, useEffect } from 'react';
// import { Canvas } from '@react-three-fiber';
import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';import * as THREE from 'three';

// A simple function to build just one wheel
function buildPreviewWheel() {
  const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 1.0 });
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xcfd6dd, roughness: 0.5, metalness: 0.2 });

  const gTire = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 18);
  const gRim = new THREE.CylinderGeometry(0.55 * 0.62, 0.55 * 0.62, 0.35 * 1.02, 10);

  const tire = new THREE.Mesh(gTire, tireMaterial);
  const rim = new THREE.Mesh(gRim, rimMaterial);

  const wheel = new THREE.Group();
  wheel.add(tire, rim);
  wheel.rotation.z = Math.PI / 2; // Rotate to stand up
  return wheel;
}

function PreviewWheel({ wheelType }) {
  const wheel = useMemo(() => buildPreviewWheel(), []);

  useEffect(() => {
    const scaleMap = { standard: 1, offroad: 1.1, slim: 0.8 };
    const scale = scaleMap[wheelType] || 1;
    wheel.scale.setScalar(scale);
  }, [wheelType, wheel]);

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