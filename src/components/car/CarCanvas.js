// import React, { useEffect, useMemo } from 'react';
// import { Canvas } from '@react-three/fiber';
// import { OrbitControls } from '@react-three/drei';
// // Make sure this path is correct for your project structure
// import { buildLowPolyCar, fitCarOnGround } from './LowPolyCar';

// function Car({ bodyColor, wheelType, spoilerType }) {
//   // 1. Destructure the new setWheelType function
//   const { group, setBodyColor, setSpoilerType, setWheelType } = useMemo(() => {
//     const carData = buildLowPolyCar({ scale: 1 });
//     fitCarOnGround(carData.group);
//     return carData;
//   }, []);

//   // Effect for body color (unchanged)
//   useEffect(() => {
//     if (setBodyColor) {
//       setBodyColor(bodyColor);
//     }
//   }, [bodyColor, setBodyColor]);

//   // Effect for spoiler type (unchanged)
//   useEffect(() => {
//     if (setSpoilerType) {
//       setSpoilerType(spoilerType);
//     }
//   }, [spoilerType, setSpoilerType]);

//   // 2. This effect now calls the new setWheelType function
//   useEffect(() => {
//     if (setWheelType) {
//       setWheelType(wheelType);
//     }
//   }, [wheelType, setWheelType]);

//   return <primitive object={group} />;
// }


// export default function CarCanvas({ bodyColor = 0xc0455e, wheelType = 'standard', spoilerType = 'none' }) {
//   return (
//     <Canvas
//       shadows
//       camera={{ position: [5, 3, 5], fov: 50 }}
//       style={{ width: '100%', height: '100%' }}
//     >
//       {/* Lights */}
//       <ambientLight intensity={0.4} />
//       <directionalLight
//         castShadow
//         position={[5, 10, 5]}
//         intensity={1.0}
//         shadow-mapSize-width={1024}
//         shadow-mapSize-height={1024}
//       />

//       {/* Ground */}
//       <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
//         <planeGeometry args={[50, 50]} />
//         <shadowMaterial transparent opacity={0.3} />
//       </mesh>

//       {/* Car component with all props passed down */}
//       <Car
//         bodyColor={bodyColor}
//         wheelType={wheelType}
//         spoilerType={spoilerType}
//       />

//       {/* Controls */}
//       <OrbitControls
//         enableZoom={true}
//         enablePan={false}
//         maxPolarAngle={Math.PI / 2}
//         minPolarAngle={0}
//         maxDistance={10}
//         minDistance={3}
//       />
//     </Canvas>
//   );
// }


import React, { useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { buildLowPolyCar, fitCarOnGround } from './LowPolyCar'; // Make sure this path is correct!

function Car({ bodyColor, wheelType, spoilerType }) {
  const { group, setBodyColor, setSpoilerType, setWheelType } = useMemo(() => {
    const carData = buildLowPolyCar({ scale: 1 });
    fitCarOnGround(carData.group);
    return carData;
  }, []);

  useEffect(() => {
    if (setBodyColor) setBodyColor(bodyColor);
  }, [bodyColor, setBodyColor]);

  useEffect(() => {
    if (setSpoilerType) setSpoilerType(spoilerType);
  }, [spoilerType, setSpoilerType]);

  useEffect(() => {
    if (setWheelType) setWheelType(wheelType);
  }, [wheelType, setWheelType]);

  return <primitive object={group} />;
}

export default function CarCanvas({ bodyColor = 0xc0455e, wheelType = 'standard', spoilerType = 'none' }) {
  return (
    <Canvas
      shadows
      camera={{ position: [5, 3, 5], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight castShadow position={[5, 10, 5]} intensity={1.0} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <shadowMaterial transparent opacity={0.3} />
      </mesh>
      <Car bodyColor={bodyColor} wheelType={wheelType} spoilerType={spoilerType} />
      <OrbitControls
        enableZoom={true} enablePan={false} maxPolarAngle={Math.PI / 2}
        minPolarAngle={0} maxDistance={10} minDistance={3}
      />
    </Canvas>
  );
}