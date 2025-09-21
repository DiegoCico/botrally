// src/components/HeroKartShowcase.js
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { addLightsAndGround } from './tracks/TrackUtils';
import { buildLowPolyCar } from './car/LowPolyCar';
import { buildRibbonRoad as buildRoad, makeSmoothCurve } from './tracks/TrackUtils';

export default function HeroKartShowcase() {
  const mountRef = useRef(null);
  const rafRef = useRef(0);
  const mountedRef = useRef(false); // guard for StrictMode double-mount

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const container = mountRef.current;
    if (!container) return;

    // --- Config (keep EXACTLY as provided) ---
    const CAR_SCALE = 0.38;
    const NUM_CARS = 6;
    const BASE_SPEED = 20;
    const ROAD_WIDTH = 8;
    const MAX_LATERAL = ROAD_WIDTH * 0.33;
    const CAR_COLORS = [0xff5a5a, 0x22d3ee, 0xffb020, 0x7a6cff, 0x34d399, 0xec4899];

    // --- Renderer/Scene (unchanged sizing) ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x0a0a0a, 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    // --- Camera (unchanged) ---
    const camera = new THREE.PerspectiveCamera(85, container.clientWidth / container.clientHeight, 0.1, 8000);
    const setCam = (y = 120, tilt = 0.28, diagonal = true) => {
      const horiz = y * 0.35;
      if (diagonal) camera.position.set(-horiz, y, horiz);
      else camera.position.set(0, y, y * 0.25);
      camera.lookAt(0, 0, 0);
      camera.rotation.x -= tilt;
    };
    setCam();

    // --- Lights & ground (unchanged) ---
    const env = addLightsAndGround(scene, {
      groundColor: 0x000000,
      groundSize: 12000,
      hemiIntensity: 0.6,
      dirIntensity: 1.2
    });
    if (env?.ground) env.ground.position.y = -0.05;

    const rim = new THREE.DirectionalLight(0xffffff, 0.35);
    rim.position.set(-300, 300, -200);
    scene.add(rim);

    // --- Curve (unchanged) ---
    const pts = [];
    const push = (x, y, z) => pts.push(new THREE.Vector3(x, y, z));
    push(-100, 6, 0);  push(-60, 6, 0);
    push(-40, 8, 20);  push(-30, 10, 40);
    push(-10, 12, 55); push(20, 10, 40);
    push(35, 6, 0);    push(50, 2, -10);
    push(70, -2, 0);   push(85, -4, 15);
    push(70, -6, 35);  push(50, -4, 45);
    push(20, 2, 55);   push(0, 8, 45);
    push(-20, 12, 25); push(-55, 6, -10);
    push(-95, 4, -10);

    const curve = makeSmoothCurve(pts, { closed: true, smoothIter: 3, tension: 0.5 });

    // --- Group (unchanged) ---
    const trackGroup = new THREE.Group();
    scene.add(trackGroup);

    // Keep your rotation value as-is:
    const DIAGONAL_ROT = Math.PI * 0.5; // (value preserved exactly)
    trackGroup.rotation.y = DIAGONAL_ROT;

    // Road (unchanged)
    const road = buildRoad({ curve, width: ROAD_WIDTH, segments: 2000, closed: true, rails: true });
    const roadObj = road?.group ?? road;
    trackGroup.add(roadObj);

    // Racing line (unchanged)
    const racingLine = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 1000, 0.09, 12, true),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 })
    );
    racingLine.position.y += 0.03;
    trackGroup.add(racingLine);

    // Auto-lift (unchanged)
    const samples = 2048;
    let minY = Infinity;
    const tmp = new THREE.Vector3();
    for (let i = 0; i <= samples; i++) {
      curve.getPoint(i / samples, tmp);
      if (tmp.y < minY) minY = tmp.y;
    }
    const CLEARANCE = 0.06;
    const yOffset = minY < CLEARANCE ? CLEARANCE - minY : 0;
    if (yOffset !== 0) trackGroup.position.y += yOffset;
    trackGroup.position.x -= 20;
    trackGroup.position.z += 10;

    // Frame camera (unchanged)
    {
      const box = new THREE.Box3().setFromObject(roadObj);
      const size = box.getSize(new THREE.Vector3()).length();
      const y = Math.max(90, Math.min(170, size * 0.36));
      setCam(y, 0.30, true);
    }

    // --- Cars & trails (unchanged visuals) ---
    const totalLen = curve.getLength();
    const wheelRadius = 0.55;

    // Shared trail geometry to reduce allocations (same dimensions as your original)
    const trailGeom = new THREE.ConeGeometry(1.0, 7.0, 24, 1, false);
    trailGeom.rotateX(Math.PI / 2);

    const buildTrail = (hexColor) => {
      const mat = new THREE.MeshBasicMaterial({
        color: hexColor,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const m = new THREE.Mesh(trailGeom, mat);
      m.position.set(0, 0.28, -7.0 * 0.55);
      m.renderOrder = 3;
      return m;
    };

    const cars = [];
    for (let i = 0; i < NUM_CARS; i++) {
      const color = CAR_COLORS[i % CAR_COLORS.length];
      const api = buildLowPolyCar({ bodyColor: color, scale: CAR_SCALE });
      const car = api.group;

      const glow = new THREE.PointLight(color, 1.4, 40, 2.0);
      glow.position.set(0, 0.8, 0);
      car.add(glow);
      car.add(buildTrail(color));

      const u0 = i / NUM_CARS;
      const p0 = curve.getPointAt(u0);
      const t0 = curve.getTangentAt(u0);
      car.position.copy(p0).add(new THREE.Vector3(0, yOffset, 0));
      car.rotation.y = -Math.atan2(t0.x, t0.z);

      trackGroup.add(car);

      cars.push({
        api,
        mesh: car,
        u: u0,
        s: u0 * totalLen,
        speed: BASE_SPEED * (0.95 + 0.12 * Math.random()),
        lateral: (Math.random() * 2 - 1) * MAX_LATERAL * 0.35,
        targetLateral: 0,
        draftBoostUntil: 0,
        color
      });
    }

    // Passing/drafting (unchanged logic)
    function updateRaceDynamics(time) {
      cars.sort((a, b) => a.s - b.s);
      for (let i = 0; i < cars.length; i++) {
        const me = cars[i];
        const nxt = cars[(i + 1) % cars.length];
        let gap = nxt.s - me.s; if (gap < 0) gap += totalLen;

        if (gap < 10) {
          me.draftBoostUntil = Math.max(me.draftBoostUntil, time + 800);
          me.targetLateral = THREE.MathUtils.clamp(
            -Math.sign(nxt.lateral || 0.0001) * MAX_LATERAL * 0.9,
            -MAX_LATERAL, MAX_LATERAL
          );
        } else if (gap > 25) {
          me.targetLateral = THREE.MathUtils.damp(me.targetLateral, 0, 1.5, 0.016);
        }

        me.lateral = THREE.MathUtils.damp(me.lateral, me.targetLateral, 6.0, 0.016);
        me.speed += (Math.random() - 0.5) * 0.05;
        if (time < me.draftBoostUntil) me.speed += 3.2;
        me.speed = THREE.MathUtils.clamp(me.speed, BASE_SPEED * 0.85, BASE_SPEED * 1.35);
      }
    }

    // Helpers (no visual change)
    const spinWheels = (api, dist) => {
      if (!api?.wheels) return;
      const dRot = dist / wheelRadius;
      api.wheels.FL.rotation.z -= dRot;
      api.wheels.FR.rotation.z -= dRot;
      api.wheels.RL.rotation.z -= dRot;
      api.wheels.RR.rotation.z -= dRot;
    };

    // Reused vectors (reduce GC)
    const P = new THREE.Vector3();
    const T = new THREE.Vector3();
    const Y = new THREE.Vector3(0, 1, 0);
    const R = new THREE.Vector3();

    // Animation loop with disposal guard
    let disposed = false;
    let prev = performance.now();

    const animate = () => {
      if (disposed) return;
      rafRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;

      updateRaceDynamics(now);

      for (const c of cars) {
        const ds = c.speed * dt;
        c.s = (c.s + ds) % totalLen;
        const du = ds / totalLen;
        c.u = (c.u + du) % 1;

        curve.getPointAt(c.u, P);
        curve.getTangentAt(c.u, T).normalize();
        R.crossVectors(T, Y).normalize();

        c.mesh.position.set(P.x, P.y + yOffset + 0.04, P.z).addScaledVector(R, c.lateral);
        c.mesh.rotation.y = -Math.atan2(T.x, T.z);

        spinWheels(c.api, ds);
      }

      renderer.render(scene, camera);
    };
    rafRef.current = requestAnimationFrame(animate);

    // Resize (no sizing change; just reactive)
    const resize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight, false);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // Cleanup (robust; no visual changes)
    return () => {
      disposed = true;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();

      // Dispose materials (and any attached textures) + geometries
      const disposeMaterial = (m) => {
        if (!m) return;
        const maps = [
          'map','normalMap','roughnessMap','metalnessMap','bumpMap','alphaMap',
          'emissiveMap','aoMap','specularMap','envMap','clearcoatNormalMap',
          'clearcoatRoughnessMap','sheenColorMap','sheenRoughnessMap',
          'transmissionMap','thicknessMap','displacementMap'
        ];
        maps.forEach(k => {
          const tex = m[k];
          if (tex && tex.dispose) tex.dispose();
        });
        m.dispose?.();
      };

      scene.traverse((o) => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
          if (Array.isArray(o.material)) o.material.forEach(disposeMaterial);
          else disposeMaterial(o.material);
        } else if (o.isLine || o.isPoints) {
          o.geometry?.dispose?.();
          disposeMaterial(o.material);
        }
      });

      // Dispose shared trail geometry
      trailGeom.dispose?.();

      // Dispose renderer and lose context to prevent leaks on hot reloads
      try {
        renderer.dispose();
        const gl = renderer.getContext?.();
        const lose = gl?.getExtension?.('WEBGL_lose_context');
        lose?.loseContext?.();
      } catch {
        // ignore
      }

      const canvas = renderer.domElement;
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);

      mountedRef.current = false;
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden' }} />;
}
