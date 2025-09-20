import * as THREE from 'three';
import { addLightsAndGround } from '../components/tracks/TrackUtils.js';
import { buildFlatTrack } from '../components/tracks/FlatTrack.js';
import { buildHillyTrack } from '../components/tracks/HillyTrack.js';
import { buildTechnicalTrack } from '../components/tracks/TechnicalTrack.js';

function TrackViewerPage() {
    const mountRef = useRef(null);
  
    useEffect(() => {
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      mountRef.current.appendChild(renderer.domElement);
  
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x88aadd);
  
      const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
      camera.position.set(120, 110, 160);
      camera.lookAt(0, 0, 0);
  
      addLightsAndGround(scene);
  
      const trackBuilders = [buildFlatTrack, buildHillyTrack, buildTechnicalTrack];
      let currentIndex = 0;
      let currentTrack = null;
  
      function loadTrack(index) {
        if (currentTrack) {
          scene.remove(currentTrack.group);
        }
        currentTrack = trackBuilders[index]();
        scene.add(currentTrack.group);
      }
  
      loadTrack(currentIndex);
  
      function handleKey(e) {
        if (e.key === 'ArrowRight') {
          currentIndex = (currentIndex + 1) % trackBuilders.length;
          loadTrack(currentIndex);
        } else if (e.key === 'ArrowLeft') {
          currentIndex = (currentIndex - 1 + trackBuilders.length) % trackBuilders.length;
          loadTrack(currentIndex);
        }
      }
      window.addEventListener('keydown', handleKey);
  
      function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      }
      animate();
  
      function handleResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
      window.addEventListener('resize', handleResize);
  
      return () => {
        window.removeEventListener('keydown', handleKey);
        window.removeEventListener('resize', handleResize);
        mountRef.current.removeChild(renderer.domElement);
      };
    }, []);
  
    return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
  }
  
  export default TrackViewerPage;