// import React, { useMemo } from 'react';
// import { useGLTF } from '@react-three/drei';
// import * as THREE from 'three'; // Import THREE to use Box3 and Vector3

// export default function WheelModel({ type, ...props }) {
//   // --- This part remains the same ---
//   const modelMap = {
//     slim: 'skinny',
//     standard: 'default',
//     offroad: 'offroad',
//   };
//   const modelName = modelMap[type] || 'default';
//   const path = `/models/${modelName}.glb`;
//   const { scene } = useGLTF(path);
//   const model = useMemo(() => scene.clone(), [scene]);

//   // ✨ --- NEW: Auto-centering logic --- ✨
//   // We calculate the center of the model's bounding box
//   const centerOffset = useMemo(() => {
//     const box = new THREE.Box3().setFromObject(model);
//     const center = new THREE.Vector3();
//     box.getCenter(center);
//     // We will move the model by the *opposite* of its center to bring it to (0,0,0)
//     return center.negate();
//   }, [model]);

//   return (
//     // We wrap the model in a group and apply the corrective position
//     // Any other props like rotation or scale are passed down
//     <group {...props}>
//       <group position={centerOffset}>
//         <primitive object={model} />
//       </group>
//     </group>
//   );
// }


import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// This component now handles its own positioning and rotation
export default function WheelModel({ type, position, rotation, scale = [1, 1, 1] }) {
  const modelMap = {
    slim: 'skinny',
    standard: 'default',
    offroad: 'offroad',
  };
  const modelName = modelMap[type] || 'default';
  const path = `/models/${modelName}.glb`;
  const { scene } = useGLTF(path);
  const model = useMemo(() => scene.clone(), [scene]);

  // Auto-centering logic (this is correct and stays)
  const centerOffset = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    return center.negate();
  }, [model]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group position={centerOffset}>
        <primitive object={model} />
      </group>
    </group>
  );
}