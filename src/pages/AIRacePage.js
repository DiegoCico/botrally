// src/pages/AIRacePage.js
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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

  // Get parameters
  const urlParams = new URLSearchParams(window.location.search);
  const carConfig = JSON.parse(decodeURIComponent(urlParams.get('car') || '{}'));
  const playerProgram = JSON.parse(decodeURIComponent(urlParams.get('program') || '[]'));
  const aiProgram = JSON.parse(decodeURIComponent(urlParams.get('aiProgram') || '[]'));
  const aiDifficulty = urlParams.get('aiDifficulty') || 'medium';

  useEffect(() => {
    if (!playerProgram.length || !aiProgram.length) {
      navigate('/');
      return;
    }

    const container = mountRef.current;
    if (!container) return;

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
    camera.position.set(0, 25, 40);
    
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting and ground
    addLightsAndGround(scene, { groundColor: 0x0f3d0f });

    // Build selected track
    const trackData = TRACKS[selectedTrack].builder({ closed: true });
    const trackGroup = trackData?.group ?? trackData;
    if (trackGroup) scene.add(trackGroup);

    // Create cars
    const cars = {};
    const adapters = {};
    const sensors = {};
    const limiters = {};
    const runtimes = {};

    // Player car (blue)
    const { group: playerCarGroup, wheels: playerCarWheels } = buildLowPolyCar({ 
      scale: 0.6, 
      wheelType: carConfig.wheels || 'standard',
      bodyColor: 0x4444ff
    });
    playerCarGroup.position.set(-5, 1, 0);
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

    // AI car (red)
    const { group: aiCarGroup, wheels: aiCarWheels } = buildLowPolyCar({ 
      scale: 0.6, 
      wheelType: carConfig.wheels || 'standard',
      bodyColor: 0xff4444
    });
    aiCarGroup.position.set(5, 1, 0);
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

    // Collision objects
    const colliders = [];
    if (trackData?.walls) {
      if (trackData.walls.left) colliders.push(trackData.walls.left);
      if (trackData.walls.right) colliders.push(trackData.walls.right);
    }
    if (trackData?.blockers) {
      if (trackData.blockers.start) colliders.push(trackData.blockers.start);
      if (trackData.blockers.end) colliders.push(trackData.blockers.end);
    }

    const clock = new THREE.Clock();
    let startTime = null;
    let raceFinished = false;

    // Camera follow logic
    const followCar = cars.player;
    const cameraOffset = new THREE.Vector3(0, 15, 25);

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

      controls.update();

      // Update both cars
      Object.keys(cars).forEach(carId => {
        if (gameState === 'racing' && !raceFinished) {
          const sensorData = sensors[carId].sample(colliders);
          const desired = runtimes[carId].step({ 
            sensors: sensorData, 
            speed: adapters[carId].getScalarSpeed() 
          });
          const safe = limiters[carId].filterControls(desired, adapters[carId].getScalarSpeed());
          adapters[carId].setControls(safe);
        }
        adapters[carId].tick(dt);
      });

      // Camera follows player car
      if (followCar) {
        const targetPos = followCar.position.clone().add(cameraOffset);
        camera.position.lerp(targetPos, 0.05);
        camera.lookAt(followCar.position);
      }

      // Update positions and check for winner
      const playerPos = cars.player.position.distanceTo(new THREE.Vector3(0, 0, 0));
      const aiPos = cars.ai.position.distanceTo(new THREE.Vector3(0, 0, 0));
      
      setPlayerPosition(playerPos);
      setAiPosition(aiPos);

      // Check for race finish (simple distance-based for now)
      if (gameState === 'racing' && !raceFinished && (playerPos > 200 || aiPos > 200)) {
        raceFinished = true;
        setGameState('finished');
        setWinner(playerPos > aiPos ? 'player' : 'ai');
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
  }, [playerProgram, aiProgram, carConfig, selectedTrack, gameState]);

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
              Distance: {playerPosition.toFixed(1)}m
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
              Distance: {aiPosition.toFixed(1)}m
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