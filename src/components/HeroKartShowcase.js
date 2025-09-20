// src/components/HeroKartShowcase.js
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { addLightsAndGround } from './tracks/TrackUtils';
import { buildLowPolyCar } from './car/LowPolyCar';
import { buildRibbonRoad as buildRoad, makeSmoothCurve } from './tracks/TrackUtils';

export default function HeroKartShowcase() {
  const mountRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- Config (visibility & speed) ---
    const CAR_SCALE = 0.38;
    const NUM_CARS = 6;
    const BASE_SPEED = 20;
    const ROAD_WIDTH = 8;
    const MAX_LATERAL = ROAD_WIDTH * 0.33;
    const CAR_COLORS = [0xff5a5a, 0x22d3ee, 0xffb020, 0x7a6cff, 0x34d399, 0xec4899];

    // --- Renderer/Scene ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x0a0a0a, 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    // --- Camera: close, slight tilt, diagonal vantage ---
    const camera = new THREE.PerspectiveCamera(85, container.clientWidth / container.clientHeight, 0.1, 8000);
    const setCam = (y = 120, tilt = 0.28, diagonal = true) => {
      const horiz = y * 0.35;
      if (diagonal) camera.position.set(-horiz, y, horiz);
      else camera.position.set(0, y, y * 0.25);
      camera.lookAt(0, 0, 0);
      camera.rotation.x -= tilt;
    };
    setCam();

    // --- Lights & ground ---
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

    // --- Build TechnicalTrack curve ---
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

    // --- Group (road + line + cars) we can rotate & lift together ---
    const trackGroup = new THREE.Group();
    scene.add(trackGroup);

    // Rotate ~90° (visual 45° feel due to perspective) across screen.
    const DIAGONAL_ROT = Math.PI * 0.5;
    trackGroup.rotation.y = DIAGONAL_ROT;

    // Road
    const road = buildRoad({ curve, width: ROAD_WIDTH, segments: 2000, closed: true, rails: true });
    const roadObj = road?.group ?? road;
    trackGroup.add(roadObj);

    // Racing line
    const racingLine = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 1000, 0.09, 12, true),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 })
    );
    racingLine.position.y += 0.03;
    trackGroup.add(racingLine);

    // --- Auto-lift: keep everything above the floor ---
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

    // --- Frame camera to track ---
    {
      const box = new THREE.Box3().setFromObject(roadObj);
      const size = box.getSize(new THREE.Vector3()).length();
      const y = Math.max(90, Math.min(170, size * 0.36));
      setCam(y, 0.30, true);
    }

    // ============================================================
    // Trail Ribbon (camera-facing strip, per-vertex alpha fade)
    // ============================================================
    class TrailRibbon {
      /**
       * @param {THREE.Scene} parent
       * @param {number} hexColor
       * @param {{maxPoints?:number, width?:number, lifetime?:number}} opts
       */
      constructor(parent, hexColor, opts = {}) {
        this.parent = parent;
        this.color = new THREE.Color(hexColor);
        this.maxPoints = opts.maxPoints ?? 64;
        this.width = opts.width ?? 0.9;         // ribbon half-width in world units
        this.lifetime = opts.lifetime ?? 1.05;  // seconds point stays fully visible (fades within this window)
        this.emitEvery = opts.emitEvery ?? 0.9; // world units between points

        this.points = []; // {pos:Vector3, t:number} newest at end
        this.distCarry = 0;

        // geometry (triangle strip): 2 verts per point
        const vertCount = this.maxPoints * 2;
        this.position = new Float32Array(vertCount * 3);
        this.alpha = new Float32Array(vertCount);
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.position, 3));
        this.geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
        // index for triangle strip
        const index = [];
        for (let i = 0; i < this.maxPoints - 1; i++) {
          const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
          index.push(a, b, c, b, d, c);
        }
        this.geometry.setIndex(index);

        // simple shader with vertex alpha
        this.material = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: {
            uColor: { value: this.color },
          },
          vertexShader: `
            attribute float alpha;
            varying float vAlpha;
            void main() {
              vAlpha = alpha;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 uColor;
            varying float vAlpha;
            void main() {
              gl_FragColor = vec4(uColor, vAlpha);
            }
          `
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.renderOrder = 4;
        this.parent.add(this.mesh);

        // temp vectors
        this._dir = new THREE.Vector3();
        this._up = new THREE.Vector3(0, 1, 0);
        this._normal = new THREE.Vector3();
        this._lastPos = null; // for spacing
      }

      /** Call per-frame with current car world position and dt seconds */
      step(currentPos, dt) {
        // emit point based on traveled distance
        if (!this._lastPos) {
          this._lastPos = currentPos.clone();
          this._pushPoint(currentPos);
        } else {
          const d = this._lastPos.distanceTo(currentPos);
          this.distCarry += d;
          if (this.distCarry >= this.emitEvery) {
            this._pushPoint(currentPos);
            this.distCarry = 0;
            this._lastPos.copy(currentPos);
          }
        }

        // age points & drop old
        for (let i = 0; i < this.points.length; i++) {
          this.points[i].t += dt;
        }
        while (this.points.length > this.maxPoints || (this.points[0] && this.points[0].t > this.lifetime)) {
          this.points.shift();
        }

        // rebuild ribbon verts (2 per point, offset along track-side normal)
        const n = this.points.length;
        if (n < 2) {
          this.mesh.visible = false;
          return;
        }
        this.mesh.visible = true;

        const posArr = this.position;
        const alphaArr = this.alpha;

        for (let i = 0; i < n; i++) {
          const P = this.points[i].pos;
          const prev = i === 0 ? this.points[i].pos : this.points[i - 1].pos;
          const next = i === n - 1 ? this.points[i].pos : this.points[i + 1].pos;

          this._dir.copy(next).sub(prev);
          if (this._dir.lengthSq() < 1e-6) this._dir.set(1, 0, 0);
          this._normal.crossVectors(this._dir.normalize(), this._up).normalize();

          // fade: newest point alpha ~1, oldest ~0
          const u = i / (n - 1);
          const a = Math.pow(u, 1.5);  // ease-in fade (older = dimmer)
          const alpha = (1.0 - a) * 0.65;

          const left = P.clone().addScaledVector(this._normal, -this.width * 0.5);
          const right = P.clone().addScaledVector(this._normal, +this.width * 0.5);

          const ii = i * 2;
          posArr[(ii) * 3 + 0] = left.x;  posArr[(ii) * 3 + 1] = left.y + 0.015;  posArr[(ii) * 3 + 2] = left.z;
          posArr[(ii + 1) * 3 + 0] = right.x; posArr[(ii + 1) * 3 + 1] = right.y + 0.015; posArr[(ii + 1) * 3 + 2] = right.z;
          alphaArr[ii] = alpha;
          alphaArr[ii + 1] = alpha;
        }

        // zero out unused verts when points < maxPoints
        for (let i = n; i < this.maxPoints; i++) {
          const ii = i * 2;
          posArr[(ii) * 3 + 0] = 0; posArr[(ii) * 3 + 1] = -9999; posArr[(ii) * 3 + 2] = 0;
          posArr[(ii + 1) * 3 + 0] = 0; posArr[(ii + 1) * 3 + 1] = -9999; posArr[(ii + 1) * 3 + 2] = 0;
          alphaArr[ii] = 0;
          alphaArr[ii + 1] = 0;
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.alpha.needsUpdate = true;
      }

      _pushPoint(p) {
        this.points.push({ pos: p.clone(), t: 0 });
        if (this.points.length > this.maxPoints) this.points.shift();
      }

      dispose() {
        this.parent.remove(this.mesh);
        this.geometry.dispose();
        this.material.dispose();
      }
    }
    // ============================================================

    // --- Cars with ribbon trails ---
    const totalLen = curve.getLength();
    const UP = new THREE.Vector3(0, 1, 0);
    const cars = [];
    const wheelRadius = 0.55;

    const spinWheels = (api, dist) => {
      if (!api?.wheels) return;
      const dRot = dist / wheelRadius;
      api.wheels.FL.rotation.z -= dRot;
      api.wheels.FR.rotation.z -= dRot;
      api.wheels.RL.rotation.z -= dRot;
      api.wheels.RR.rotation.z -= dRot;
    };

    for (let i = 0; i < NUM_CARS; i++) {
      const color = CAR_COLORS[i % CAR_COLORS.length];
      const api = buildLowPolyCar({ bodyColor: color, scale: CAR_SCALE });
      const car = api.group;

      const glow = new THREE.PointLight(color, 1.2, 40, 2.0);
      glow.position.set(0, 0.8, 0);
      car.add(glow);

      const u0 = i / NUM_CARS;
      const p0 = curve.getPointAt(u0);
      const t0 = curve.getTangentAt(u0);
      car.position.copy(p0).add(new THREE.Vector3(0, yOffset, 0));
      car.rotation.y = -Math.atan2(t0.x, t0.z);
      trackGroup.add(car);

      const ribbon = new TrailRibbon(scene, color, {
        maxPoints: 72,
        width: 1.0,
        lifetime: 1.1,
        emitEvery: 0.9
      });

      cars.push({
        api,
        mesh: car,
        ribbon,
        u: u0,
        s: u0 * totalLen,
        speed: BASE_SPEED * (0.95 + 0.12 * Math.random()),
        lateral: (Math.random() * 2 - 1) * MAX_LATERAL * 0.35,
        targetLateral: 0,
        draftBoostUntil: 0,
        color
      });
    }

    // Passing/drafting dynamics
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

    // --- Animate
    let prev = performance.now();
    const animate = () => {
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

        const P = curve.getPointAt(c.u);
        const T = curve.getTangentAt(c.u).normalize();
        const R = new THREE.Vector3().crossVectors(T, UP).normalize();

        c.mesh.position.set(P.x, P.y + yOffset + 0.04, P.z).addScaledVector(R, c.lateral);
        c.mesh.rotation.y = -Math.atan2(T.x, T.z);

        spinWheels(c.api, ds);

        // step ribbon at car's current world position
        c.ribbon.step(c.mesh.position, dt);
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize/Cleanup
    const resize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();

      // dispose ribbons
      cars.forEach(c => c.ribbon?.dispose?.());

      scene.traverse(o => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
          if (Array.isArray(o.material)) o.material.forEach(m => m?.dispose?.());
          else o.material?.dispose?.();
        }
      });
      renderer.dispose();
      const canvas = renderer.domElement;
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden' }} />;
}
