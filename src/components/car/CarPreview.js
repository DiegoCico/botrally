// // src/components/CarPreview.js
// import React, { useEffect, useRef } from 'react'
// import { Canvas, useFrame } from '@react-three/fiber'
// import { OrbitControls } from '@react-three/drei'
// import * as THREE from 'three'
// import { buildLowPolyCar, fitCarOnGround } from './LowPolyCar'

// function CarModel({ bodyColor }) {
//   const groupRef = useRef()

//   useEffect(() => {
//     const { group } = buildLowPolyCar({ bodyColor, scale: 0.6 })
//     fitCarOnGround(group)
//     groupRef.current.add(group)

//     return () => {
//       groupRef.current.remove(group)
//     }
//   }, [bodyColor])

//   return <group ref={groupRef} />
// }

// export default function CarPreview({ bodyColor }) {
//   return (
//     <div className="w-full h-24">
//       <Canvas camera={{ position: [4, 3, 4], fov: 35 }}>
//         {/* Lights */}
//         <ambientLight intensity={0.6} />
//         <directionalLight position={[5, 10, 5]} intensity={1} />
        
//         {/* Car */}
//         <CarModel bodyColor={bodyColor} />

//         {/* Keep camera static, disable user controls */}
//         <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
//       </Canvas>
//     </div>
//   )
// }


// src/components/car/CarPreview.js
import React, { useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { buildLowPolyCar, fitCarOnGround } from './LowPolyCar'

function CarModel({ bodyColor }) {
  const groupRef = useRef()

  useEffect(() => {
    const { group } = buildLowPolyCar({ bodyColor, scale: 0.6 })
    fitCarOnGround(group)

    const current = groupRef.current
    current.add(group)

    return () => {
      current.remove(group)
    }
  }, [bodyColor])

  return <group ref={groupRef} />
}

export default function CarPreview({ bodyColor }) {
  return (
    <div className="w-full h-24">
      <Canvas camera={{ position: [4, 3, 4], fov: 35 }}>
        {/* Lights */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1} />

        {/* Car */}
        <CarModel bodyColor={bodyColor} />

        {/* Static camera, no controls */}
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
      </Canvas>
    </div>
  )
}
