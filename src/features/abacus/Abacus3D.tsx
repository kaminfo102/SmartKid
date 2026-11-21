import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { SorobanGuidedMove, SorobanState } from '../../types/app';
import { getColumnColor } from '../../lib/numbers';
import { toggleEarthBead, toggleHeavenBead } from './sorobanEngine';

interface Abacus3DProps {
  state: SorobanState;
  onChange: (next: SorobanState) => void;
  onBeadMove?: () => void;
  guidedMove?: SorobanGuidedMove | null;
  highlightColumn?: number;
  disabled?: boolean;
  scale?: 'normal' | 'large';
  reducedMotion?: boolean;
  nightMode?: boolean;
  onWebGLUnsupported?: () => void;
}

interface BeadEntity {
  mesh: THREE.Mesh;
  hitMesh: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
  columnIndex: number;
  beadType: 'heaven' | 'earth';
  beadIndex: number;
  currentY: number;
  targetY: number;
  baseColor: THREE.Color;
  activeColor: THREE.Color;
}

// Module-level reusable math helpers (zero GC inside animation loop)
const _pointerNdc = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
const _tempColor = new THREE.Color();

function detectSoftwareWebGL(): { supported: boolean; isSoftwareGl: boolean } {
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) return { supported: false, isSoftwareGl: true };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftware = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return { supported: true, isSoftwareGl: isSoftware };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

function createWoodTexture(baseHex: string, grainHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = grainHex;
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 42; i++) {
      ctx.lineWidth = 1 + (i % 3);
      ctx.beginPath();
      const y = (i / 42) * 256;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(85, y + Math.sin(i) * 6, 170, y - Math.cos(i) * 6, 256, y);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Creates authentic biconical Soroban bead geometry via LatheGeometry
 * with soft kid-friendly bevelled edges.
 */
function createSorobanBeadGeometry(radius: number, height: number): THREE.LatheGeometry {
  const halfH = height * 0.5;
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(radius * 0.24, -halfH),
    new THREE.Vector2(radius * 0.44, -halfH * 0.85),
    new THREE.Vector2(radius * 0.96, -halfH * 0.18),
    new THREE.Vector2(radius, 0),
    new THREE.Vector2(radius * 0.96, halfH * 0.18),
    new THREE.Vector2(radius * 0.44, halfH * 0.85),
    new THREE.Vector2(radius * 0.24, halfH),
  ];
  const geo = new THREE.LatheGeometry(pts, 28);
  geo.computeVertexNormals();
  return geo;
}

