import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
//----NEW CODE----
import { buildLowPolyCar } from '../components/car/LowPolyCar.js';
import { buildFlatTrack } from '../components/tracks/FlatTrack.js';
//----END NEW CODE----

export default function RaceScene() {
    const containerRef = useRef();

    const state = useRef({
        car: null,
        aiCar: null,
        renderer: null,
        camera: null,
        scene: null,
        animateId: null,
    });

    const playerState = useRef({
        speed: 0,
        steering: 0,
        keys: {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
        },
    });
    
    //----NEW CODE----
    const cameraState = useRef({
        keys: { w: false, s: false, a: false, d: false },
        isMouseDown: false,
        prevMouseX: 0,
        prevMouseY: 0,
        yaw: 0,
        pitch: 0,
    });
    //----END NEW CODE----

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Prevent adding multiple canvases on hot reloads
        if (container.hasChildNodes()) {
            return;
        }

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb); 

        const fov = 75;
        const aspect = window.innerWidth / window.innerHeight;
        const near = 0.1;
        const far = 1000;
        const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        camera.position.set(0, 10, 20);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        state.current.scene = scene;
        state.current.camera = camera;
        state.current.renderer = renderer;

        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        scene.add(directionalLight);

        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x5a5a5a });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        const track = buildFlatTrack();
        scene.add(track.group);
        const trackWalls = track.group.children.filter(child => child.isMesh);
        
        // Place cars on the track at a hardcoded starting position
        const trackStart = track.curve.points[0];
        const trackTangent = track.curve.getTangent(0).normalize();
        const startPosition = new THREE.Vector3(trackStart.x, 0.7, trackStart.z);
        
        // Place the cars side-by-side
        const playerStartOffset = new THREE.Vector3().crossVectors(trackTangent, new THREE.Vector3(0, 1, 0)).multiplyScalar(2);
        const aiStartOffset = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), trackTangent).multiplyScalar(2);
        
        const car = buildLowPolyCar({ bodyColor: 0x1d75f2 });
        car.group.position.copy(startPosition).add(playerStartOffset);
        car.group.lookAt(startPosition.clone().add(trackTangent));
        scene.add(car.group);
        state.current.car = car;

        const aiCar = buildLowPolyCar({ bodyColor: 0xff0000 });
        aiCar.group.position.copy(startPosition).add(aiStartOffset);
        aiCar.group.lookAt(startPosition.clone().add(trackTangent));
        scene.add(aiCar.group);
        state.current.aiCar = aiCar;

        const cameraSpeed = 0.5;
        const cameraRotationSpeed = 0.005;
        
        const animate = () => {
            state.current.animateId = requestAnimationFrame(animate);

            const { keys } = playerState.current;
            const carSpeed = 0.1;
            const steeringAngle = 0.02;

            if (keys.ArrowUp) {
                state.current.car.group.translateZ(carSpeed);
            }
            if (keys.ArrowDown) {
                state.current.car.group.translateZ(-carSpeed);
            }
            if (keys.ArrowLeft) {
                state.current.car.group.rotation.y += steeringAngle;
            }
            if (keys.ArrowRight) {
                state.current.car.group.rotation.y -= steeringAngle;
            }
            
            //----NEW CODE----
            const cameraSpeed = 0.5;
            const cameraRotationSpeed = 0.005;
            const { keys: cameraKeys, yaw, pitch } = cameraState.current;

            // Calculate forward and right vectors from yaw
            const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
            const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

            if (cameraKeys.w) {
                state.current.camera.position.addScaledVector(forward, cameraSpeed);
            }
            if (cameraKeys.s) {
                state.current.camera.position.addScaledVector(forward, -cameraSpeed);
            }
            if (cameraKeys.a) {
                state.current.camera.position.addScaledVector(right, -cameraSpeed);
            }
            if (cameraKeys.d) {
                state.current.camera.position.addScaledVector(right, cameraSpeed);
            }

            // Update camera orientation using yaw & pitch
            const target = new THREE.Vector3(
                state.current.camera.position.x + Math.sin(yaw) * Math.cos(pitch),
                state.current.camera.position.y + Math.sin(pitch),
                state.current.camera.position.z - Math.cos(yaw) * Math.cos(pitch)
            );
            state.current.camera.lookAt(target);
            //----END NEW CODE----

            // AI logic
            if (state.current.aiCar) {
                const aiCar = state.current.aiCar.group;
                const aiSpeed = 0.1;
                const aiSteering = 0.01;
                const raycaster = new THREE.Raycaster();
                
                const forwardDir = new THREE.Vector3(0, 0, 1);
                const leftDir = new THREE.Vector3(-0.5, 0, 1).normalize();
                const rightDir = new THREE.Vector3(0.5, 0, 1).normalize();
                
                const origin = aiCar.position;
                
                forwardDir.applyEuler(aiCar.rotation);
                leftDir.applyEuler(aiCar.rotation);
                rightDir.applyEuler(aiCar.rotation);
                
                raycaster.set(origin, leftDir);
                const leftIntersects = raycaster.intersectObjects(trackWalls, true);

                raycaster.set(origin, rightDir);
                const rightIntersects = raycaster.intersectObjects(trackWalls, true);

                if (leftIntersects.length > 0 && leftIntersects[0].distance < 3) {
                    aiCar.rotation.y -= aiSteering;
                } else if (rightIntersects.length > 0 && rightIntersects[0].distance < 3) {
                    aiCar.rotation.y += aiSteering;
                } else {
                    aiCar.translateZ(aiSpeed);
                }
            }

            state.current.renderer.render(scene, camera);
        };
        animate();

        const handleKeyDown = (e) => {
            if (e.key in playerState.current.keys) {
                playerState.current.keys[e.key] = true;
            }
            //----NEW CODE----
            if (e.key in cameraState.current.keys) {
                cameraState.current.keys[e.key] = true;
            }
            //----END NEW CODE----
        };

        const handleKeyUp = (e) => {
            if (e.key in playerState.current.keys) {
                playerState.current.keys[e.key] = false;
            }
            //----NEW CODE----
            if (e.key in cameraState.current.keys) {
                cameraState.current.keys[e.key] = false;
            }
            //----END NEW CODE----
        };

        const handleResize = () => {
            if (state.current.camera && state.current.renderer) {
                state.current.camera.aspect = window.innerWidth / window.innerHeight;
                state.current.camera.updateProjectionMatrix();
                state.current.renderer.setSize(window.innerWidth, window.innerHeight);
            }
        };

        //----NEW CODE----
        const handleMouseDown = (e) => {
            cameraState.current.isMouseDown = true;
            cameraState.current.prevMouseX = e.clientX;
            cameraState.current.prevMouseY = e.clientY;
        };

        const handleMouseUp = () => {
            cameraState.current.isMouseDown = false;
        };

        const handleMouseMove = (e) => {
            if (!cameraState.current.isMouseDown) return;

            const deltaX = e.clientX - cameraState.current.prevMouseX;
            const deltaY = e.clientY - cameraState.current.prevMouseY;

            cameraState.current.yaw -= deltaX * cameraRotationSpeed;
            cameraState.current.pitch -= deltaY * cameraRotationSpeed;

            // Clamp pitch to avoid flipping
            cameraState.current.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraState.current.pitch));

            cameraState.current.prevMouseX = e.clientX;
            cameraState.current.prevMouseY = e.clientY;
        };
        //----END NEW CODE----

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('resize', handleResize);
        //----NEW CODE----
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mousemove', handleMouseMove);
        //----END NEW CODE----

        return () => {
            if (state.current.renderer) {
                state.current.renderer.dispose();
            }
            if (state.current.animateId) {
                cancelAnimationFrame(state.current.animateId);
            }
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('resize', handleResize);
            //----NEW CODE----
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousemove', handleMouseMove);
            //----END NEW CODE----
        };
    }, []);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
            
        </div>
    );
}
