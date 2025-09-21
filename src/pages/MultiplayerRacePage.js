// src/pages/MultiplayerRacePage.js
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';


import { buildLowPolyCar } from '../components/car/LowPolyCar';
import { CarAdapter } from '../components/functions/CarAdapter';
import { SensorRig } from '../components/functions/SensorRig';
import { BlockRuntime } from '../components/functions/BlockRuntime';
import { SafetyLimiter } from '../components/blocks/SafetyLimiter';
import { buildFlatTrack } from '../components/tracks/FlatTrack';
import { buildHillyTrack } from '../components/tracks/HillyTrack';
import { buildTechnicalTrack } from '../components/tracks/TechnicalTrack';
import { addLightsAndGround } from '../components/tracks/TrackUtils';
import { getLobbyClient } from '../net/websocket-lobby';

const TRACKS = {
  flat: { name: 'Flat Track', builder: buildFlatTrack },
  hilly: { name: 'Hilly Track', builder: buildHillyTrack },
  technical: { name: 'Technical Track', builder: buildTechnicalTrack }
};

export default function MultiplayerRacePage() {
  const navigate = useNavigate();
  const mountRef = useRef(null);
  const rafRef = useRef(0);
  const [gameState, setGameState] = useState('waiting'); // waiting, racing, finished
  const [raceTime, setRaceTime] = useState(0);
  const [playerPositions, setPlayerPositions] = useState({ p1: 0, p2: 0 });
  const [selectedTrack, setSelectedTrack] = useState('flat');

  // Get lobby parameters
  const urlParams = new URLSearchParams(window.location.search);
  const lobbyCode = urlParams.get('code');
  const playerRole = urlParams.get('role');
  const carConfig = JSON.parse(decodeURIComponent(urlParams.get('car') || '{}'));
  const playerProgram = urlParams.get('program') ? JSON.parse(decodeURIComponent(urlParams.get('program'))) : null;

  useEffect(() => {
    if (!lobbyCode || !playerRole) {
      navigate('/');
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    // Clear any existing content to prevent WebGL context issues
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    
    // Lighting and ground
    addLightsAndGround(scene, { groundColor: 0x0f3d0f });

    // Build selected track
    const trackData = TRACKS[selectedTrack].builder({ closed: true });
    const trackGroup = trackData?.group ?? trackData;
    if (trackGroup) scene.add(trackGroup);
    
    // Debug track data
    console.log(`Multiplayer Track ${selectedTrack} data:`, trackData);

    // Get starting positions from the track curve
    const curve = trackData?.curve;
    const startPoint = new THREE.Vector3();
    const startTangent = new THREE.Vector3();
    const startSide = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    
    if (curve) {
      // Get the actual starting point (u=0) and direction
      curve.getPoint(0, startPoint);
      curve.getTangent(0, startTangent).normalize();
      startSide.crossVectors(up, startTangent).normalize();
      
      // Ensure we have valid vectors
      if (startTangent.lengthSq() < 0.1) {
        startTangent.set(1, 0, 0); // Default forward direction
      }
      if (startSide.lengthSq() < 0.1) {
        startSide.set(0, 0, 1); // Default side direction
      }
      
      // Move cars slightly ahead of the start line so they face away from red blocker
      const startOffset = startTangent.clone().multiplyScalar(3); // 3 units ahead
      startPoint.add(startOffset);
    } else {
      // Fallback positions if no curve
      startPoint.set(0, 0, 0);
      startTangent.set(1, 0, 0);
      startSide.set(0, 0, 1);
    }

    // Create cars for both players
    const cars = {};
    const adapters = {};
    const sensors = {};
    const limiters = {};
    const runtimes = {};

    // Map car configuration to buildLowPolyCar parameters
    const getBodyColor = (bodyId) => {
      const bodyColors = {
        'mk1': 0xc0455e,
        'blue': 0x3366ff,
        'green': 0x33cc66
      };
      return bodyColors[bodyId] || (playerRole === 'p1' ? 0xff4444 : 0x4444ff);
    };

    // Player 1 car
    const { group: car1Group, wheels: car1Wheels } = buildLowPolyCar({ 
      scale: 0.6, 
      wheelType: carConfig.wheels || 'standard',
      spoilerType: carConfig.spoiler || 'none',
      bodyColor: playerRole === 'p1' ? getBodyColor(carConfig.body) : 0x4444ff
    });
    
    // Helper function to find ground height at a position
    const findGroundHeight = (position) => {
      const raycaster = new THREE.Raycaster();
      const rayOrigin = position.clone();
      rayOrigin.y = 200; // Start very high above
      raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
      
      // Try to intersect with the track group
      const intersects = raycaster.intersectObject(trackGroup, true);
      
      if (intersects.length > 0) {
        return intersects[0].point.y;
      }
      
      // If no intersection found, use the curve point height
      if (curve) {
        const curvePoint = new THREE.Vector3();
        curve.getPoint(0, curvePoint);
        return curvePoint.y;
      }
      
      return 1; // Final fallback
    };

    // Position player 1 car on the left side of the starting line
    const p1StartPos = startPoint.clone().addScaledVector(startSide, -2.5);
    const p1GroundHeight = findGroundHeight(p1StartPos);
    p1StartPos.y = p1GroundHeight + 1.0; // Car height above ground (increased)
    car1Group.position.copy(p1StartPos);
    
    // Orient car to face along the track direction
    // Car model is built with +X as forward, but we need to flip it 180 degrees
    const p1TargetDirection = startTangent.clone().normalize().negate(); // Flip 180 degrees
    const p1CarForward = new THREE.Vector3(1, 0, 0); // Car's local forward direction
    
    // Calculate rotation to align car's +X with flipped track tangent
    const p1Quaternion = new THREE.Quaternion();
    p1Quaternion.setFromUnitVectors(p1CarForward, p1TargetDirection);
    car1Group.quaternion.copy(p1Quaternion);
    scene.add(car1Group);
    
    cars.p1 = car1Group;
    adapters.p1 = new CarAdapter({ group: car1Group, wheels: car1Wheels }, { 
      wheelBase: 2.7, 
      tireRadius: 0.55, 
      maxSteerRad: THREE.MathUtils.degToRad(30) 
    });
    sensors.p1 = new SensorRig(car1Group, { rayLength: 35 });
    limiters.p1 = new SafetyLimiter({ 
      adapter: adapters.p1, 
      carSpecs: { maxSpeedFwd: 28, maxSpeedRev: 7, maxAccel: 12, maxBrake: 18 } 
    });
    // Use player's program if they're p1, otherwise use default
    const p1Program = (playerRole === 'p1' && playerProgram) ? playerProgram : [
      { if: 'f_min < 10', then: { throttle: '0.2', steer: '(r_min - l_min) * 0.06' } },
      { if: 'f_min >= 10 && f_min < 20', then: { throttle: '0.6', steer: '(r_min - l_min) * 0.03' } },
      { if: 'f_min >= 20', then: { throttle: '1.0', steer: '(r_min - l_min) * 0.02' } }
    ];
    runtimes.p1 = new BlockRuntime(p1Program);

    // Player 2 car
    const { group: car2Group, wheels: car2Wheels } = buildLowPolyCar({ 
      scale: 0.6, 
      wheelType: carConfig.wheels || 'standard',
      spoilerType: carConfig.spoiler || 'none',
      bodyColor: playerRole === 'p2' ? getBodyColor(carConfig.body) : 0xff4444
    });
    
    // Position player 2 car on the right side of the starting line
    const p2StartPos = startPoint.clone().addScaledVector(startSide, 2.5);
    const p2GroundHeight = findGroundHeight(p2StartPos);
    p2StartPos.y = p2GroundHeight + 1.0; // Car height above ground (increased)
    car2Group.position.copy(p2StartPos);
    
    // Orient car to face along the track direction
    // Car model is built with +X as forward, but we need to flip it 180 degrees
    const p2TargetDirection = startTangent.clone().normalize().negate(); // Flip 180 degrees
    const p2CarForward = new THREE.Vector3(1, 0, 0); // Car's local forward direction
    
    // Calculate rotation to align car's +X with flipped track tangent
    const p2Quaternion = new THREE.Quaternion();
    p2Quaternion.setFromUnitVectors(p2CarForward, p2TargetDirection);
    car2Group.quaternion.copy(p2Quaternion);
    scene.add(car2Group);
    
    cars.p2 = car2Group;
    adapters.p2 = new CarAdapter({ group: car2Group, wheels: car2Wheels }, { 
      wheelBase: 2.7, 
      tireRadius: 0.55, 
      maxSteerRad: THREE.MathUtils.degToRad(30) 
    });
    sensors.p2 = new SensorRig(car2Group, { rayLength: 35 });
    limiters.p2 = new SafetyLimiter({ 
      adapter: adapters.p2, 
      carSpecs: { maxSpeedFwd: 28, maxSpeedRev: 7, maxAccel: 12, maxBrake: 18 } 
    });
    // Use player's program if they're p2, otherwise use default
    const p2Program = (playerRole === 'p2' && playerProgram) ? playerProgram : [
      { if: 'f_min < 8', then: { throttle: '0.3', steer: '(r_min - l_min) * 0.08' } },
      { if: 'f_min >= 8 && f_min < 15', then: { throttle: '0.7', steer: '(r_min - l_min) * 0.04' } },
      { if: 'f_min >= 15', then: { throttle: '0.9', steer: '(r_min - l_min) * 0.025' } }
    ];
    runtimes.p2 = new BlockRuntime(p2Program);

    // Collision objects - include track surface, walls but NOT the start blocker (red wall)
    const colliders = [];
    
    // Add track surface for ground collision
    if (trackData?.mesh) {
      colliders.push(trackData.mesh);
    }
    
    // Add side walls so cars can't go through them
    if (trackData?.walls) {
      if (trackData.walls.left) colliders.push(trackData.walls.left);
      if (trackData.walls.right) colliders.push(trackData.walls.right);
    }
    
    // Only add the END blocker, not the start blocker (cars should be able to cross start line)
    if (trackData?.blockers) {
      if (trackData.blockers.end) colliders.push(trackData.blockers.end);
      // Note: NOT adding trackData.blockers.start so cars can cross the red start/finish line
      console.log('Start blocker excluded from colliders - cars can pass through red wall');
    }

    const clock = new THREE.Clock();
    let startTime = null;

    // Camera follow logic for 3rd person view
    const followCar = cars[playerRole];

    // Set initial camera position behind the player's car (after cars are positioned and oriented)
    const initializeCamera = () => {
      if (followCar) {
        // Get car's actual forward direction from its quaternion (car's +X axis)
        const carForward = new THREE.Vector3(1, 0, 0);
        carForward.applyQuaternion(followCar.quaternion);
        
        // Position camera behind and above the car
        const initialCameraPos = followCar.position.clone()
          .addScaledVector(carForward, -15) // Behind the car
          .add(new THREE.Vector3(0, 8, 0)); // Above the car
        
        camera.position.copy(initialCameraPos);
        
        // Look at point ahead of the car
        const lookAtPoint = followCar.position.clone()
          .addScaledVector(carForward, 10) // Look ahead
          .add(new THREE.Vector3(0, 2, 0)); // Slightly above
        
        camera.lookAt(lookAtPoint);
      }
    };

    // Initialize camera after cars are positioned (delay slightly to ensure cars are ready)
    setTimeout(() => {
      initializeCamera();
    }, 100);

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // Start race after 3 seconds
    setTimeout(() => {
      setGameState('racing');
      startTime = clock.getElapsedTime();
    }, 3000);

    const loop = () => {
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      
      if (gameState === 'racing' && startTime) {
        setRaceTime(elapsed - startTime);
      }

      // Update both cars
      Object.keys(cars).forEach(playerId => {
        if (gameState === 'racing') {
          const sensorData = sensors[playerId].sample(colliders);
          const desired = runtimes[playerId].step({ 
            sensors: sensorData, 
            speed: adapters[playerId].getScalarSpeed() 
          });
          const safe = limiters[playerId].filterControls(desired, adapters[playerId].getScalarSpeed());
          adapters[playerId].setControls(safe);
        }
        adapters[playerId].tick(dt, colliders);
      });

      // 3rd person camera follows player's car
      if (followCar) {
        // Get car's current forward direction (where it's actually facing) - car's +X axis
        const carForward = new THREE.Vector3(1, 0, 0);
        carForward.applyQuaternion(followCar.quaternion);
        
        // Calculate ideal camera position behind the car
        const targetCameraPos = followCar.position.clone()
          .addScaledVector(carForward, -15) // Behind the car
          .add(new THREE.Vector3(0, 8, 0)); // Above the car
        
        // Smooth camera movement with faster response
        camera.position.lerp(targetCameraPos, 0.15);
        
        // Look at point ahead of the car in the direction it's facing
        const lookAtPoint = followCar.position.clone()
          .addScaledVector(carForward, 15) // Look further ahead
          .add(new THREE.Vector3(0, 1, 0)); // Slightly above car level
        
        camera.lookAt(lookAtPoint);
      }

      // Update positions based on progress along the track curve
      let p1Progress = 0;
      let p2Progress = 0;
      
      if (curve) {
        // Find closest point on curve for each car to calculate progress
        const findProgressOnCurve = (carPosition) => {
          let minDist = Infinity;
          let bestU = 0;
          const testPoint = new THREE.Vector3();
          
          // Sample the curve to find closest point
          for (let u = 0; u <= 1; u += 0.01) {
            curve.getPoint(u, testPoint);
            const dist = carPosition.distanceTo(testPoint);
            if (dist < minDist) {
              minDist = dist;
              bestU = u;
            }
          }
          return bestU;
        };
        
        p1Progress = findProgressOnCurve(cars.p1.position);
        p2Progress = findProgressOnCurve(cars.p2.position);
      }

      // Update positions for UI
      setPlayerPositions({
        p1: p1Progress * 100, // Convert to percentage
        p2: p2Progress * 100
      });

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [lobbyCode, playerRole, carConfig, selectedTrack]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000' }}>
      {/* 3D Scene */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      
      {/* UI Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '20px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
        color: 'white',
        fontFamily: 'monospace'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            🏁 Multiplayer Race
          </div>
          <div style={{ fontSize: '18px' }}>
            Code: <span style={{ color: '#ff6b9d' }}>{lobbyCode}</span>
          </div>
        </div>

        {/* Race Status */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ 
            padding: '8px 16px', 
            background: gameState === 'waiting' ? '#ff6b00' : gameState === 'racing' ? '#00ff6b' : '#6b00ff',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {gameState === 'waiting' ? '⏳ Starting...' : gameState === 'racing' ? '🏃 Racing!' : '🏆 Finished!'}
          </div>
          
          {gameState === 'racing' && (
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              Time: {formatTime(raceTime)}
            </div>
          )}
        </div>

        {/* Player Status */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '10px', 
          marginTop: '15px',
          maxWidth: '400px'
        }}>
          <div style={{
            padding: '10px',
            background: playerRole === 'p1' ? 'rgba(255, 68, 68, 0.3)' : 'rgba(68, 68, 255, 0.3)',
            borderRadius: '8px',
            border: playerRole === 'p1' ? '2px solid #ff4444' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              {playerRole === 'p1' ? '👑 You (Host)' : '🎮 Player 1'}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              Progress: {playerPositions.p1.toFixed(1)}%
            </div>
          </div>
          
          <div style={{
            padding: '10px',
            background: playerRole === 'p2' ? 'rgba(255, 68, 68, 0.3)' : 'rgba(68, 68, 255, 0.3)',
            borderRadius: '8px',
            border: playerRole === 'p2' ? '2px solid #ff4444' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              {playerRole === 'p2' ? '👑 You (Player 2)' : '🎮 Player 2'}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              Progress: {playerPositions.p2.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Track Selection (only show before race starts) */}
      {gameState === 'waiting' && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          right: '20px',
          background: 'rgba(0,0,0,0.8)',
          padding: '15px',
          borderRadius: '10px',
          color: 'white'
        }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>Select Track:</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {Object.entries(TRACKS).map(([key, track]) => (
              <button
                key={key}
                onClick={() => setSelectedTrack(key)}
                style={{
                  padding: '8px 16px',
                  background: selectedTrack === key ? '#ff6b9d' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {track.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '10px 20px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '6px',
          color: 'white',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        ← Back to Home
      </button>
    </div>
  );
}