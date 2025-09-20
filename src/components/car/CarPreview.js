// import React, { useEffect, useRef } from 'react'
// import { Canvas } from '@react-three/fiber'
// import { OrbitControls } from '@react-three/drei'
// import { buildLowPolyCar, fitCarOnGround } from './LowPolyCar'

// function CarModel({ bodyColor }) {
//   const groupRef = useRef()

//   useEffect(() => {
//     const { group } = buildLowPolyCar({ bodyColor, scale: 0.6 })
//     fitCarOnGround(group)

//     const current = groupRef.current
//     current.add(group)

//     return () => {
//       current.remove(group)
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

//         {/* Static camera, no controls */}
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

function CarModel({ partType = 'body', bodyColor, wheelType = 'standard', scale = 0.6 }) {
  const groupRef = useRef()

  useEffect(() => {
    const { group, wheels } = buildLowPolyCar({ bodyColor, scale })
    fitCarOnGround(group)

    const current = groupRef.current

    // Clear previous children
    while (current.children.length) current.remove(current.children[0])

    if (partType === 'body') {
      current.add(group)
    } else if (partType === 'wheels') {
      // Add only the chosen wheel type
      // For simplicity, preview front-left wheel
      let wheel
      if (wheelType === 'offroad') {
        wheel = wheels.FL.clone()
        wheel.scale.set(1.1, 1.1, 1.1) // slightly bigger tires
      } else if (wheelType === 'slim') {
        wheel = wheels.FL.clone()
        wheel.scale.set(0.8, 0.8, 0.8) // smaller slim tires
      } else {
        wheel = wheels.FL.clone() // standard
      }

      // Center the wheel
      wheel.position.set(0, 0, 0)
      current.add(wheel)
    }

    return () => {
      while (current.children.length) current.remove(current.children[0])
    }
  }, [partType, bodyColor, wheelType, scale])

  return <group ref={groupRef} />
}

export default function CarPreview({ partType = 'body', bodyColor = 0xc0455e, wheelType = 'standard' }) {
  // Adjust camera depending on what we show
  const cameraPosition = partType === 'body' ? [4, 3, 4] : [2, 2, 2]

  return (
    <div className="w-full h-24">
      <Canvas camera={{ position: cameraPosition, fov: 35 }}>
        {/* Lights */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1} />

        {/* Car / Wheel */}
        <CarModel partType={partType} bodyColor={bodyColor} wheelType={wheelType} />

        {/* Static camera, no controls */}
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
      </Canvas>
    </div>
  )
}

