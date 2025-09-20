// src/pages/MultiplayerRacePage.js
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

  useEffect(() => {
    if (!lobbyCode || !playerRole) {
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

    // Create cars for both players
    const cars = {};
    const adapters = {};
    const sensors = {};
    const limiters = {};
    const runtimes = {};

    // Player 1 car (red)
    const { group: car1Group, wheels: car1Wheels } = buildLowPolyCar({ 
      scale: 0.6, 
      wheelType: carConfig.wheels || 'standard',
      bodyColor: playerRole === 'p1' ? 0xff4444 : 0x4444ff
    });
    car1Group.position.set(-5, 1, 0);
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
    runtimes.p1 = new BlockRuntime([
      { if: 'f_min < 10', then: { throttle: '0.2', steer: '(r_min - l_min) * 0.06' } },
      { if: 'f_min >= 10 && f_min < 20', then: { throttle: '0.6', steer: '(r_min - l_min) * 0.03' } },
      { if: 'f_min >= 20', then: { throttle: '1.0', steer: '(r_min - l_min) * 0.02' } }
    ]);

    // Player 2 car (blue)
    const { group: car2Group, wheels: car2Wheels } = buildLowPolyCar({ 
      scale: 0.6, 
      wheelType: carConfig.wheels || 'standard',
      bodyColor: playerRole === 'p2' ? 0xff4444 : 0x4444ff
    });
    car2Group.position.set(5, 1, 0);
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
    runtimes.p2 = new BlockRuntime([
      { if: 'f_min < 8', then: { throttle: '0.3', steer: '(r_min - l_min) * 0.08' } },
      { if: 'f_min >= 8 && f_min < 15', then: { throttle: '0.7', steer: '(r_min - l_min) * 0.04' } },
      { if: 'f_min >= 15', then: { throttle: '0.9', steer: '(r_min - l_min) * 0.025' } }
    ]);

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

    // Camera follow logic
    const followCar = cars[playerRole];
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
        adapters[playerId].tick(dt);
      });

      // Camera follows player's car
      if (followCar) {
        const targetPos = followCar.position.clone().add(cameraOffset);
        camera.position.lerp(targetPos, 0.05);
        camera.lookAt(followCar.position);
      }

      // Update positions for UI
      setPlayerPositions({
        p1: cars.p1.position.distanceTo(new THREE.Vector3(0, 0, 0)),
        p2: cars.p2.position.distanceTo(new THREE.Vector3(0, 0, 0))
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
  }, [lobbyCode, playerRole, carConfig, selectedTrack, gameState]);

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
              Distance: {playerPositions.p1.toFixed(1)}m
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
              Distance: {playerPositions.p2.toFixed(1)}m
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