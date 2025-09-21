// src/pages/AIRacePage.js
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

const TRACKS = {
  flat: { name: 'Flat Track', builder: buildFlatTrack },
  hilly: { name: 'Hilly Track', builder: buildHillyTrack },
  technical: { name: 'Technical Track', builder: buildTechnicalTrack }
};

export default function AIRacePage() {
  const navigate = useNavigate();
  const mountRef = useRef(null);
  const rafRef = useRef(0);
  const [gameState, setGameState] = useState('waiting'); // waiting, racing, finished
  const [raceTime, setRaceTime] = useState(0);
  const [playerPosition, setPlayerPosition] = useState(0);
  const [aiPosition, setAiPosition] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState('flat');
  const [winner, setWinner] = useState(null);

  // Get parameters with safe parsing
  const urlParams = new URLSearchParams(window.location.search);
  
  const parseParam = (paramName, defaultValue) => {
    const param = urlParams.get(paramName);
    if (!param) return defaultValue;
    try {
      return JSON.parse(decodeURIComponent(param));
    } catch (e) {
      console.warn(`Failed to parse ${paramName} parameter:`, e);
      return defaultValue;
    }
  };
  
  // Default programs for when none are provided
  const defaultPlayerProgram = [
    { if: 'f_min < 10', then: { throttle: '0.3', steer: '(r_min - l_min) * 0.05' } },
    { if: 'f_min >= 10 && f_min < 20', then: { throttle: '0.7', steer: '(r_min - l_min) * 0.03' } },
    { if: 'f_min >= 20', then: { throttle: '1.0', steer: '(r_min - l_min) * 0.02' } }
  ];
  
  const defaultAIProgram = [
    { if: 'f_min < 8', then: { throttle: '0.4', steer: '(r_min - l_min) * 0.06' } },
    { if: 'f_min >= 8 && f_min < 15', then: { throttle: '0.8', steer: '(r_min - l_min) * 0.04' } },
    { if: 'f_min >= 15', then: { throttle: '0.9', steer: '(r_min - l_min) * 0.025' } }
  ];

  const carConfig = parseParam('car', {});
  const rawPlayerProgram = parseParam('program', []);
  const rawAIProgram = parseParam('aiProgram', []);
  const aiDifficulty = urlParams.get('aiDifficulty') || 'medium';

  // Ensure we have valid programs (use defaults if needed)
  const playerProgram = (rawPlayerProgram && Array.isArray(rawPlayerProgram) && rawPlayerProgram.length) 
    ? rawPlayerProgram : defaultPlayerProgram;
  const aiProgram = (rawAIProgram && Array.isArray(rawAIProgram) && rawAIProgram.length) 
    ? rawAIProgram : defaultAIProgram;

  useEffect(() => {
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
    console.log(`Track ${selectedTrack} data:`, trackData);
    console.log(`Track group:`, trackGroup);
    console.log(`Track mesh:`, trackData?.mesh);

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

    // Create cars
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
      return bodyColors[bodyId] || 0x4444ff; // Default to blue for player
    };

    // Player car - positioned on the left side of the track
    const { group: playerCarGroup, wheels: playerCarWheels } = buildLowPolyCar({ 
      scale: 0.6, 
      wheelType: carConfig.wheels || 'standard',
      spoilerType: carConfig.spoiler || 'none',
      bodyColor: getBodyColor(carConfig.body)
    });
    
    // Helper function to find ground height at a position
    const findGroundHeight = (position) => {
      const raycaster = new THREE.Raycaster();
      const rayOrigin = position.clone();
      rayOrigin.y = 200; // Start very high above
      raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
      
      // Try to intersect with the track group
      const intersects = raycaster.intersectObject(trackGroup, true);
      console.log(`Raycasting at position ${position.x}, ${position.z}: found ${intersects.length} intersections`);
      
      if (intersects.length > 0) {
        console.log(`Ground height found: ${intersects[0].point.y}`);
        return intersects[0].point.y;
      }
      
      // If no intersection found, use the curve point height
      if (curve) {
        const curvePoint = new THREE.Vector3();
        curve.getPoint(0, curvePoint);
        console.log(`Using curve height: ${curvePoint.y}`);
        return curvePoint.y;
      }
      
      console.log(`Using fallback height: 1`);
      return 1; // Final fallback
    };

    // Position player car on the left side of the starting line
    const playerStartPos = startPoint.clone().addScaledVector(startSide, -2.5);
    const playerGroundHeight = findGroundHeight(playerStartPos);
    playerStartPos.y = playerGroundHeight + 1.0; // Car height above ground (increased)
    playerCarGroup.position.copy(playerStartPos);
    
    console.log(`Player car final position:`, playerStartPos);
    
    // Orient car to face along the track direction
    // Car model is built with +X as forward, but we need to flip it 180 degrees
    const targetDirection = startTangent.clone().normalize().negate(); // Flip 180 degrees
    const carForward = new THREE.Vector3(1, 0, 0); // Car's local forward direction
    
    // Calculate rotation to align car's +X with flipped track tangent
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(carForward, targetDirection);
    playerCarGroup.quaternion.copy(quaternion);
    scene.add(playerCarGroup);
    
    cars.player = playerCarGroup;
    adapters.player = new CarAdapter({ group: playerCarGroup, wheels: playerCarWheels }, { 
      wheelBase: 2.7, 
      tireRadius: 0.55, 
      maxSteerRad: THREE.MathUtils.degToRad(30) 
    });
    sensors.player = new SensorRig(playerCarGroup, { rayLength: 35 });
    limiters.player = new SafetyLimiter({ 
      adapter: adapters.player, 
      carSpecs: { maxSpeedFwd: 28, maxSpeedRev: 7, maxAccel: 12, maxBrake: 18 } 
    });
    runtimes.player = new BlockRuntime(playerProgram);

    // AI car (red) - positioned on the right side of the track
    const { group: aiCarGroup, wheels: aiCarWheels } = buildLowPolyCar({ 
      scale: 0.6, 
      wheelType: carConfig.wheels || 'standard',
      spoilerType: carConfig.spoiler || 'none',
      bodyColor: 0xff4444 // AI car stays red
    });
    
    // Position AI car on the right side of the starting line
    const aiStartPos = startPoint.clone().addScaledVector(startSide, 2.5);
    const aiGroundHeight = findGroundHeight(aiStartPos);
    aiStartPos.y = aiGroundHeight + 1.0; // Car height above ground (increased)
    aiCarGroup.position.copy(aiStartPos);
    
    console.log(`AI car final position:`, aiStartPos);
    
    // Orient AI car to face along the track direction
    // Car model is built with +X as forward, but we need to flip it 180 degrees
    const aiTargetDirection = startTangent.clone().normalize().negate(); // Flip 180 degrees
    const aiCarForward = new THREE.Vector3(1, 0, 0); // Car's local forward direction
    
    // Calculate rotation to align car's +X with flipped track tangent
    const aiQuaternion = new THREE.Quaternion();
    aiQuaternion.setFromUnitVectors(aiCarForward, aiTargetDirection);
    aiCarGroup.quaternion.copy(aiQuaternion);
    scene.add(aiCarGroup);
    
    cars.ai = aiCarGroup;
    adapters.ai = new CarAdapter({ group: aiCarGroup, wheels: aiCarWheels }, { 
      wheelBase: 2.7, 
      tireRadius: 0.55, 
      maxSteerRad: THREE.MathUtils.degToRad(30) 
    });
    sensors.ai = new SensorRig(aiCarGroup, { rayLength: 35 });
    limiters.ai = new SafetyLimiter({ 
      adapter: adapters.ai, 
      carSpecs: { maxSpeedFwd: 28, maxSpeedRev: 7, maxAccel: 12, maxBrake: 18 } 
    });
    runtimes.ai = new BlockRuntime(aiProgram);

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
    let raceFinished = false;

    // Camera follow logic for 3rd person view
    const followCar = cars.player;

    // Set initial camera position behind the player car (after car is positioned and oriented)
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
      Object.keys(cars).forEach(carId => {
        if (gameState === 'racing' && !raceFinished) {
          const sensorData = sensors[carId].sample(colliders);
          const desired = runtimes[carId].step({ 
            sensors: sensorData, 
            speed: adapters[carId].getScalarSpeed() 
          });
          const safe = limiters[carId].filterControls(desired, adapters[carId].getScalarSpeed());
          
          // Debug: log controls
          if (Math.random() < 0.01) { // 1% chance to log
            console.log(`${carId} controls: throttle=${safe.throttle?.toFixed(2)}, steer=${safe.steer?.toFixed(2)}`);
          }
          
          adapters[carId].setControls(safe);
        }
        adapters[carId].tick(dt, colliders);
      });

      // 3rd person camera follows player car
      if (followCar) {
        // Get car's current forward direction (where it's actually facing) - car's +X axis
        const carForward = new THREE.Vector3(1, 0, 0);
        carForward.applyQuaternion(followCar.quaternion);
        
        // Get car's right direction for smooth side-to-side movement
        const carRight = new THREE.Vector3(1, 0, 0);
        carRight.applyQuaternion(followCar.quaternion);
        
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
      let playerProgress = 0;
      let aiProgress = 0;
      
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
        
        playerProgress = findProgressOnCurve(cars.player.position);
        aiProgress = findProgressOnCurve(cars.ai.position);
      }
      
      setPlayerPosition(playerProgress * 100); // Convert to percentage
      setAiPosition(aiProgress * 100);

      // Check for race finish (one full lap = progress >= 0.95)
      if (gameState === 'racing' && !raceFinished && (playerProgress >= 0.95 || aiProgress >= 0.95)) {
        raceFinished = true;
        setGameState('finished');
        setWinner(playerProgress >= aiProgress ? 'player' : 'ai');
      }

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
  }, [playerProgram, aiProgram, carConfig, selectedTrack]);

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
            🤖 AI Race Challenge
          </div>
          <div style={{ fontSize: '18px' }}>
            Difficulty: <span style={{ color: '#00ffff' }}>{aiDifficulty}</span>
          </div>
        </div>

        {/* Race Status */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ 
            padding: '8px 16px', 
            background: gameState === 'waiting' ? '#ff6b00' : gameState === 'racing' ? '#00ff6b' : winner === 'player' ? '#00ff00' : '#ff0000',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {gameState === 'waiting' ? '⏳ Starting...' : 
             gameState === 'racing' ? '🏃 Racing!' : 
             winner === 'player' ? '🏆 You Win!' : '🤖 AI Wins!'}
          </div>
          
          {gameState === 'racing' && (
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              Time: {formatTime(raceTime)}
            </div>
          )}
        </div>

        {/* Player vs AI Status */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '10px', 
          marginTop: '15px',
          maxWidth: '400px'
        }}>
          <div style={{
            padding: '10px',
            background: 'rgba(68, 68, 255, 0.3)',
            borderRadius: '8px',
            border: winner === 'player' ? '2px solid #00ff00' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              👤 You (Player)
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              Progress: {playerPosition.toFixed(1)}%
            </div>
          </div>
          
          <div style={{
            padding: '10px',
            background: 'rgba(255, 68, 68, 0.3)',
            borderRadius: '8px',
            border: winner === 'ai' ? '2px solid #ff0000' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              🤖 Cerebras AI
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              Progress: {aiPosition.toFixed(1)}%
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
                  background: selectedTrack === key ? '#00ffff' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: selectedTrack === key ? '#000' : 'white',
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

      {/* Race Results */}
      {gameState === 'finished' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.9)',
          padding: '30px',
          borderRadius: '15px',
          color: 'white',
          textAlign: 'center',
          minWidth: '300px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '20px' }}>
            {winner === 'player' ? '🏆 Victory!' : '🤖 AI Wins!'}
          </div>
          <div style={{ fontSize: '18px', marginBottom: '20px' }}>
            Race Time: {formatTime(raceTime)}
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                background: '#00ff00',
                border: 'none',
                borderRadius: '6px',
                color: '#000',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Race Again
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}