// src/pages/AIRacePageR3F.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
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
  technical: { name: 'Technical Track', builder: buildTechnicalTrack },
};

/* ------------------------------ URL / programs ---------------------------- */
function useUrlParams() {
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const parseParam = useCallback((name, defVal) => {
    const raw = urlParams.get(name);
    if (!raw) return defVal;
    try { return JSON.parse(decodeURIComponent(raw)); } catch { return defVal; }
  }, [urlParams]);
  return { urlParams, parseParam };
}

function useRacePrograms() {
  const { urlParams, parseParam } = useUrlParams();
  const defaultPlayerProgram = useMemo(() => ([
    { if: 'f_min < 10', then: { throttle: '0.3', steer: '(r_min - l_min) * 0.05' } },
    { if: 'f_min >= 10 && f_min < 20', then: { throttle: '0.7', steer: '(r_min - l_min) * 0.03' } },
    { if: 'f_min >= 20', then: { throttle: '1.0', steer: '(r_min - l_min) * 0.02' } },
  ]), []);
  const defaultAIProgram = useMemo(() => ([
    { if: 'f_min < 8', then: { throttle: '0.4', steer: '(r_min - l_min) * 0.06' } },
    { if: 'f_min >= 8 && f_min < 15', then: { throttle: '0.8', steer: '(r_min - l_min) * 0.04' } },
    { if: 'f_min >= 15', then: { throttle: '0.9', steer: '(r_min - l_min) * 0.025' } },
  ]), []);
  const carConfig = parseParam('car', {});
  const rawPlayerProgram = parseParam('program', []);
  const rawAIProgram = parseParam('aiProgram', []);
  const aiDifficulty = urlParams.get('aiDifficulty') || 'medium';

  return {
    carConfig,
    aiDifficulty,
    playerProgram: Array.isArray(rawPlayerProgram) && rawPlayerProgram.length ? rawPlayerProgram : defaultPlayerProgram,
    aiProgram: Array.isArray(rawAIProgram) && rawAIProgram.length ? rawAIProgram : defaultAIProgram,
  };
}

/* ------------------------------ Scene bits -------------------------------- */
function LightsAndGround() {
  const group = useMemo(() => {
    const tempScene = new THREE.Scene();
    addLightsAndGround(tempScene, { groundColor: 0x0f3d0f });
    const g = new THREE.Group();
    tempScene.children.forEach((c) => g.add(c));
    return g;
  }, []);
  return <primitive object={group} />;
}

function Track({ type, onReady }) {
  const data = useMemo(() => {
    const d = TRACKS[type].builder({ closed: true });
    return {
      group: d?.group ?? d,
      curve: d?.curve,
      mesh: d?.mesh,
      walls: d?.walls ?? {},
      blockers: d?.blockers ?? {},
    };
  }, [type]);

  useEffect(() => {
    if (!data?.group) return;
    const colliders = [];
    if (data.mesh) colliders.push(data.mesh);
    if (data.walls?.left) colliders.push(data.walls.left);
    if (data.walls?.right) colliders.push(data.walls.right);
    if (data.blockers?.end) colliders.push(data.blockers.end);
    onReady?.({ ...data, colliders });
  }, [data, onReady]);

  return data?.group ? <primitive object={data.group} /> : null;
}

function Car({ config, color = 0x4444ff, scale = 0.6, onReady }) {
  const car = useMemo(() => buildLowPolyCar({
    scale,
    wheelType: config?.wheels || 'standard',
    spoilerType: config?.spoiler || 'none',
    bodyColor: color,
  }), [config, color, scale]);

  useEffect(() => { onReady?.(car); }, [car, onReady]);
  return <primitive object={car.group} />;
}

