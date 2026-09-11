import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Plus, Minus, Map as MapIcon } from 'lucide-react';

export interface GlobeMarker {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  elev: string;
  type: 'dem' | 'peak' | 'trench' | 'volcano';
  hasActiveModel?: boolean;
}

export const GLOBE_LOCATIONS: GlobeMarker[] = [
  {
    id: 'kush',
    name: 'Hindu Kush Peak & Basin',
    region: 'South-Central Asia (36.0° N, 71.2° E)',
    lat: 36.0,
    lon: 71.2,
    elev: '7,708 m',
    type: 'dem',
    hasActiveModel: true,
  },
  {
    id: 'everest',
    name: 'Mount Everest (Sagarmatha)',
    region: 'Himalayas, Nepal / Tibet',
    lat: 27.988,
    lon: 86.925,
    elev: '8,848 m',
    type: 'peak',
  },
  {
    id: 'grand_canyon',
    name: 'Grand Canyon Basin',
    region: 'Arizona, United States',
    lat: 36.106,
    lon: -112.112,
    elev: '2,134 m',
    type: 'dem',
  },
  {
    id: 'mariana',
    name: 'Mariana Trench (Challenger Deep)',
    region: 'Western Pacific Ocean',
    lat: 11.35,
    lon: 142.2,
    elev: '-10,994 m',
    type: 'trench',
  },
  {
    id: 'mont_blanc',
    name: 'Mont Blanc Massif',
    region: 'Graian Alps, France / Italy',
    lat: 45.832,
    lon: 6.865,
    elev: '4,808 m',
    type: 'peak',
  },
  {
    id: 'fuji',
    name: 'Mount Fuji Stratovolcano',
    region: 'Honshu Island, Japan',
    lat: 35.36,
    lon: 138.727,
    elev: '3,776 m',
    type: 'volcano',
  },
  {
    id: 'kilimanjaro',
    name: 'Mount Kilimanjaro',
    region: 'Tanzania, East Africa',
    lat: -3.067,
    lon: 37.355,
    elev: '5,895 m',
    type: 'volcano',
  },
  {
    id: 'mauna_kea',
    name: 'Mauna Kea Volcanic Shield',
    region: 'Hawaii, United States',
    lat: 19.82,
    lon: -155.468,
    elev: '4,207 m',
    type: 'volcano',
  },
];

// Helper: Convert Lat/Lon to 3D Cartesian coordinates matching the 3D Earth GLB orientation
export function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (lat * Math.PI) / 180;
  const theta = ((45 - lon) * Math.PI) / 180;

  const y = radius * Math.sin(phi);
  const rXZ = radius * Math.cos(phi);
  const x = rXZ * Math.cos(theta);
  const z = rXZ * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

interface Globe3DProps {
  darkMode: boolean;
  onSelectMarker: (marker: GlobeMarker) => void;
  targetMarkerId?: string | null;
  onCoordinatesChange?: (lat: number, lon: number) => void;
  onZoomInToMap?: (coords: { lat: number; lon: number; zoom: number }) => void;
}

