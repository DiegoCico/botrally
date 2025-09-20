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
import { RaceTracker, getRandomTrack, getStartingPositions, createThirdPersonCamera } from '../utils/raceUtils';

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
  const [selectedTrack, setSelectedTrack] = useState(getRandomTrack()); // Random track selection
  const [winner, setWinner] = useState(null);
  const [raceTracker, setRaceTracker] = useState(null);
  const [playerLaps, setPlayerLaps] = useState({ player: 0, ai: 0 });
  const [racePosition, setRacePosition] = useState(1);
  const [hasGivenUp, setHasGivenUp] = useState(false);

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

    // Initialize race tracker
    const tracker = new RaceTracker(trackData.curve, 3); // 3 laps
    setRaceTracker(tracker);

    // Get starting positions on the track
    const startingPositions = getStartingPositions(trackData.curve, 2);

    // Create cars
    const cars = {};
    const adapters = {};
    const sensors = {};
    const limiters = {};
    const runtimes = {};

    // Player car (red)
    const { group: playerCarGroup, wheels: playerCarWheels } = buildLowPolyCar({ 
      scale: 0.6, 
      wheelType: carConfig.wheels || 'standard',
      bodyColor: 0xff4444
    });
    playerCarGroup.position.copy(startingPositions[0]);
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

    // AI car (blue)
    const { group: aiCarGroup, wheels: aiCarWheels } = buildLowPolyCar({ 
      scale: 0.6, 
      wheelType: carConfig.wheels || 'standard',
      bodyColor: 0x4444ff
    });
    aiCarGroup.position.copy(startingPositions[1]);
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

    // Add players to race tracker
    tracker.addPlayer('player', playerCarGroup.position);
    tracker.addPlayer('ai', aiCarGroup.position);

    // Third-person camera setup
    const followCar = cars.player;
    const { camera: thirdPersonCamera, updateCamera } = createThirdPersonCamera(followCar, scene);
    camera.copy(thirdPersonCamera);

    const handleGiveUp = () => {
      if (!hasGivenUp && gameState === 'racing') {
        setHasGivenUp(true);
        setWinner('ai');
        setGameState('finished');
      }
    };

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
        if (gameState === 'racing' && !raceFinished && !hasGivenUp) {
          const sensorData = sensors[carId].sample(colliders);
          const desired = runtimes[carId].step({ 
            sensors: sensorData, 
            speed: adapters[carId].getScalarSpeed() 
          });
          const safe = limiters[carId].filterControls(desired, adapters[carId].getScalarSpeed());
          adapters[carId].setControls(safe);
        }
        adapters[carId].tick(dt);
        
        // Update race tracker
        if (tracker) {
          tracker.updatePlayer(carId, cars[carId].position);
        }
      });

      // Update third-person camera
      updateCamera();

      // Update race progress
      if (tracker) {
        const playerProgress = tracker.getPlayerProgress('player');
        const aiProgress = tracker.getPlayerProgress('ai');
        
        if (playerProgress && aiProgress) {
          setPlayerLaps({
            player: playerProgress.currentLap,
            ai: aiProgress.currentLap
          });
          
          setPlayerPosition(playerProgress.position);
          setAiPosition(aiProgress.position);
          setRacePosition(tracker.getPositionOnTrack('player'));
          
          // Check for race finish
          if (tracker.isRaceFinished() && !winner && !hasGivenUp) {
            const raceWinner = tracker.getWinner();
            setWinner(raceWinner);
            setGameState('finished');
            raceFinished = true;
          }
        }
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
      
      {/* Race HUD - Top Right */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '15px',
        borderRadius: '10px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '16px',
        minWidth: '200px'
      }}>
        {/* Lap Counter */}
        <div style={{ marginBottom: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>LAP</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {playerLaps.player} / 3
          </div>
        </div>
        
        {/* Timer */}
        <div style={{ marginBottom: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>TIME</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {formatTime(raceTime)}
          </div>
        </div>
        
        {/* Position */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>POSITION</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: racePosition === 1 ? '#00ff00' : '#ff6b9d' }}>
            {racePosition} / 2
          </div>
        </div>
      </div>

      {/* Track Name - Top Left */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '10px 15px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '16px',
        fontWeight: 'bold'
      }}>
        🤖 {TRACKS[selectedTrack].name} vs AI ({aiDifficulty})
      </div>

      {/* Give Up Button - Bottom Center */}
      {gameState === 'racing' && !hasGivenUp && (
        <div style={{
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center'
        }}>
          <button
            onClick={() => {
              setHasGivenUp(true);
              setWinner('ai');
              setGameState('finished');
            }}
            style={{
              padding: '12px 24px',
              background: 'rgba(255, 0, 0, 0.8)',
              border: '2px solid #ff4444',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 0, 0, 1)';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 0, 0, 0.8)';
              e.target.style.transform = 'scale(1)';
            }}
          >
            🏳️ Give Up
          </button>
        </div>
      )}

      {/* Starting Countdown */}
      {gameState === 'waiting' && (
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
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          <div style={{ marginBottom: '20px' }}>🤖 AI Challenge!</div>
          <div style={{ fontSize: '18px', opacity: 0.8 }}>
            Track: {TRACKS[selectedTrack].name}
          </div>
          <div style={{ fontSize: '16px', marginTop: '10px', opacity: 0.6 }}>
            Difficulty: {aiDifficulty}
          </div>
          <div style={{ fontSize: '16px', marginTop: '10px', opacity: 0.6 }}>
            Race starting in 3 seconds...
          </div>
        </div>
      )}

      {/* Race Results */}
      {gameState === 'finished' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.95)',
          padding: '40px',
          borderRadius: '20px',
          color: 'white',
          textAlign: 'center',
          minWidth: '400px',
          border: '2px solid #00ffff'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>
            {winner === 'player' ? '🏆' : hasGivenUp ? '🏳️' : '🤖'}
          </div>
          <div style={{ fontSize: '32px', marginBottom: '20px', fontWeight: 'bold' }}>
            {winner === 'player' ? 'Victory!' : 
             hasGivenUp ? 'You Gave Up' : 
             'AI Wins!'}
          </div>
          <div style={{ fontSize: '18px', marginBottom: '30px', opacity: 0.8 }}>
            {hasGivenUp ? 'Better luck next time!' : 
             winner === 'player' ? 'You beat the AI!' : 
             'The AI was too strong this time!'}
          </div>
          <div style={{ fontSize: '16px', marginBottom: '30px' }}>
            <div>Final Time: {formatTime(raceTime)}</div>
            <div>Track: {TRACKS[selectedTrack].name}</div>
            <div>AI Difficulty: {aiDifficulty}</div>
          </div>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                background: '#00ff00',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              Race Again
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '12px 24px',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px'
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