import React, { useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { buildLowPolyCar, fitCarOnGround } from './LowPolyCar';
import WheelModel from './WheelModel';

function Wheels({ wheelType }) {
  const positions = {
    frontRight: [1.35, 0.3, 0.95],
    frontLeft: [1.35, 0.3, -0.95],
    rearRight: [-1.35, 0.3, 0.95],
    rearLeft: [-1.35, 0.3, -0.95],
  };

  // All wheels use the same orientation by default
  // Right side wheels face outward normally
  const rightRotation = [0, Math.PI / 2, 0];
  // Left side wheels rotated an extra 180° so face outward
  const leftRotation  = [0, -Math.PI / 2, 0]; // or [0, (3 * Math.PI) / 2, 0]


  return (
    <>
      <WheelModel type={wheelType} position={positions.frontRight} rotation={leftRotation} scale={[1.5, 1.5, 1.5]} />
      <WheelModel type={wheelType} position={positions.frontLeft} rotation={rightRotation} scale={[1.5, 1.5, 1.5]} />
      <WheelModel type={wheelType} position={positions.rearRight} rotation={leftRotation} scale={[1.5, 1.5, 1.5]} />
      <WheelModel type={wheelType} position={positions.rearLeft} rotation={leftRotation} scale={[1.5, 1.5, 1.5]} />
    </>
  );
}

function Car({ bodyColor, wheelType, spoilerType }) {
  const { group, setBodyColor, setSpoilerType } = useMemo(() => {
    const carData = buildLowPolyCar({ bodyColor, spoilerType });
    fitCarOnGround(carData.group);
    return carData;
  }, [bodyColor, spoilerType]);

  useEffect(() => {
    setSpoilerType(spoilerType);
  }, [spoilerType, setSpoilerType]);

  return (
    <primitive object={group}>
      {/* Wheels are children of the car */}
      <Wheels wheelType={wheelType} />
    </primitive>
  );
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