function FollowCamera({ targetRef }) {
  const { camera } = useThree();
  const offset = useMemo(() => new THREE.Vector3(-15, 8, 0), []);
  const lookAhead = useMemo(() => new THREE.Vector3(10, 2, 0), []);

  useFrame(() => {
    const car = targetRef?.current;
    if (!car) return;
    const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(car.quaternion);
    const targetPos = car.position.clone().addScaledVector(forward, offset.x).add(new THREE.Vector3(0, offset.y, 0));
    camera.position.lerp(targetPos, 0.15);
    const lookAt = car.position.clone().addScaledVector(forward, lookAhead.x).add(new THREE.Vector3(0, lookAhead.y, 0));
    camera.lookAt(lookAt);
  });
  return null;
}

/* --------------------------- Game orchestrator ---------------------------- */
function Game({ selectedTrack, playerProgram, aiProgram, carConfig, onUI }) {
  // Refs
  const trackRef = useRef(null);   // { group, curve, colliders }
  const playerRef = useRef(null);  // THREE.Group
  const aiRef = useRef(null);      // THREE.Group

  const adapters = useRef({ player: null, ai: null });
  const sensors = useRef({ player: null, ai: null });
  const limiters = useRef({ player: null, ai: null });
  const runtimes = useRef({ player: null, ai: null });

  const gameStateRef = useRef('waiting');
  const startTimeRef = useRef(null);
  const finishedRef = useRef(false);
  const clockRef = useRef(new THREE.Clock());
  const uiAccumulator = useRef(0);
  const uiProgress = useRef({ player: 0, ai: 0 });

  const isReadyToPlace = useCallback(() => {
    return !!(trackRef.current?.curve && playerRef.current && aiRef.current);
  }, []);

  function placeCars(curve) {
    if (!playerRef.current || !aiRef.current) return;

    const startPoint = new THREE.Vector3();
    const startTangent = new THREE.Vector3();
    const startSide = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    curve.getPoint(0, startPoint);
    curve.getTangent(0, startTangent).normalize();
    if (startTangent.lengthSq() < 1e-4) startTangent.set(1, 0, 0);
    startSide.crossVectors(up, startTangent).normalize();
    if (startSide.lengthSq() < 1e-4) startSide.set(0, 0, 1);
    startPoint.add(startTangent.clone().multiplyScalar(3));

    const findGroundHeight = (pos) => {
      const group = trackRef.current?.group;
      if (!group) return 0;
      const raycaster = new THREE.Raycaster();
      const origin = pos.clone(); origin.y = 200;
      raycaster.set(origin, new THREE.Vector3(0, -1, 0));
      const hits = raycaster.intersectObject(group, true);
      if (hits.length > 0) return hits[0].point.y;
      const p = new THREE.Vector3(); curve.getPoint(0, p); return p.y;
    };

    const pStart = startPoint.clone().addScaledVector(startSide, -2.5);
    pStart.y = findGroundHeight(pStart) + 1.0;
    const aStart = startPoint.clone().addScaledVector(startSide, 2.5);
    aStart.y = findGroundHeight(aStart) + 1.0;

    playerRef.current.position.copy(pStart);
    aiRef.current.position.copy(aStart);

    const carForwardLocal = new THREE.Vector3(1, 0, 0);
    const targetDir = startTangent.clone().normalize().negate();
    playerRef.current.quaternion.setFromUnitVectors(carForwardLocal, targetDir);
    aiRef.current.quaternion.setFromUnitVectors(carForwardLocal, targetDir);
  }

  const tryPlaceCars = useCallback(() => {
    if (!isReadyToPlace()) return false;
    placeCars(trackRef.current.curve);
    return true;
  }, [isReadyToPlace]);

  const handleTrackReady = useCallback(({ group, curve, colliders }) => {
    trackRef.current = { group, curve, colliders };
    tryPlaceCars();
  }, [tryPlaceCars]);

  const onPlayerReady = useCallback(({ group, wheels }) => {
    playerRef.current = group;
    adapters.current.player = new CarAdapter(
      { group, wheels },
      { wheelBase: 2.7, tireRadius: 0.55, maxSteerRad: THREE.MathUtils.degToRad(30) }
    );
    sensors.current.player = new SensorRig(group, { rayLength: 35 });
    limiters.current.player = new SafetyLimiter({
      adapter: adapters.current.player,
      carSpecs: { maxSpeedFwd: 28, maxSpeedRev: 7, maxAccel: 12, maxBrake: 18 },
    });
    runtimes.current.player = new BlockRuntime(playerProgram);
    tryPlaceCars();
  }, [playerProgram, tryPlaceCars]);

  const onAIReady = useCallback(({ group, wheels }) => {
    aiRef.current = group;
    adapters.current.ai = new CarAdapter(
      { group, wheels },
      { wheelBase: 2.7, tireRadius: 0.55, maxSteerRad: THREE.MathUtils.degToRad(30) }
    );
    sensors.current.ai = new SensorRig(group, { rayLength: 35 });
    limiters.current.ai = new SafetyLimiter({
      adapter: adapters.current.ai,
      carSpecs: { maxSpeedFwd: 28, maxSpeedRev: 7, maxAccel: 12, maxBrake: 18 },
    });
    runtimes.current.ai = new BlockRuntime(aiProgram);
    tryPlaceCars();
  }, [aiProgram, tryPlaceCars]);

  // Start countdown only when everything is ready
  useEffect(() => {
    if (!isReadyToPlace()) return;
    tryPlaceCars();

    gameStateRef.current = 'waiting';
    finishedRef.current = false;
    startTimeRef.current = null;
    uiAccumulator.current = 0;
    uiProgress.current = { player: 0, ai: 0 };
    clockRef.current.getElapsedTime();

    const t = setTimeout(() => {
      gameStateRef.current = 'racing';
      startTimeRef.current = clockRef.current.getElapsedTime();
    }, 3000);

    return () => clearTimeout(t);
  }, [selectedTrack, playerProgram, aiProgram, isReadyToPlace, tryPlaceCars]);

  // Main loop
  useFrame(() => {
    if (!isReadyToPlace()) return;

    const { curve, colliders = [] } = trackRef.current;
    const dt = clockRef.current.getDelta();
    const elapsed = clockRef.current.getElapsedTime();
    uiAccumulator.current += dt;

    ['player', 'ai'].forEach((id) => {
      if (gameStateRef.current === 'racing' && !finishedRef.current) {
        const sensorData = sensors.current[id].sample(colliders);
        const desired = runtimes.current[id].step({ sensors: sensorData, speed: adapters.current[id].getScalarSpeed() });
        const safe = limiters.current[id].filterControls(desired, adapters.current[id].getScalarSpeed());
        adapters.current[id].setControls(safe);
      }
      adapters.current[id].tick(dt, colliders);
    });

    const findProgress = (pos) => {
      let min = Infinity, bestU = 0;
      const tmp = new THREE.Vector3();
      for (let u = 0; u <= 1; u += 0.01) {
        curve.getPoint(u, tmp);
        const d = pos.distanceTo(tmp);
        if (d < min) { min = d; bestU = u; }
      }
      return bestU;
    };

    const pProg = findProgress(playerRef.current.position);
    const aProg = findProgress(aiRef.current.position);

    if (uiAccumulator.current >= 0.1) {
      const raceTime =
        gameStateRef.current === 'racing' && startTimeRef.current != null
          ? elapsed - startTimeRef.current
          : 0;
      uiProgress.current = { player: pProg * 100, ai: aProg * 100 };
      onUI?.({
        gameState: gameStateRef.current,
        raceTime,
        playerProgress: uiProgress.current.player,
        aiProgress: uiProgress.current.ai,
      });
      uiAccumulator.current = 0;
    }

    if (gameStateRef.current === 'racing' && !finishedRef.current && (pProg >= 0.95 || aProg >= 0.95)) {
      finishedRef.current = true;
      const winner = pProg >= aProg ? 'player' : 'ai';
      onUI?.({
        gameState: 'finished',
        raceTime: elapsed - (startTimeRef.current ?? elapsed),
        playerProgress: pProg * 100,
        aiProgress: aProg * 100,
        winner,
      });
      gameStateRef.current = 'finished';
    }
  });

  const bodyColor = useMemo(() => {
    const map = { mk1: 0xc0455e, blue: 0x3366ff, green: 0x33cc66 };
    return map[carConfig?.body] ?? 0x4444ff;
  }, [carConfig]);

  return (
    <>
      <LightsAndGround />
      <Environment preset="night" />
      <Track type={selectedTrack} onReady={handleTrackReady} />
      <Car config={carConfig} color={bodyColor} scale={0.6} onReady={onPlayerReady} />
      <Car config={carConfig} color={0xff4444} scale={0.6} onReady={onAIReady} />
      <FollowCamera targetRef={playerRef} />
    </>
  );
}