export const Globe3D: React.FC<Globe3DProps> = ({
  darkMode,
  onSelectMarker,
  targetMarkerId,
  onCoordinatesChange,
  onZoomInToMap,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosphereRef = useRef<THREE.Mesh | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const pulseRingsRef = useRef<THREE.Mesh[]>([]);

  const onZoomInToMapRef = useRef(onZoomInToMap);
  onZoomInToMapRef.current = onZoomInToMap;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [hoveredMarker, setHoveredMarker] = useState<GlobeMarker | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isZoomTransitioning, setIsZoomTransitioning] = useState<boolean>(false);

  const GLOBE_RADIUS = 2.45;

  // Initialize Three.js Scene with Earth_1_12756.glb
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera & Raycaster
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.6, 6.2);
    cameraRef.current = camera;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = darkMode ? 1.25 : 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 0.9;
    controls.minDistance = 2.82;
    controls.maxDistance = 14.0;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    controlsRef.current = controls;

    // Helper: Compute latitude and longitude at the screen center (0,0)
    const getScreenCenterCoordinates = (): { lat: number; lon: number } => {
      let lat = 36.0;
      let lon = 71.2;
      if (earthMeshRef.current && globeGroupRef.current) {
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObject(earthMeshRef.current);
        if (intersects.length > 0) {
          const pt = intersects[0].point;
          const localPt = pt.clone();
          globeGroupRef.current.worldToLocal(localPt);
          localPt.normalize();
          const calcLat = (Math.asin(Math.min(Math.max(localPt.y, -1), 1)) * 180) / Math.PI;
          let calcLon = 45 - (Math.atan2(localPt.z, localPt.x) * 180) / Math.PI;
          while (calcLon > 180) calcLon -= 360;
          while (calcLon < -180) calcLon += 360;
          lat = parseFloat(calcLat.toFixed(4));
          lon = parseFloat(calcLon.toFixed(4));
        }
      }
      return { lat, lon };
    };

    // Zoom-in detection -> Transitions to 2D Map
    let zoomTransitionTriggered = false;

    const checkZoomTransition = () => {
      if (zoomTransitionTriggered || !onZoomInToMapRef.current) return;
      const dist = camera.position.distanceTo(controls.target);
      // When camera zooms close to globe surface
      if (dist <= 3.32) {
        zoomTransitionTriggered = true;
        setIsZoomTransitioning(true);
        const coords = getScreenCenterCoordinates();
        setTimeout(() => {
          if (onZoomInToMapRef.current) {
            onZoomInToMapRef.current({ lat: coords.lat, lon: coords.lon, zoom: 9 });
          }
          setIsZoomTransitioning(false);
          zoomTransitionTriggered = false;
        }, 320);
      }
    };

    controls.addEventListener('change', checkZoomTransition);

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0 && !zoomTransitionTriggered) {
        const dist = camera.position.distanceTo(controls.target);
        if (dist <= 3.6) {
          checkZoomTransition();
        }
      }
    };

    renderer.domElement.addEventListener('wheel', handleWheel, { passive: true });

    // 5. Lights tailored for realistic Earth PBR materials
    const ambientLight = new THREE.AmbientLight(0xffffff, darkMode ? 1.1 : 1.45);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, darkMode ? 2.6 : 2.4);
    sunLight.position.set(7, 5, 6);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(darkMode ? 0x737373 : 0xa3a3a3, darkMode ? 1.3 : 1.0);
    rimLight.position.set(-7, -3, -6);
    scene.add(rimLight);

    const softFill = new THREE.DirectionalLight(0xe5e5e5, 0.6);
    softFill.position.set(0, -6, 4);
    scene.add(softFill);

    // 6. Globe Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // Temporary placeholder sphere while 12.9MB GLB model is streaming
    const placeholderGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 0.99, 32, 32);
    const placeholderMat = new THREE.MeshBasicMaterial({
      color: darkMode ? 0x262626 : 0xe5e5e5,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const placeholderMesh = new THREE.Mesh(placeholderGeo, placeholderMat);
    globeGroup.add(placeholderMesh);

    // Load Earth_1_12756.glb
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/Earth_1_12756.glb',
      (gltf) => {
        const earthModel = gltf.scene;

        // Calculate bounding box and scale to exact target radius
        const bbox = new THREE.Box3().setFromObject(earthModel);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const center = new THREE.Vector3();
        bbox.getCenter(center);

        const equatorialRadius = Math.max(size.x, size.z) / 2;
        const scaleFactor = GLOBE_RADIUS / equatorialRadius;
        earthModel.scale.set(scaleFactor, scaleFactor, scaleFactor);

        // Center model exactly at origin
        earthModel.position.set(
          -center.x * scaleFactor,
          -center.y * scaleFactor,
          -center.z * scaleFactor
        );

        // Enhance materials
        earthModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            earthMeshRef.current = mesh;

            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.roughness = 0.72;
              mat.metalness = 0.08;
              if (mat.normalMap) {
                mat.normalScale = new THREE.Vector2(1.25, 1.25);
              }
            }
          }
        });

        // Remove placeholder and add real 3D Earth model
        globeGroup.remove(placeholderMesh);
        placeholderGeo.dispose();
        placeholderMat.dispose();

        globeGroup.add(earthModel);
        setIsLoading(false);
      },
      (progressEvent) => {
        if (progressEvent.total > 0) {
          const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setLoadProgress(pct);
        }
      },
      (error) => {
        console.warn('Could not load Earth_1_12756.glb directly:', error);
        setIsLoading(false);
      }
    );

    // Atmosphere Outer Glow Halo (Soft natural atmospheric limb)
    const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.045, 36, 36);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 glowColor;
        void main() {
          float intensity = pow(0.72 - dot(vNormal, vec3(0, 0, 1.0)), 2.8);
          gl_FragColor = vec4(glowColor, 1.0) * intensity;
        }
      `,
      uniforms: {
        glowColor: {
          value: new THREE.Color(darkMode ? '#525252' : '#a3a3a3'),
        },
      },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    globeGroup.add(atmosMesh);
    atmosphereRef.current = atmosMesh;

    // Atmospheric Orbital Navigation Ring (Subtle neutral line)
    const ringGeo = new THREE.RingGeometry(GLOBE_RADIUS * 1.25, GLOBE_RADIUS * 1.26, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: darkMode ? 0x404040 : 0xa3a3a3,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: darkMode ? 0.2 : 0.14,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2.35;
    globeGroup.add(ringMesh);

    // Markers Group
    const markersGroup = new THREE.Group();
    globeGroup.add(markersGroup);
    markersGroupRef.current = markersGroup;

    // Build Interactive 3D Beacon Pins on the Globe
    const pulseRings: THREE.Mesh[] = [];

    GLOBE_LOCATIONS.forEach((loc) => {
      const pos = latLonToVector3(loc.lat, loc.lon, GLOBE_RADIUS * 1.01);
      const markerObj = new THREE.Group();
      markerObj.position.copy(pos);
      markerObj.lookAt(pos.clone().multiplyScalar(2));
      markerObj.userData = { marker: loc };

      // Pin core sphere
      const isSpecial = loc.id === 'kush';
      const pinGeo = new THREE.SphereGeometry(isSpecial ? 0.052 : 0.04, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({
        color: isSpecial ? 0xf8fafc : 0xcfd8dc,
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      markerObj.add(pinMesh);

      // Pin beacon light stalk
      const stalkGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.15, 8);
      stalkGeo.translate(0, 0.075, 0);
      const stalkMat = new THREE.MeshBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.8,
      });
      const stalk = new THREE.Mesh(stalkGeo, stalkMat);
      stalk.rotation.x = Math.PI / 2;
      markerObj.add(stalk);

      // Pulsing Base Ring
      const pRingGeo = new THREE.RingGeometry(0.04, 0.08, 24);
      const pRingMat = new THREE.MeshBasicMaterial({
        color: 0x94a3b8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const pRing = new THREE.Mesh(pRingGeo, pRingMat);
      pRing.userData = { isSpecial };
      markerObj.add(pRing);
      pulseRings.push(pRing);

      markersGroup.add(markerObj);
    });

    pulseRingsRef.current = pulseRings;

    // Ambient floating celestial particles
    const starCount = 400;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 32;
      starPos[i + 1] = (Math.random() - 0.5) * 22;
      starPos[i + 2] = (Math.random() - 0.5) * 32;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: darkMode ? 0x64748b : 0x94a3b8,
      size: 0.04,
      transparent: true,
      opacity: darkMode ? 0.45 : 0.25,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 7. Mouse Interactivity & Coordinates
    const handleMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check pin markers
      if (markersGroupRef.current) {
        const intersects = raycaster.intersectObjects(markersGroupRef.current.children, true);
        if (intersects.length > 0) {
          let targetGroup: THREE.Object3D | null = intersects[0].object;
          while (targetGroup && !targetGroup.userData?.marker && targetGroup.parent) {
            targetGroup = targetGroup.parent;
          }
          if (targetGroup?.userData?.marker) {
            setHoveredMarker(targetGroup.userData.marker);
            setTooltipPos({ x: e.clientX, y: e.clientY });
            container.style.cursor = 'pointer';
            return;
          }
        }
      }

      // Check intersection with Earth surface to report accurate Lat / Lon
      if (earthMeshRef.current) {
        const globeIntersects = raycaster.intersectObject(earthMeshRef.current);
        if (globeIntersects.length > 0) {
          const pt = globeIntersects[0].point;
          const localPt = pt.clone();
          globeGroup.worldToLocal(localPt);
          localPt.normalize();

          // Calculate latitude & longitude according to GLB orientation
          const lat = (Math.asin(Math.min(Math.max(localPt.y, -1), 1)) * 180) / Math.PI;
          let lon = 45 - (Math.atan2(localPt.z, localPt.x) * 180) / Math.PI;
          while (lon > 180) lon -= 360;
          while (lon < -180) lon += 360;

          if (onCoordinatesChange) {
            onCoordinatesChange(parseFloat(lat.toFixed(2)), parseFloat(lon.toFixed(2)));
          }
        }
      }

      setHoveredMarker(null);
      container.style.cursor = 'grab';
    };

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      if (markersGroupRef.current) {
        const intersects = raycaster.intersectObjects(markersGroupRef.current.children, true);
        if (intersects.length > 0) {
          let targetGroup: THREE.Object3D | null = intersects[0].object;
          while (targetGroup && !targetGroup.userData?.marker && targetGroup.parent) {
            targetGroup = targetGroup.parent;
          }
          if (targetGroup?.userData?.marker) {
            onSelectMarker(targetGroup.userData.marker);
          }
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleClick);

    // 8. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      controls.update();

      // Marker pulse animation
      pulseRings.forEach((ring, idx) => {
        const wave = Math.sin(elapsedTime * 3.2 + idx * 0.8) * 0.5 + 0.5;
        const scale = 1 + wave * 1.35;
        ring.scale.set(scale, scale, 1);
        (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0.1, 1 - wave * 0.8);
      });

      // Subtle celestial star drift
      stars.rotation.y = elapsedTime * 0.008;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('click', handleClick);
      controls.removeEventListener('change', checkZoomTransition);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      controls.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      atmosGeo.dispose();
      atmosMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      renderer.dispose();
    };
  }, [darkMode]);

  // Smoothly rotate globe to targeted location
  const rotateToMarker = useCallback((marker: GlobeMarker) => {
    if (!globeGroupRef.current || !controlsRef.current || !cameraRef.current) return;

    controlsRef.current.autoRotate = false;

    // Angle to rotate (lat, lon) to face directly forward (+Z) towards the user
    const targetY = ((45 + marker.lon) * Math.PI) / 180;
    const targetX = ((-marker.lat * 0.8) * Math.PI) / 180;

    const startY = globeGroupRef.current.rotation.y;
    const startX = globeGroupRef.current.rotation.x;
    const startTime = performance.now();
    const duration = 1200;

    const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeInOutQuad(progress);

      if (globeGroupRef.current) {
        globeGroupRef.current.rotation.y = startY + (targetY - startY) * ease;
        globeGroupRef.current.rotation.x = startX + (targetX - startX) * ease;
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Resume gentle auto-rotation after 4 seconds
        setTimeout(() => {
          if (controlsRef.current) controlsRef.current.autoRotate = true;
        }, 4000);
      }
    };

    requestAnimationFrame(step);
  }, []);

  // Respond to targetMarkerId changes
  useEffect(() => {
    if (targetMarkerId) {
      const found = GLOBE_LOCATIONS.find((m) => m.id === targetMarkerId);
      if (found) {
        rotateToMarker(found);
      }
    }
  }, [targetMarkerId, rotateToMarker]);

  return (
    <div
      id="globe-3d-wrapper"
      className={`relative w-full h-full select-none overflow-hidden transition-colors duration-300 ${
        darkMode ? 'bg-[#09090b]' : 'bg-[#f4f4f5]'
      }`}
    >
      <div
        id="globe-canvas-container"
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none bg-transparent"
      />

      {/* Loading Indicator for GLB Model */}
      {isLoading && (
        <div
          id="globe-loading-hud"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-30 pointer-events-none transition-opacity duration-300 backdrop-blur-xs"
        >
          <div className="w-9 h-9 rounded-full border-2 border-neutral-400 border-t-transparent animate-spin" />
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 text-xs font-mono font-medium text-neutral-200 shadow-xl">
            <span>Loading 3D Earth (Earth_1_12756.glb)</span>
            {loadProgress > 0 && <span className="text-neutral-400">{loadProgress}%</span>}
          </div>
        </div>
      )}

      {/* Hover Marker Tooltip */}
      {hoveredMarker && tooltipPos && (
        <div
          id="globe-marker-tooltip"
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full mb-3 px-3.5 py-2 rounded-xl shadow-2xl backdrop-blur-xl border border-white/10 text-xs transition-all duration-150 animate-in fade-in zoom-in-95"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 12}px`,
            backgroundColor: darkMode ? 'rgba(18, 18, 20, 0.75)' : 'rgba(255, 255, 255, 0.85)',
            color: darkMode ? '#f5f5f5' : '#171717',
          }}
        >
          <div className="flex items-center gap-1.5 font-semibold text-[13px] tracking-tight">
            <span
              className={`w-2 h-2 rounded-full ${
                hoveredMarker.hasActiveModel ? 'bg-white animate-ping' : 'bg-neutral-400'
              }`}
            />
            <span>{hoveredMarker.name}</span>
          </div>
          <div className="text-[11px] opacity-75 mt-0.5">{hoveredMarker.region}</div>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-neutral-400 font-medium">
            <span>ELEV: {hoveredMarker.elev}</span>
            <span>•</span>
            <span className="text-neutral-200 font-semibold">Click to Explore in 3D</span>
          </div>
        </div>
      )}
      {/* Zoom Transition Overlay */}
      {isZoomTransitioning && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/80 border border-white/20 shadow-2xl text-white text-sm font-semibold">
            <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            <span>Zooming in to 2D Map View...</span>
          </div>
        </div>
      )}

      {/* Floating Zoom Controls & 2D Map Switcher */}
      <div className="absolute right-5 sm:right-7 top-1/2 -translate-y-1/2 z-30 pointer-events-auto flex flex-col items-center gap-2">
        <div
          className={`flex flex-col rounded-2xl border shadow-2xl backdrop-blur-xl overflow-hidden ${
            darkMode
              ? 'bg-black/70 border-white/15 divide-y divide-white/10 text-neutral-200'
              : 'bg-white/80 border-neutral-300 divide-y divide-neutral-200 text-neutral-800'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              if (!cameraRef.current || !controlsRef.current) return;
              const curDist = cameraRef.current.position.distanceTo(controlsRef.current.target);
              if (curDist <= 3.65) {
                if (onZoomInToMapRef.current) {
                  setIsZoomTransitioning(true);
                  const targetMarker = targetMarkerId
                    ? GLOBE_LOCATIONS.find((m) => m.id === targetMarkerId)
                    : null;
                  const coords = targetMarker
                    ? { lat: targetMarker.lat, lon: targetMarker.lon }
                    : { lat: 36.0, lon: 71.2 };
                  setTimeout(() => {
                    onZoomInToMapRef.current?.({ lat: coords.lat, lon: coords.lon, zoom: 9 });
                    setIsZoomTransitioning(false);
                  }, 250);
                }
              } else {
                const dir = new THREE.Vector3()
                  .subVectors(controlsRef.current.target, cameraRef.current.position)
                  .normalize();
                cameraRef.current.position.addScaledVector(dir, 0.9);
                controlsRef.current.update();
              }
            }}
            className="p-3 hover:bg-white/10 transition-colors"
            title="Zoom in (Zooming close switches to 2D Map)"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!cameraRef.current || !controlsRef.current) return;
              const dir = new THREE.Vector3()
                .subVectors(cameraRef.current.position, controlsRef.current.target)
                .normalize();
              cameraRef.current.position.addScaledVector(dir, 0.9);
              controlsRef.current.update();
            }}
            className="p-3 hover:bg-white/10 transition-colors"
            title="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
          {onZoomInToMap && (
            <button
              type="button"
              onClick={() => {
                const targetMarker = targetMarkerId
                  ? GLOBE_LOCATIONS.find((m) => m.id === targetMarkerId)
                  : null;
                const coords = targetMarker
                  ? { lat: targetMarker.lat, lon: targetMarker.lon }
                  : { lat: 36.0, lon: 71.2 };
                onZoomInToMap({ lat: coords.lat, lon: coords.lon, zoom: 9 });
              }}
              className="p-3 hover:bg-white/10 transition-colors"
              title="Switch to 2D Map"
            >
              <MapIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="hidden sm:block text-[10px] text-neutral-400 font-mono tracking-tight bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
          Zoom in for 2D Map
        </div>
      </div>
    </div>
  );
};
