import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { buildLowPolyCar } from '../components/car/LowPolyCar';
import { CarAdapter } from '../components/functions/CarAdapter';
import { SensorRig } from '../components/functions/SensorRig';
import { BlockRuntime } from '../components/functions/BlockRuntime';
import BlockWorkbench from '../components/blocks/BlockWorkbench';
import { SafetyLimiter } from '../components/blocks/SafetyLimiter';
import { getLobbyClient } from '../net/websocket-lobby';
import cerebrasAI from '../services/cerebras-ai';

export default function CarBlocksPage() {
  const navigate = useNavigate();
  const mountRef = useRef(null);
  const rafRef = useRef(0);

  const [runtime, setRuntime] = useState(() => new BlockRuntime([])); // Start with empty program
  const [isRunning, setIsRunning] = useState(false); // Track if code is running
  const [hasProgram, setHasProgram] = useState(false); // Track if user has created a program

  const urlParams = new URLSearchParams(window.location.search);
  const lobbyCode = urlParams.get('code');
  const playerRole = urlParams.get('role');
  const aiMode = urlParams.get('mode') === 'ai';
  const carConfig = urlParams.get('car') ? JSON.parse(decodeURIComponent(urlParams.get('car'))) : null;
  const isMultiplayer = lobbyCode && playerRole;
  const isAI = aiMode;

  const [isReady, setIsReady] = useState(false);
  const [otherPlayerReady, setOtherPlayerReady] = useState(false);
  const [otherPlayerStatus, setOtherPlayerStatus] = useState('coding');
  const [lobbyClient, setLobbyClient] = useState(null);
  
  const [aiStatus, setAiStatus] = useState('thinking');
  const [aiAlgorithm, setAiAlgorithm] = useState(null);

  useEffect(() => {
    if (isMultiplayer) {
      getLobbyClient().then(client => {
        setLobbyClient(client);
        
        const unsubscribe = client.on('lobby-message', (message) => {
          if (message.code === lobbyCode && message.data.type === 'player-status') {
            if (message.data.playerRole !== playerRole) {
              setOtherPlayerStatus(message.data.status);
              setOtherPlayerReady(message.data.status === 'ready');
            }
          }
        });

        return () => {
          unsubscribe();
        };
      }).catch(error => {
        console.error('Failed to connect to lobby:', error);
      });
    }
  }, [isMultiplayer, lobbyCode, playerRole]);

  useEffect(() => {
    if (lobbyClient && isMultiplayer) {
      sendStatusUpdate('coding');
    }
  }, [lobbyClient, isMultiplayer]);

  useEffect(() => {
    if (isAI) {
      setAiStatus('thinking');
      setTimeout(async () => {
        try {
          const playerStrategy = cerebrasAI.analyzePlayerStrategy(runtime.rules);
          const aiAlgo = await cerebrasAI.generateRacingAlgorithm('flat', 'medium', playerStrategy);
          setAiAlgorithm(aiAlgo);
          setAiStatus('ready');
        } catch (error) {
          console.error('Failed to generate AI algorithm:', error);
          const fallbackAlgo = cerebrasAI.getFallbackAlgorithm('flat', 'medium');
          setAiAlgorithm(fallbackAlgo);
          setAiStatus('ready');
        }
      }, 2000);
    }
  }, [isAI, runtime.rules]);

  const sendStatusUpdate = (status) => {
    if (lobbyClient && isMultiplayer) {
      lobbyClient.send({
        type: 'lobby-message',
        code: lobbyCode,
        data: {
          type: 'player-status',
          status: status,
          playerRole: playerRole
        }
      });
    }
  };

  const handleReadyToggle = () => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    sendStatusUpdate(newReadyState ? 'ready' : 'coding');
  };

  useEffect(() => {
    if (isMultiplayer && isReady && otherPlayerReady) {
      setTimeout(() => {
        navigate(`/multiplayerRace?code=${encodeURIComponent(lobbyCode)}&role=${playerRole}&car=${encodeURIComponent(JSON.stringify(carConfig))}&program=${encodeURIComponent(JSON.stringify(runtime.rules))}`);
      }, 1500);
    } else if (isAI && isReady && aiStatus === 'ready' && aiAlgorithm) {
      setTimeout(() => {
        navigate(`/aiRace?car=${encodeURIComponent(JSON.stringify(carConfig))}&program=${encodeURIComponent(JSON.stringify(runtime.rules))}&aiProgram=${encodeURIComponent(JSON.stringify(aiAlgorithm.rules))}&aiDifficulty=${aiAlgorithm.difficulty}`);
      }, 1500);
    }
  }, [isReady, otherPlayerReady, isMultiplayer, isAI, aiStatus, aiAlgorithm, navigate, lobbyCode, playerRole, carConfig, runtime.rules]);

  const handleProgramCompiled = (program) => {
    setRuntime(new BlockRuntime(program));
    setHasProgram(program && program.length > 0);
    setIsRunning(true); // Auto-start when compiling
    if (isReady) {
      setIsReady(false);
      sendStatusUpdate('coding');
    }
  };

  const handleRunToggle = () => {
    if (!hasProgram) return; // Can't run without a program
    setIsRunning(!isRunning);
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  useEffect(() => {
    let renderer, container, onResize;

    const setupScene = async () => {
      container = mountRef.current;
      if (!container) return;

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x16181e);

      const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 500);
      camera.position.set(16, 10, 16);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 0.6));
      const sun = new THREE.DirectionalLight(0xffffff, 0.9);
      sun.position.set(12, 18, 8);
      sun.castShadow = true;
      scene.add(sun);

      const ground = new THREE.Mesh( new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x3b3f49 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      // Create a red target wall that the car should face
      const targetWall = new THREE.Mesh(
        new THREE.BoxGeometry(20, 3, 1), 
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
      );
      targetWall.position.set(0, 1.5, 25); // 25 units ahead of car
      targetWall.castShadow = true;
      scene.add(targetWall);

      // Create obstacles around the area
      const obstacles = [targetWall];
      for (let i = 0; i < 8; i++) {
        const box = new THREE.Mesh( new THREE.BoxGeometry(2, 1, 2), new THREE.MeshStandardMaterial({ color: 0x854444 }));
        box.position.set((Math.random() - 0.5) * 60, 0.5, (Math.random() - 0.5) * 60);
        box.castShadow = true;
        scene.add(box);
        obstacles.push(box);
      }
      const colliders = [ground, ...obstacles];

      // Map car configuration to buildLowPolyCar parameters
      const getBodyColor = (bodyId) => {
        const bodyColors = {
          'mk1': 0xc0455e,
          'blue': 0x3366ff,
          'green': 0x33cc66
        };
        return bodyColors[bodyId] || 0x34d399;
      };

      const { group, wheels } = await buildLowPolyCar({
        scale: 0.5,
        wheelType: carConfig?.wheels || 'standard',
        spoilerType: carConfig?.spoiler || 'none',
        bodyColor: getBodyColor(carConfig?.body),
      });
      group.position.set(0, 0.55, 0);
      group.castShadow = true;
      scene.add(group);

      const car = new CarAdapter({ group, wheels }, { wheelBase: 2.7, tireRadius: 0.55, maxSteerRad: THREE.MathUtils.degToRad(30) });
      const carSpecs = { maxSpeedFwd: 28, maxSpeedRev: 7, maxAccel: 12, maxBrake: 18 };
      const limiter = new SafetyLimiter({ adapter: car, carSpecs });
      const sensors = new SensorRig(group, { rayLength: 35 });
      const clock = new THREE.Clock();

      onResize = () => {
        const w = container.clientWidth, h = container.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h; camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', onResize);

      const loop = () => {
        const dt = clock.getDelta();
        controls.update();

        // Only run user code if isRunning is true and we have a program
        if (isRunning && hasProgram) {
          const sensorData = sensors.sample(colliders);
          const desired = runtime.step({ sensors: sensorData, speed: car.getScalarSpeed() });
          const safe = limiter.filterControls(desired, car.getScalarSpeed());
          car.setControls(safe);
        } else {
          // Car is stopped - no controls
          car.setControls({ throttle: 0, steer: 0 });
        }
        
        car.tick(dt, colliders);

        renderer.render(scene, camera);
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    };

    setupScene();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (onResize) window.removeEventListener('resize', onResize);
      if (container && renderer) container.removeChild(renderer.domElement);
      if (renderer) renderer.dispose();
    };
  }, [runtime, carConfig, isRunning, hasProgram]);

  return (
    <div style={{ display: 'grid', gridTemplateRows: '1fr 360px', height: '100vh' }}>
      <div style={{ position: 'relative' }}>
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
        
        {/* Car Status Overlay */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '10px 15px',
          borderRadius: '8px',
          color: 'white',
          fontFamily: 'monospace',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: hasProgram ? (isRunning ? '#22c55e' : '#ef4444') : '#6b7280'
          }} />
          <span>
            {!hasProgram ? '⚙️ No Program' : isRunning ? '🏃 Car Running' : '⏸️ Car Stopped'}
          </span>
        </div>
        
        {isMultiplayer && (
          <div style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0, 0, 0, 0.8)', padding: '15px', borderRadius: '10px', color: 'white', fontFamily: 'monospace', fontSize: '14px', minWidth: '250px' }}>
            <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '16px' }}>
              🏁 Multiplayer Lobby
            </div>
            <div style={{ marginBottom: '8px' }}>
              Code: <span style={{ color: '#ff6b9d', fontWeight: 'bold' }}>{lobbyCode}</span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              You: <span style={{ color: playerRole === 'p1' ? '#ff4444' : '#4444ff', fontWeight: 'bold' }}>
                {playerRole === 'p1' ? '🏆 Host' : '🎮 Player 2'}
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px', fontSize: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '6px', background: isReady ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 165, 0, 0.2)', border: `1px solid ${isReady ? '#00ff00' : '#ffa500'}`, textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>You</div>
                <div>{isReady ? '✅ Ready' : '⚙️ Coding'}</div>
              </div>
              
              <div style={{ padding: '8px', borderRadius: '6px', background: otherPlayerReady ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 165, 0, 0.2)', border: `1px solid ${otherPlayerReady ? '#00ff00' : '#ffa500'}`, textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {playerRole === 'p1' ? 'Player 2' : 'Host'}
                </div>
                <div>{otherPlayerReady ? '✅ Ready' : '⚙️ Coding'}</div>
              </div>
            </div>

            <button
              onClick={handleReadyToggle}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none', background: isReady ? '#ff4444' : '#00ff00', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' }}
            >
              {isReady ? '❌ Not Ready' : '✅ Ready to Race!'}
            </button>

            {isReady && otherPlayerReady && (
              <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(0, 255, 0, 0.3)', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', animation: 'pulse 1s infinite' }}>
                🚀 Both players ready! Starting race...
              </div>
            )}
          </div>
        )}

        {isAI && (
          <div style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0, 0, 0, 0.8)', padding: '15px', borderRadius: '10px', color: 'white', fontFamily: 'monospace', fontSize: '14px', minWidth: '250px' }}>
            <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '16px' }}>
              🤖 AI Opponent Mode
            </div>
            <div style={{ marginBottom: '8px' }}>
              Opponent: <span style={{ color: '#00ffff', fontWeight: 'bold' }}>Cerebras AI</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px', fontSize: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '6px', background: isReady ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 165, 0, 0.2)', border: `1px solid ${isReady ? '#00ff00' : '#ffa500'}`, textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>You</div>
                <div>{isReady ? '✅ Ready' : '⚙️ Coding'}</div>
              </div>
              
              <div style={{ padding: '8px', borderRadius: '6px', background: aiStatus === 'ready' ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255, 165, 0, 0.2)', border: `1px solid ${aiStatus === 'ready' ? '#00ffff' : '#ffa500'}`, textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>AI</div>
                <div>{aiStatus === 'ready' ? '🤖 Ready' : '🧠 Thinking...'}</div>
              </div>
            </div>

            {aiAlgorithm && (
              <div style={{ marginBottom: '15px', padding: '8px', background: 'rgba(0, 255, 255, 0.1)', borderRadius: '6px', fontSize: '11px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>AI Strategy:</div>
                <div>Difficulty: {aiAlgorithm.difficulty}</div>
                <div>Rules: {aiAlgorithm.rules.length}</div>
                <div>Source: {aiAlgorithm.source === 'cerebras-ai' ? 'Cerebras AI' : 'Fallback'}</div>
              </div>
            )}

            <button
              onClick={handleReadyToggle}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none', background: isReady ? '#ff4444' : '#00ff00', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' }}
            >
              {isReady ? '❌ Not Ready' : '✅ Ready to Race AI!'}
            </button>

            {isReady && aiStatus === 'ready' && (
              <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(0, 255, 255, 0.3)', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', animation: 'pulse 1s infinite' }}>
                🚀 Ready to race AI! Starting...
              </div>
            )}
          </div>
        )}
      </div>
      
      <BlockWorkbench 
        onProgramCompiled={handleProgramCompiled}
        isRunning={isRunning}
        hasProgram={hasProgram}
        onRunToggle={handleRunToggle}
        onStop={handleStop}
      />
      
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