export const Abacus3D: React.FC<Abacus3DProps> = ({
  state,
  onChange,
  onBeadMove,
  guidedMove,
  highlightColumn,
  disabled = false,
  scale = 'normal',
  reducedMotion = false,
  nightMode = false,
  onWebGLUnsupported,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Latest props in refs so the mounted WebGL loop never recreates on state updates
  const stateRef = useRef(state);
  const onChangeRef = useRef(onChange);
  const onBeadMoveRef = useRef(onBeadMove);
  const guidedMoveRef = useRef(guidedMove);
  const highlightColRef = useRef(highlightColumn);
  const disabledRef = useRef(disabled);
  const scaleRef = useRef(scale);
  const reducedMotionRef = useRef(reducedMotion);
  const nightModeRef = useRef(nightMode);
  const onUnsupportedRef = useRef(onWebGLUnsupported);

  stateRef.current = state;
  onChangeRef.current = onChange;
  onBeadMoveRef.current = onBeadMove;
  guidedMoveRef.current = guidedMove;
  highlightColRef.current = highlightColumn;
  disabledRef.current = disabled;
  scaleRef.current = scale;
  reducedMotionRef.current = reducedMotion;
  nightModeRef.current = nightMode;
  onUnsupportedRef.current = onWebGLUnsupported;

  const rebuildSceneTriggerRef = useRef<(() => void) | null>(null);
  const updateTargetsTriggerRef = useRef<(() => void) | null>(null);
  const updateThemeTriggerRef = useRef<(() => void) | null>(null);

  const columnsCount = state.length;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const { supported, isSoftwareGl } = detectSoftwareWebGL();
    if (!supported) {
      onUnsupportedRef.current?.();
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      onUnsupportedRef.current?.();
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      onUnsupportedRef.current?.();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      34,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.1,
      100
    );

    // 3-Point Studio Lighting (Warm Key + Cool Hemisphere Fill + Soft Rim)
    const hemiLight = new THREE.HemisphereLight(0xeef6ff, 0xfff3e0, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e4, 1.85);
    keyLight.position.set(4, 7, 8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xc7e0ff, 0.7);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);

    // Procedural Textures & Shared Materials
    const woodTex = createWoodTexture('#D97706', '#92400E');
    woodTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const beamWoodTex = createWoodTexture('#78350F', '#451A03');
    beamWoodTex.anisotropy = woodTex.anisotropy;

    const frameMaterial = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.45,
      metalness: 0.05,
    });
    const beamMaterial = new THREE.MeshStandardMaterial({
      map: beamWoodTex,
      roughness: 0.42,
      metalness: 0.08,
    });
    const rodMaterial = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.22,
      metalness: 0.85,
    });
    const backdropMaterial = new THREE.MeshStandardMaterial({
      color: 0xfef9ee,
      roughness: 0.9,
      metalness: 0.0,
    });
    const highlightPillarMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.18,
    });

    // Guided Path Indicator Group (glowing ring + directional shaft-and-cone arrow)
    const guideGroup = new THREE.Group();
    guideGroup.visible = false;
    const guideRingGeo = new THREE.TorusGeometry(0.58, 0.065, 16, 36);
    const guideRingMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.96,
    });
    const guideRingMesh = new THREE.Mesh(guideRingGeo, guideRingMat);
    guideRingMesh.rotation.x = Math.PI / 2;
    guideGroup.add(guideRingMesh);

    const guideArrowGroup = new THREE.Group();
    const guideArrowGeo = new THREE.ConeGeometry(0.19, 0.34, 18);
    const guideShaftGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.36, 12);
    const guideArrowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const guideArrowMesh = new THREE.Mesh(guideArrowGeo, guideArrowMat);
    guideArrowMesh.position.y = 0.24;
    const guideShaftMesh = new THREE.Mesh(guideShaftGeo, guideArrowMat);
    guideShaftMesh.position.y = 0;
    guideArrowGroup.add(guideArrowMesh, guideShaftMesh);
    guideGroup.add(guideArrowGroup);

    // Dynamic Abacus Root Group
    const abacusGroup = new THREE.Group();
    scene.add(abacusGroup);

    const disposableGeometries: THREE.BufferGeometry[] = [
      guideRingGeo,
      guideArrowGeo,
      guideShaftGeo,
    ];
    const disposableMaterials: THREE.Material[] = [
      frameMaterial,
      beamMaterial,
      rodMaterial,
      backdropMaterial,
      highlightPillarMat,
      guideRingMat,
      guideArrowMat,
    ];

    let beadEntities: BeadEntity[] = [];
    let hitTargets: THREE.Object3D[] = [];
    let highlightMesh: THREE.Mesh | null = null;
    let currentCols = 0;

    // Soroban vertical geometry constants (world units)
    const colSpacing = 1.55;
    const innerTopY = 2.05;
    const beamY = 0.88;
    const beamHeight = 0.24;
    const innerBottomY = -2.25;
    const beadRadius = 0.48;
    const beadHeight = 0.44;
    const heavenRestY = 1.62;
    const heavenActiveY = beamY + beamHeight * 0.5 + beadHeight * 0.5 + 0.04;
    const earthGap = 0.48;

    function getEarthTargetY(beadIdx: number, activeCount: number): number {
      const isActive = beadIdx < activeCount;
      if (isActive) {
        // Pushed up toward beam: bead 0 highest
        return beamY - beamHeight * 0.5 - beadHeight * 0.5 - 0.05 - beadIdx * earthGap;
      }
      // Resting at bottom: bead 3 lowest
      const bottomBase = innerBottomY + beadHeight * 0.5 + 0.06;
      return bottomBase + (3 - beadIdx) * earthGap;
    }

    const sharedBeadGeo = createSorobanBeadGeometry(beadRadius, beadHeight);
    const sharedHitGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.66, 12);
    const hitInvisibleMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    disposableGeometries.push(sharedBeadGeo, sharedHitGeo);
    disposableMaterials.push(hitInvisibleMat);

    const dynamicGeos: THREE.BufferGeometry[] = [];
    const dynamicMats: THREE.Material[] = [];

    function buildAbacus(cols: number) {
      // Clear previous dynamic children
      while (abacusGroup.children.length > 0) {
        abacusGroup.remove(abacusGroup.children[0]);
      }
      dynamicGeos.forEach((g) => g.dispose());
      dynamicMats.forEach((m) => m.dispose());
      dynamicGeos.length = 0;
      dynamicMats.length = 0;
      beadEntities = [];
      hitTargets = [];
      currentCols = cols;

      const innerWidth = Math.max(2.1, cols * colSpacing + 0.5);
      const frameThickness = 0.34;
      const frameDepth = 0.65;
      const totalWidth = innerWidth + frameThickness * 2;
      const innerHeight = innerTopY - innerBottomY;
      const centerY = (innerTopY + innerBottomY) * 0.5;

      // Top & Bottom Wooden Frame Bars
      const hBarGeo = new THREE.BoxGeometry(totalWidth, frameThickness, frameDepth);
      const vBarGeo = new THREE.BoxGeometry(
        frameThickness,
        innerHeight + frameThickness * 2,
        frameDepth
      );
      const beamGeo = new THREE.BoxGeometry(innerWidth + 0.08, beamHeight, frameDepth * 0.92);
      const backGeo = new THREE.PlaneGeometry(innerWidth + 0.08, innerHeight + 0.04);
      const rodGeo = new THREE.CylinderGeometry(0.065, 0.065, innerHeight, 16);
      const dotGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12);
      const hlGeo = new THREE.BoxGeometry(colSpacing * 0.88, innerHeight - 0.1, 0.1);

      dynamicGeos.push(hBarGeo, vBarGeo, beamGeo, backGeo, rodGeo, dotGeo, hlGeo);

      const topBar = new THREE.Mesh(hBarGeo, frameMaterial);
      topBar.position.set(0, innerTopY + frameThickness * 0.5, 0);
      topBar.castShadow = !isSoftwareGl;
      topBar.receiveShadow = true;

      const bottomBar = new THREE.Mesh(hBarGeo, frameMaterial);
      bottomBar.position.set(0, innerBottomY - frameThickness * 0.5, 0);
      bottomBar.castShadow = !isSoftwareGl;
      bottomBar.receiveShadow = true;

      const leftBar = new THREE.Mesh(vBarGeo, frameMaterial);
      leftBar.position.set(-innerWidth * 0.5 - frameThickness * 0.5, centerY, 0);
      leftBar.castShadow = !isSoftwareGl;
      leftBar.receiveShadow = true;

      const rightBar = new THREE.Mesh(vBarGeo, frameMaterial);
      rightBar.position.set(innerWidth * 0.5 + frameThickness * 0.5, centerY, 0);
      rightBar.castShadow = !isSoftwareGl;
      rightBar.receiveShadow = true;

      const beam = new THREE.Mesh(beamGeo, beamMaterial);
      beam.position.set(0, beamY, 0.02);
      beam.castShadow = !isSoftwareGl;
      beam.receiveShadow = true;

      const backdrop = new THREE.Mesh(backGeo, backdropMaterial);
      backdrop.position.set(0, centerY, -0.26);
      backdrop.receiveShadow = true;

      // Grounding shadow plane underneath abacus
      const groundShadowGeo = new THREE.PlaneGeometry(totalWidth * 1.1, 1.3);
      const groundShadowMat = new THREE.MeshBasicMaterial({
        color: 0x0f172a,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      });
      dynamicGeos.push(groundShadowGeo);
      dynamicMats.push(groundShadowMat);
      const groundShadow = new THREE.Mesh(groundShadowGeo, groundShadowMat);
      groundShadow.rotation.x = -Math.PI / 2;
      groundShadow.position.set(0, innerBottomY - frameThickness - 0.12, 0);

      abacusGroup.add(topBar, bottomBar, leftBar, rightBar, beam, backdrop, groundShadow);

      // Column highlight box
      highlightMesh = new THREE.Mesh(hlGeo, highlightPillarMat);
      highlightMesh.position.set(0, centerY, -0.18);
      highlightMesh.visible = false;
      abacusGroup.add(highlightMesh);

      const dotMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 });
      dynamicMats.push(dotMat);

      // Build Columns: index 0 is rightmost (Units)
      const startX = ((cols - 1) * colSpacing) * 0.5;
      const curState = stateRef.current;

      for (let colIdx = 0; colIdx < cols; colIdx++) {
        const x = startX - colIdx * colSpacing;
        const colState = curState[colIdx] ?? { heavenActive: false, earthCount: 0 };

        const rod = new THREE.Mesh(rodGeo, rodMaterial);
        rod.position.set(x, centerY, 0);
        rod.castShadow = !isSoftwareGl;
        abacusGroup.add(rod);

        // Unit marker dot on the beam for Units (0) and Thousands (3)
        if (colIdx % 3 === 0) {
          const dot = new THREE.Mesh(dotGeo, dotMat);
          dot.rotation.x = Math.PI / 2;
          dot.position.set(x, beamY, frameDepth * 0.48);
          abacusGroup.add(dot);
        }

        // Heaven Bead (Value 5)
        const heavenBase = new THREE.Color('#F97316');
        const heavenActive = new THREE.Color('#FB923C');
        const heavenMat = new THREE.MeshPhysicalMaterial({
          color: heavenBase,
          roughness: 0.28,
          metalness: 0.06,
          clearcoat: 0.55,
          clearcoatRoughness: 0.25,
          emissive: new THREE.Color(0x000000),
        });
        dynamicMats.push(heavenMat);

        const hY = colState.heavenActive ? heavenActiveY : heavenRestY;
        const hMesh = new THREE.Mesh(sharedBeadGeo, heavenMat);
        hMesh.position.set(x, hY, 0);
        hMesh.castShadow = !isSoftwareGl;
        hMesh.receiveShadow = true;

        const hHit = new THREE.Mesh(sharedHitGeo, hitInvisibleMat);
        hHit.position.set(x, hY, 0);
        hHit.userData = { columnIndex: colIdx, beadType: 'heaven', beadIndex: 0 };

        abacusGroup.add(hMesh, hHit);
        hitTargets.push(hHit);
        beadEntities.push({
          mesh: hMesh,
          hitMesh: hHit,
          material: heavenMat,
          columnIndex: colIdx,
          beadType: 'heaven',
          beadIndex: 0,
          currentY: hY,
          targetY: hY,
          baseColor: heavenBase,
          activeColor: heavenActive,
        });

        // Earth Beads (4 lower beads, each value 1)
        const earthColorHex = getColumnColor(colIdx);
        for (let bIdx = 0; bIdx < 4; bIdx++) {
          const earthBase = new THREE.Color(earthColorHex);
          const earthActive = earthBase.clone().offsetHSL(0, 0.08, 0.08);
          const earthMat = new THREE.MeshPhysicalMaterial({
            color: earthBase,
            roughness: 0.28,
            metalness: 0.05,
            clearcoat: 0.5,
            clearcoatRoughness: 0.25,
            emissive: new THREE.Color(0x000000),
          });
          dynamicMats.push(earthMat);

          const eY = getEarthTargetY(bIdx, colState.earthCount);
          const eMesh = new THREE.Mesh(sharedBeadGeo, earthMat);
          eMesh.position.set(x, eY, 0);
          eMesh.castShadow = !isSoftwareGl;
          eMesh.receiveShadow = true;

          const eHit = new THREE.Mesh(sharedHitGeo, hitInvisibleMat);
          eHit.position.set(x, eY, 0);
          eHit.userData = { columnIndex: colIdx, beadType: 'earth', beadIndex: bIdx };

          abacusGroup.add(eMesh, eHit);
          hitTargets.push(eHit);
          beadEntities.push({
            mesh: eMesh,
            hitMesh: eHit,
            material: earthMat,
            columnIndex: colIdx,
            beadType: 'earth',
            beadIndex: bIdx,
            currentY: eY,
            targetY: eY,
            baseColor: earthBase,
            activeColor: earthActive,
          });
        }
      }

      abacusGroup.add(guideGroup);
      fitCamera();
    }

    function fitCamera() {
      const width = Math.max(1, container?.clientWidth ?? 320);
      const height = Math.max(1, container?.clientHeight ?? 320);
      const aspect = width / height;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();

      const cols = Math.max(1, currentCols);
      const frameW = Math.max(2.6, cols * colSpacing + 1.4);
      const frameH = 5.4;
      const vFovRad = THREE.MathUtils.degToRad(camera.fov);
      const distForHeight = (frameH * 0.5) / Math.tan(vFovRad * 0.5);
      const distForWidth = (frameW * 0.5) / (Math.tan(vFovRad * 0.5) * aspect);
      const scaleMul = scaleRef.current === 'large' ? 0.88 : 1.02;
      const dist = Math.max(distForHeight, distForWidth) * scaleMul + 0.5;

      camera.position.set(0, -0.05, dist);
      camera.lookAt(0, -0.08, 0);
    }

    function syncBeadTargets() {
      const curState = stateRef.current;
      const guide = guidedMoveRef.current;
      const hlCol = highlightColRef.current;

      if (highlightMesh) {
        if (hlCol !== undefined && hlCol >= 0 && hlCol < curState.length) {
          const startX = ((curState.length - 1) * colSpacing) * 0.5;
          highlightMesh.position.x = startX - hlCol * colSpacing;
          highlightMesh.visible = true;
        } else {
          highlightMesh.visible = false;
        }
      }

      let foundGuidedBead: BeadEntity | null = null;

      for (const bead of beadEntities) {
        const col = curState[bead.columnIndex];
        if (!col) continue;
        let isActive = false;
        if (bead.beadType === 'heaven') {
          isActive = col.heavenActive;
          bead.targetY = isActive ? heavenActiveY : heavenRestY;
        } else {
          isActive = bead.beadIndex < col.earthCount;
          bead.targetY = getEarthTargetY(bead.beadIndex, col.earthCount);
        }

        bead.material.color.copy(isActive ? bead.activeColor : bead.baseColor);
        const isGuided =
          guide &&
          guide.columnIndex === bead.columnIndex &&
          guide.beadType === bead.beadType &&
          (bead.beadType === 'heaven' || guide.beadIndex === bead.beadIndex);

        if (isGuided) {
          foundGuidedBead = bead;
          bead.material.emissive.setHex(0x92400e);
          bead.material.emissiveIntensity = 0.55;
        } else {
          bead.material.emissive.setHex(isActive ? 0x1e293b : 0x000000);
          bead.material.emissiveIntensity = isActive ? 0.14 : 0;
        }
      }

      if (foundGuidedBead && guide) {
        guideGroup.visible = true;
        guideGroup.position.set(
          foundGuidedBead.mesh.position.x,
          foundGuidedBead.targetY,
          0.36
        );
        const goingDown =
          (guide.beadType === 'heaven' && guide.direction === 'toward-beam') ||
          (guide.beadType === 'earth' && guide.direction === 'away-from-beam');
        guideGroup.userData.goingDown = goingDown;
        guideArrowGroup.position.set(0, goingDown ? -0.52 : 0.52, 0.16);
        guideArrowGroup.rotation.z = goingDown ? Math.PI : 0;
      } else {
        guideGroup.visible = false;
      }
    }

    function syncTheme() {
      const dark = nightModeRef.current;
      backdropMaterial.color.setHex(dark ? 0x1e293b : 0xfef9ee);
      hemiLight.intensity = dark ? 0.78 : 0.95;
    }

    rebuildSceneTriggerRef.current = () => {
      buildAbacus(stateRef.current.length);
      syncBeadTargets();
      syncTheme();
      requestRender();
    };
    updateTargetsTriggerRef.current = () => {
      syncBeadTargets();
      requestRender();
    };
    updateThemeTriggerRef.current = () => {
      syncTheme();
      fitCamera();
      requestRender();
    };

    buildAbacus(stateRef.current.length);
    syncBeadTargets();
    syncTheme();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Pointer Interaction (Supports both simple Tap/Click AND vertical Drag)
    let activeDrag: {
      columnIndex: number;
      beadType: 'heaven' | 'earth';
      beadIndex: number;
      startClientY: number;
      handledDrag: boolean;
      pointerId: number;
    } | null = null;
    let lastInteractionTime = 0;

    function updatePointerFromEvent(clientX: number, clientY: number) {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }

    function triggerBeadToggle(
      columnIndex: number,
      beadType: 'heaven' | 'earth',
      beadIndex: number
    ) {
      if (disabledRef.current) return;
      const now = performance.now();
      if (now - lastInteractionTime < 65) return; // Anti-bounce guard on rapid multi-taps
      lastInteractionTime = now;

      const cur = stateRef.current;
      const next =
        beadType === 'heaven'
          ? toggleHeavenBead(cur, columnIndex)
          : toggleEarthBead(cur, columnIndex, beadIndex);
      onChangeRef.current(next);
      onBeadMoveRef.current?.();
    }

    function onPointerDown(e: PointerEvent) {
      if (disabledRef.current) return;
      updatePointerFromEvent(e.clientX, e.clientY);
      _raycaster.setFromCamera(_pointerNdc, camera);
      const hits = _raycaster.intersectObjects(hitTargets, false);
      if (hits.length > 0) {
        const data = hits[0].object.userData as {
          columnIndex: number;
          beadType: 'heaven' | 'earth';
          beadIndex: number;
        };
        activeDrag = {
          ...data,
          startClientY: e.clientY,
          handledDrag: false,
          pointerId: e.pointerId,
        };
        renderer.domElement.setPointerCapture?.(e.pointerId);
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!activeDrag || activeDrag.handledDrag || disabledRef.current) return;
      const dy = e.clientY - activeDrag.startClientY;
      if (Math.abs(dy) >= 16) {
        const curCol = stateRef.current[activeDrag.columnIndex];
        if (!curCol) return;
        activeDrag.handledDrag = true;

        if (activeDrag.beadType === 'heaven') {
          const wantActive = dy > 0; // drag down = toward beam
          if (wantActive !== curCol.heavenActive) {
            triggerBeadToggle(activeDrag.columnIndex, 'heaven', 0);
          }
        } else {
          const wantUp = dy < 0; // drag up = toward beam
          const isCurrentlyActive = activeDrag.beadIndex < curCol.earthCount;
          if (wantUp && !isCurrentlyActive) {
            triggerBeadToggle(activeDrag.columnIndex, 'earth', activeDrag.beadIndex);
          } else if (!wantUp && isCurrentlyActive) {
            triggerBeadToggle(activeDrag.columnIndex, 'earth', activeDrag.beadIndex);
          }
        }
      }
    }

    function onPointerUp(e: PointerEvent) {
      if (!activeDrag) return;
      if (!activeDrag.handledDrag) {
        triggerBeadToggle(activeDrag.columnIndex, activeDrag.beadType, activeDrag.beadIndex);
      }
      if (renderer.domElement.hasPointerCapture?.(e.pointerId)) {
        renderer.domElement.releasePointerCapture(e.pointerId);
      }
      activeDrag = null;
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);

    // On-demand render loop with smooth exponential damping + software-WebGL pacing
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const syncState = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (syncState === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (disposed) return;
        renderDirty = false;
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;

        let needsMoreFrames = false;
        const snap = reducedMotionRef.current;

        for (const bead of beadEntities) {
          if (snap) {
            bead.currentY = bead.targetY;
          } else {
            bead.currentY = THREE.MathUtils.damp(bead.currentY, bead.targetY, 18, dt);
            if (Math.abs(bead.currentY - bead.targetY) > 0.004) {
              needsMoreFrames = true;
            } else {
              bead.currentY = bead.targetY;
            }
          }
          bead.mesh.position.y = bead.currentY;
          bead.hitMesh.position.y = bead.currentY;
        }

        // Subtle pulse & directional arrow bounce on guided indicator
        if (guideGroup.visible && !snap) {
          const pulse = 1 + Math.sin(now * 0.006) * 0.09;
          guideRingMesh.scale.set(pulse, pulse, 1);
          const goingDown = Boolean(guideGroup.userData.goingDown);
          const dirSign = goingDown ? -1 : 1;
          const bob = Math.sin(now * 0.007) * 0.12 * dirSign;
          guideArrowGroup.position.y = (goingDown ? -0.52 : 0.52) + bob;
          needsMoreFrames = true;
        }

        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (disposed) return;
          if (renderDirty || needsMoreFrames) {
            requestRender();
          }
        };

        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    // ResizeObserver for crisp mobile viewport & orientation changes
    const resizeObserver = new ResizeObserver(() => {
      if (disposed || !container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      renderer.setSize(w, h, false);
      fitCamera();
      requestRender();
    });
    resizeObserver.observe(container);

    renderer.setSize(
      Math.max(1, container.clientWidth),
      Math.max(1, container.clientHeight),
      false
    );
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);

      dynamicGeos.forEach((g) => g.dispose());
      dynamicMats.forEach((m) => m.dispose());
      disposableGeometries.forEach((g) => g.dispose());
      disposableMaterials.forEach((m) => m.dispose());
      woodTex.dispose();
      beamWoodTex.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    rebuildSceneTriggerRef.current?.();
  }, [columnsCount]);

  useEffect(() => {
    updateTargetsTriggerRef.current?.();
  }, [state, guidedMove, highlightColumn]);

  useEffect(() => {
    updateThemeTriggerRef.current?.();
  }, [nightMode, scale]);

  return (
    <div
      ref={mountRef}
      role="application"
      aria-label="چرتکه سه‌بعدی تعاملی سوروبان"
      className="w-full h-full min-h-[300px] cursor-pointer select-none"
    />
  );
};
