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
import { RaceTracker, getRandomTrack, getStartingPositions, createThirdPersonCamera } from '../utils/raceUtils';

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
  const [selectedTrack, setSelectedTrack] = useState(getRandomTrack()); // Random track selection
  const [raceTracker, setRaceTracker] = useState(null);
  const [playerLaps, setPlayerLaps] = useState({ p1: 0, p2: 0 });
  const [racePosition, setRacePosition] = useState(1);
  const [hasGivenUp, setHasGivenUp] = useState(false);
  const [winner, setWinner] = useState(null);
  const [lobbyClient, setLobbyClient] = useState(null);

  // Get lobby parameters
  const urlParams = new URLSearchParams(window.location.search);
  const lobbyCode = urlParams.get('code');
  const playerRole = urlParams.get('role');
  const carConfig = JSON.parse(decodeURIComponent(urlParams.get('car') || '{}'));
  const playerProgram = urlParams.get('program') ? JSON.parse(decodeURIComponent(urlParams.get('program'))) : null;

  // Initialize lobby client for give up functionality
  useEffect(() => {
    if (lobbyCode && playerRole) {
      getLobbyClient().then(client => {
        setLobbyClient(client);
        
        // Listen for give up messages
        client.on('lobby-message', (message) => {
          if (message.code === lobbyCode && message.data.type === 'give-up') {
            if (message.data.playerRole !== playerRole) {
              // Other player gave up, we win!
              setWinner(playerRole);
              setGameState('finished');
            }
          }
        });
      }).catch(error => {
        console.error('Failed to connect to lobby:', error);
      });
    }
  }, [lobbyCode, playerRole]);

  const handleGiveUp = () => {
    if (lobbyClient && !hasGivenUp && gameState === 'racing') {
      setHasGivenUp(true);
      setWinner(playerRole === 'p1' ? 'p2' : 'p1');
      setGameState('finished');
      
      // Notify other player
      lobbyClient.send({
        type: 'lobby-message',
        code: lobbyCode,
        data: {
          type: 'give-up',
          playerRole: playerRole
        }
      });
    }
  };

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

    // Initialize race tracker
    const tracker = new RaceTracker(trackData.curve, 3); // 3 laps
    setRaceTracker(tracker);

    // Get starting positions on the track
    const startingPositions = getStartingPositions(trackData.curve, 2);

    // Create cars for both players
    const cars = {};
    const adapters = {};
    const sensors = {};
    const limiters = {};
    const runtimes = {};

    // Player 1 car (red for current player, blue for other)
    const { group: car1Group, wheels: car1Wheels } = buildLowPolyCar({ 
      scale: 0.6, 
      wheelType: carConfig.wheels || 'standard',
      bodyColor: playerRole === 'p1' ? 0xff4444 : 0x4444ff
    });
    car1Group.position.copy(startingPositions[0]);
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

    // Player 2 car (red for current player, blue for other)
    const { group: car2Group, wheels: car2Wheels } = buildLowPolyCar({ 
      scale: 0.6, 
      wheelType: carConfig.wheels || 'standard',
      bodyColor: playerRole === 'p2' ? 0xff4444 : 0x4444ff
    });
    car2Group.position.copy(startingPositions[1]);
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

    // Add players to race tracker
    tracker.addPlayer('p1', car1Group.position);
    tracker.addPlayer('p2', car2Group.position);

    // Third-person camera setup
    const followCar = cars[playerRole];
    const { camera: thirdPersonCamera, updateCamera } = createThirdPersonCamera(followCar, scene);
    camera.copy(thirdPersonCamera);

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
        if (gameState === 'racing' && !hasGivenUp) {
          const sensorData = sensors[playerId].sample(colliders);
          const desired = runtimes[playerId].step({ 
            sensors: sensorData, 
            speed: adapters[playerId].getScalarSpeed() 
          });
          const safe = limiters[playerId].filterControls(desired, adapters[playerId].getScalarSpeed());
          adapters[playerId].setControls(safe);
        }
        adapters[playerId].tick(dt);
        
        // Update race tracker
        if (tracker) {
          tracker.updatePlayer(playerId, cars[playerId].position);
        }
      });

      // Update third-person camera
      updateCamera();

      // Update race progress
      if (tracker) {
        const p1Progress = tracker.getPlayerProgress('p1');
        const p2Progress = tracker.getPlayerProgress('p2');
        
        if (p1Progress && p2Progress) {
          setPlayerLaps({
            p1: p1Progress.currentLap,
            p2: p2Progress.currentLap
          });
          
          setPlayerPositions({
            p1: p1Progress.position,
            p2: p2Progress.position
          });
          
          setRacePosition(tracker.getPositionOnTrack(playerRole));
          
          // Check for race finish
          if (tracker.isRaceFinished() && !winner) {
            const raceWinner = tracker.getWinner();
            setWinner(raceWinner);
            setGameState('finished');
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
            {playerLaps[playerRole]} / 3
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
        🏁 {TRACKS[selectedTrack].name}
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
            onClick={handleGiveUp}
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
          border: '2px solid #ff6b9d'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>
            {winner === playerRole ? '🏆' : hasGivenUp ? '🏳️' : '😔'}
          </div>
          <div style={{ fontSize: '32px', marginBottom: '20px', fontWeight: 'bold' }}>
            {winner === playerRole ? 'Victory!' : 
             hasGivenUp ? 'You Gave Up' : 
             'You Lost'}
          </div>
          <div style={{ fontSize: '18px', marginBottom: '30px', opacity: 0.8 }}>
            {hasGivenUp ? 'Better luck next time!' : 
             winner === playerRole ? 'Congratulations on your win!' : 
             'Great race! Try again?'}
          </div>
          <div style={{ fontSize: '16px', marginBottom: '30px' }}>
            <div>Final Time: {formatTime(raceTime)}</div>
            <div>Track: {TRACKS[selectedTrack].name}</div>
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
          <div style={{ marginBottom: '20px' }}>🏁 Get Ready!</div>
          <div style={{ fontSize: '18px', opacity: 0.8 }}>
            Track: {TRACKS[selectedTrack].name}
          </div>
          <div style={{ fontSize: '16px', marginTop: '10px', opacity: 0.6 }}>
            Race starting in 3 seconds...
          </div>
        </div>
      )}
    </div>
  );
}