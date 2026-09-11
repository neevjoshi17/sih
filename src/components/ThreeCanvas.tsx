import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Compass, Move, Maximize2 } from 'lucide-react';

interface ThreeCanvasProps {
  cubeColor?: string;
  wireframe?: boolean;
  autoRotate?: boolean;
  onControlsReady?: (controls: {
    resetCamera: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
  }) => void;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  cubeColor = '#6366f1',
  wireframe = false,
  autoRotate = false,
  onControlsReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cubeMeshRef = useRef<THREE.Mesh | null>(null);
  const cubeGroupRef = useRef<THREE.Group | null>(null);
  const shadowMeshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090d16');
    scene.fog = new THREE.FogExp2('#090d16', 0.035);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(3.2, 2.5, 4.6);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. OrbitControls for moving around the 3D space with the mouse
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.85;
    controls.panSpeed = 0.85;
    controls.zoomSpeed = 1.1;
    controls.minDistance = 1.8;
    controls.maxDistance = 22.0;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    if (onControlsReady) {
      onControlsReady({
        resetCamera: () => {
          camera.position.set(3.2, 2.5, 4.6);
          controls.target.set(0, 0, 0);
          controls.update();
        },
        zoomIn: () => {
          camera.position.multiplyScalar(0.85);
          controls.update();
        },
        zoomOut: () => {
          camera.position.multiplyScalar(1.18);
          controls.update();
        },
      });
    }

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(5, 8, 4);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 25;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);

    const secondaryLight = new THREE.DirectionalLight(0x818cf8, 1.2);
    secondaryLight.position.set(-6, -2, -4);
    scene.add(secondaryLight);

    const accentLight = new THREE.PointLight(0xa78bfa, 2.5, 12);
    accentLight.position.set(0, 3.5, 2.5);
    scene.add(accentLight);

    // 6. Floating Space Elements
    // Spatial Ground Grid
    const grid = new THREE.GridHelper(18, 24, 0x4f46e5, 0x1e293b);
    grid.position.y = -1.8;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.4;
    scene.add(grid);

    // Floor shadow receiver
    const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const shadowMat = new THREE.ShadowMaterial({
      opacity: 0.35,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.79;
    shadowMesh.receiveShadow = true;
    scene.add(shadowMesh);
    shadowMeshRef.current = shadowMesh;

    // Ambient floating star/dust particles for spatial depth parallax
    const particleCount = 450;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 26;
      particlePositions[i + 1] = (Math.random() - 0.5) * 16;
      particlePositions[i + 2] = (Math.random() - 0.5) * 26;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 7. The Floating Cube Group
    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);
    cubeGroupRef.current = cubeGroup;

    // Cube Mesh
    const boxGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    const boxMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(cubeColor),
      metalness: 0.25,
      roughness: 0.2,
      clearcoat: 0.6,
      clearcoatRoughness: 0.15,
      wireframe: wireframe,
      reflectivity: 0.9,
    });
    const cube = new THREE.Mesh(boxGeo, boxMat);
    cube.castShadow = true;
    cube.receiveShadow = true;
    cubeGroup.add(cube);
    cubeMeshRef.current = cube;

    // Outer subtle glowing edge wire
    const edgeGeo = new THREE.EdgesGeometry(boxGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    });
    const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
    cube.add(edgeLines);

    // 8. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Controls damping update (smooth mouse camera navigation)
      controls.update();

      // Floating cube physics animation (levitating softly in 3D space)
      if (cubeGroupRef.current) {
        // Floating up and down smoothly
        const floatY = Math.sin(elapsedTime * 1.5) * 0.25;
        cubeGroupRef.current.position.y = floatY;

        // Gentle autonomous floating rotation (cube drifts gently in space)
        cubeGroupRef.current.rotation.y = elapsedTime * 0.2;
        cubeGroupRef.current.rotation.x = Math.sin(elapsedTime * 0.9) * 0.12;
        cubeGroupRef.current.rotation.z = Math.cos(elapsedTime * 0.7) * 0.08;

        // Dynamic shadow scaling according to float height
        if (shadowMeshRef.current) {
          const shadowScale = 1 - (floatY + 0.25) * 0.22;
          shadowMeshRef.current.scale.set(shadowScale, shadowScale, shadowScale);
        }
      }

      // Very subtle ambient drift for spatial particles
      particles.rotation.y = elapsedTime * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || window.innerWidth;
      const newHeight = container.clientHeight || window.innerHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      controls.dispose();

      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }

      boxGeo.dispose();
      boxMat.dispose();
      edgeGeo.dispose();
      edgeMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, []);

  // Update cube material dynamically when props change
  useEffect(() => {
    if (cubeMeshRef.current) {
      const mat = cubeMeshRef.current.material as THREE.MeshPhysicalMaterial;
      mat.color.set(cubeColor);
      mat.wireframe = wireframe;
      mat.needsUpdate = true;
    }
  }, [cubeColor, wireframe]);

  // Sync autoRotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      controlsRef.current.autoRotateSpeed = 2.0;
    }
  }, [autoRotate]);

  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(3.2, 2.5, 4.6);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div
      id="space-viewport-container"
      className="relative w-full h-full overflow-hidden select-none bg-[#090d16]"
    >
      {/* Three.js canvas mount - cursor grab indicates camera movement */}
      <div
        id="three-canvas-root"
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        aria-label="3D Space with floating cube. Drag mouse to navigate camera around the space."
      />

      {/* Floating navigation hint bar at bottom center */}
      <div
        id="floating-navigation-hint"
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900/70 backdrop-blur-md border border-white/10 text-slate-300 text-xs shadow-lg transition-opacity duration-300 hover:bg-slate-900/90"
      >
        <span className="flex items-center gap-1.5 text-[11px] text-slate-300">
          <Move className="w-3.5 h-3.5 text-indigo-400" />
          <span>Left-drag: Orbit</span>
        </span>
        <span className="text-white/20">•</span>
        <span className="hidden sm:inline text-[11px] text-slate-400">
          Right-drag: Pan
        </span>
        <span className="hidden sm:inline text-white/20">•</span>
        <span className="text-[11px] text-slate-400">Scroll: Zoom</span>

        <div className="w-px h-3.5 bg-white/15 mx-0.5" />

        <button
          type="button"
          onClick={handleResetCamera}
          className="flex items-center gap-1 text-[11px] font-medium text-indigo-300 hover:text-white transition-colors"
          title="Reset camera view"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Center</span>
        </button>
      </div>
    </div>
  );
};
