// src/pages/CarBlocksPage.js
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

  const [runtime, setRuntime] = useState(() => new BlockRuntime([
    { if: 'f_min < 10', then: { throttle: '0.2', steer: '(r_min - l_min) * 0.06' } },
    { if: 'f_min >= 10 && f_min < 20', then: { throttle: '0.6', steer: '(r_min - l_min) * 0.03' } },
    { if: 'f_min >= 20', then: { throttle: '1.0', steer: '(r_min - l_min) * 0.02' } }
  ]));

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
    if (isReady) {
      setIsReady(false);
      sendStatusUpdate('coding');
    }
  };

  // ---------- Three.js setup with safe WebGL lifecycle ----------
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Pre-clean any stray canvases/contexts inside this container
    Array.from(container.querySelectorAll('canvas')).forEach((c) => {
      try {
        const gl = c.getContext('webgl') || c.getContext('webgl2');
        const lose = gl && gl.getExtension && gl.getExtension('WEBGL_lose_context');
        if (gl && !gl.isContextLost?.()) lose?.loseContext?.();
      } catch {}
      c.parentNode?.removeChild(c);
    });

    // Build a dedicated canvas to avoid sharing renderer DOM with others
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    let renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    // (Keep your background via scene.background below)
    // Shadow settings are kept as you had them (only lights/ground used shadows)
    // If you ever enable shadows, ensure to set renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x16181e);

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 500);
    camera.position.set(16, 10, 16);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lights/ground (unchanged)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(12, 18, 8);
    sun.castShadow = true;
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0x3b3f49 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Obstacles (unchanged)
    const obstacles = [];
    for (let i = 0; i < 8; i++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(2, 1, 2),
        new THREE.MeshStandardMaterial({ color: 0x854444 })
      );
      box.position.set((Math.random() - 0.5) * 60, 0.5, (Math.random() - 0.5) * 60);
      box.castShadow = true;
      scene.add(box);
      obstacles.push(box);
    }
    const colliders = [ground, ...obstacles];

    let group, wheels;
    const setupCar = async () => {
      const api = await buildLowPolyCar({
        scale: 0.5,
        wheelType: carConfig?.wheels || 'slim',
        spoilerType: carConfig?.spoiler || 'none',
        bodyColor: carConfig?.bodyColor || 0x34d399,
      });
      group = api.group;
      wheels = api.wheels;

      group.position.set(0, 0.55, 0);
      group.castShadow = true;
      scene.add(group);
    };

    let car, limiter, sensors;
    let clock = new THREE.Clock();

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      renderer.setSize(w, h); // keep your behavior
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    let disposed = false;

    const loop = () => {
      if (disposed) return;
      const dt = clock.getDelta();
      controls.update();

      // Only tick car logic once it exists
      if (car && limiter && sensors) {
        const sensorData = sensors.sample(colliders);
        const desired = runtime.step({ sensors: sensorData, speed: car.getScalarSpeed() });
        const safe = limiter.filterControls(desired, car.getScalarSpeed());
        car.setControls(safe);
        car.tick(dt);
      }

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(loop);
    };

    // Async setup → then start loop
    (async () => {
      await setupCar();
      car = new CarAdapter(
        { group, wheels },
        { wheelBase: 2.7, tireRadius: 0.55, maxSteerRad: THREE.MathUtils.degToRad(30) }
      );
      const carSpecs = { maxSpeedFwd: 28, maxSpeedRev: 7, maxAccel: 12, maxBrake: 18 };
      limiter = new SafetyLimiter({ adapter: car, carSpecs });
      sensors = new SensorRig(group, { rayLength: 35 });

      loop();
    })();

    // Cleanup: cancel RAF → remove listener → dispose scene → dispose renderer → lose context if needed
    return () => {
      disposed = true;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;

      window.removeEventListener('resize', onResize);

      // Dispose materials (and any attached textures) + geometries
      const disposeMaterial = (m) => {
        if (!m) return;
        const maps = [
          'map','normalMap','roughnessMap','metalnessMap','bumpMap','alphaMap',
          'emissiveMap','aoMap','specularMap','envMap','clearcoatNormalMap',
          'clearcoatRoughnessMap','sheenColorMap','sheenRoughnessMap',
          'transmissionMap','thicknessMap','displacementMap'
        ];
        maps.forEach(k => { try { m[k]?.dispose?.(); } catch {} });
        try { m.dispose?.(); } catch {}
      };

      try { controls.dispose?.(); } catch {}

      scene.traverse((o) => {
        if (o.isMesh || o.isLine || o.isPoints) {
          try { o.geometry?.dispose?.(); } catch {}
          if (Array.isArray(o.material)) o.material.forEach(disposeMaterial);
          else disposeMaterial(o.material);
        }
      });

      // Dispose renderer and lose context only if not already lost
      try {
        const gl = renderer.getContext?.();
        const alreadyLost = gl?.isContextLost?.();
        renderer.dispose?.();
        if (gl && !alreadyLost) {
          const lose = gl.getExtension?.('WEBGL_lose_context');
          lose?.loseContext?.();
        }
      } catch {}

      // Remove canvas from DOM
      try {
        const dom = renderer.domElement;
        if (dom && dom.parentNode === container) container.removeChild(dom);
      } catch {}
      
      // Null local refs
      renderer = null;
    };
  }, [runtime, carConfig]);

  return (
    <div style={{ display: 'grid', gridTemplateRows: '1fr 360px', height: '100vh' }}>
      <div style={{ position: 'relative' }}>
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
        
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
      
      <BlockWorkbench onProgramCompiled={handleProgramCompiled} />
      
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