/* ------------------------------ Page Shell -------------------------------- */
export default function AIRacePageR3F() {
  const { playerProgram, aiProgram, carConfig, aiDifficulty } = useRacePrograms();
  const [selectedTrack, setSelectedTrack] = useState('flat');
  const [ui, setUI] = useState({
    gameState: 'waiting',
    raceTime: 0,
    playerProgress: 0,
    aiProgress: 0,
    winner: null,
  });

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas
        dpr={[1, 2]}
        shadows
        camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 10, 20] }}
        gl={{ powerPreference: 'high-performance', antialias: true }}
      >
        <Game
          selectedTrack={selectedTrack}
          playerProgram={playerProgram}
          aiProgram={aiProgram}
          carConfig={carConfig}
          onUI={setUI}
        />
      </Canvas>

      {/* UI Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          padding: '20px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
          color: 'white',
          fontFamily: 'monospace',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>🤖 AI Race Challenge (R3F)</div>
          <div style={{ fontSize: '18px' }}>
            Difficulty: <span style={{ color: '#00ffff' }}>{aiDifficulty}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div
            style={{
              padding: '8px 16px',
              background:
                ui.gameState === 'waiting'
                  ? '#ff6b00'
                  : ui.gameState === 'racing'
                  ? '#00ff6b'
                  : ui.winner === 'player'
                  ? '#00ff00'
                  : '#ff0000',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            {ui.gameState === 'waiting'
              ? '⏳ Starting...'
              : ui.gameState === 'racing'
              ? '🏃 Racing!'
              : ui.winner === 'player'
              ? '🏆 You Win!'
              : '🤖 AI Wins!'}
          </div>

          {ui.gameState === 'racing' && (
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Time: {formatTime(ui.raceTime)}</div>
          )}
        </div>

        {/* Player vs AI Status */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginTop: '15px',
            maxWidth: '400px',
          }}
        >
          <div
            style={{
              padding: '10px',
              background: 'rgba(68, 68, 255, 0.3)',
              borderRadius: '8px',
              border: ui.winner === 'player' ? '2px solid #00ff00' : '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>👤 You (Player)</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Progress: {ui.playerProgress.toFixed(1)}%</div>
          </div>

          <div
            style={{
              padding: '10px',
              background: 'rgba(255, 68, 68, 0.3)',
              borderRadius: '8px',
              border: ui.winner === 'ai' ? '2px solid #ff0000' : '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>🤖 Cerebras AI</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Progress: {ui.aiProgress.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Track Selection (only before race starts) */}
      {ui.gameState === 'waiting' && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            right: '20px',
            background: 'rgba(0,0,0,0.8)',
            padding: '15px',
            borderRadius: '10px',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ fontWeight: 'bold' }}>Select Track:</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                  fontSize: '14px',
                }}
              >
                {track.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Finish Modal */}
      {ui.gameState === 'finished' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.9)',
            padding: '30px',
            borderRadius: '15px',
            color: 'white',
            textAlign: 'center',
            minWidth: '300px',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '20px' }}>
            {ui.winner === 'player' ? '🏆 Victory!' : '🤖 AI Wins!'}
          </div>
          <div style={{ fontSize: '18px', marginBottom: '20px' }}>Race Time: {formatTime(ui.raceTime)}</div>
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
                fontWeight: 'bold',
              }}
            >
              Race Again
            </button>
            <button
              onClick={() => (window.location.href = '/')}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
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
