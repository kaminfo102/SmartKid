import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type {
  CameraPreset,
  ColorMode,
  RodState,
  SorobanTheme,
} from '../../../types/app';

export interface SorobanSceneOptions {
  rods: RodState[];
  totalRods: number;
  activeUnitIndex: number;
  theme: SorobanTheme;
  colorMode: ColorMode;
  showHalo: boolean;
  cameraPreset: CameraPreset;
  isCssRotated90?: boolean;
}

export interface SorobanSceneCallbacks {
  onToggleUpper: (rodIndex: number) => void;
  onSetLowerCount: (rodIndex: number, count: number) => void;
  onSelectUnitIndex: (index: number) => void;
  onTriggerReset: () => void;
  onBeadSound?: () => void;
}

interface BeadEntity {
  rodIndex: number;
  beadType: 'upper' | 'lower';
  beadIndex: number; // 0 for upper; 0..3 (top-to-bottom) for lower
  mesh: THREE.Mesh;
  hitMesh: THREE.Mesh;
  currentY: number;
  targetY: number;
  isMarker: boolean;
}

interface TrackedPointer {
  id: number;
  lx: number;
  ly: number;
  startLx: number;
  startLy: number;
  type: string;
}

const _vec2 = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();

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
    ctx.globalAlpha = 0.24;
    for (let i = 0; i < 48; i++) {
      ctx.lineWidth = 0.9 + (i % 3) * 0.7;
      ctx.beginPath();
      const y = (i / 48) * 256;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(
        82,
        y + Math.sin(i * 0.7) * 5,
        174,
        y - Math.cos(i * 0.7) * 5,
        256,
        y
      );
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createNameplateTexture(label: string, brassHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 512, 96);
    grad.addColorStop(0, '#23201b');
    grad.addColorStop(0.5, '#332d22');
    grad.addColorStop(1, '#201d18');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 96);

    ctx.strokeStyle = brassHex;
    ctx.lineWidth = 5;
    ctx.strokeRect(5, 5, 502, 86);

    ctx.fillStyle = '#f5dc88';
    ctx.font = 'bold 42px Vazirmatn, Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label || 'کودک نابغه', 256, 50);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBiconicalBeadGeometry(radius: number, height: number): THREE.LatheGeometry {
  const halfH = height * 0.5;
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(radius * 0.19, -halfH),
    new THREE.Vector2(radius * 0.25, -halfH),
    new THREE.Vector2(radius * 0.94, -halfH * 0.13),
    new THREE.Vector2(radius, 0),
    new THREE.Vector2(radius * 0.94, halfH * 0.13),
    new THREE.Vector2(radius * 0.25, halfH),
    new THREE.Vector2(radius * 0.19, halfH),
  ];
  const geo = new THREE.LatheGeometry(pts, 32);
  geo.computeVertexNormals();
  return geo;
}

export class SorobanSceneController {
  private container: HTMLElement;
  private callbacks: SorobanSceneCallbacks;
  private options: SorobanSceneOptions;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private envTarget: THREE.WebGLRenderTarget | null = null;
  private boardGroup = new THREE.Group();

  private beads: BeadEntity[] = [];
  private hitMeshes: THREE.Object3D[] = [];
  private disposables: Array<{ dispose: () => void }> = [];

  private beadWhiteMat!: THREE.MeshPhysicalMaterial;
  private beadMarkerMat!: THREE.MeshPhysicalMaterial;
  private frameWoodMat!: THREE.MeshStandardMaterial;
  private beamMat!: THREE.MeshStandardMaterial;
  private rodMat!: THREE.MeshStandardMaterial;
  private brassMat!: THREE.MeshStandardMaterial;
  private plateMat!: THREE.MeshStandardMaterial;
  private plateTex: THREE.CanvasTexture | null = null;
  private woodTex: THREE.CanvasTexture | null = null;

  private totalRods = 17;
  private rodSpacing = 1.06;
  private beadRadius = 0.48;
  private beadHeight = 0.56;
  private beamHalfH = 0.18;
  private upperZoneH = 1.24;
  private lowerZoneH = 2.96;
  private boardCenterOffsetY = 0.86;
  private outerW = 19.9;
  private outerH = 5.88;

  private isSoftwareGl = false;
  private containerW = 1;
  private containerH = 1;
  private baseFitZ = 16;

  private zoomScale = 1.0;
  private targetZoomScale = 1.0;
  private panX = 0;
  private panY = 0;
  private targetPanX = 0;
  private targetPanY = 0;

  private rafId = 0;
  private lastFrameMs = 0;
  private lastRenderEndMs = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver | null = null;

  private pointers = new Map<number, TrackedPointer>();
  private pinchStartDist = 0;
  private pinchStartZoom = 1;
  private lastMidLx = 0;
  private lastMidLy = 0;
  private lastBgTapMs = 0;

  private activeBeadDrag: {
    pointerId: number;
    bead: BeadEntity;
    startLy: number;
    moved: boolean;
    appliedOnDrag: boolean;
  } | null = null;
  private activeBgPanPointerId: number | null = null;

  constructor(
    container: HTMLElement,
    initialOptions: SorobanSceneOptions,
    callbacks: SorobanSceneCallbacks
  ) {
    this.container = container;
    this.options = initialOptions;
    this.callbacks = callbacks;
    this.totalRods = Math.max(5, initialOptions.totalRods || 17);

    const glCheck = detectSoftwareWebGL();
    this.isSoftwareGl = glCheck.isSoftwareGl;

    if (!glCheck.supported) {
      return;
    }

    this.initRendererAndScene();
    this.buildSorobanModel();
    this.applyOptions(initialOptions, true);
    this.measureAndFit(true);
    this.bindEvents();
    this.requestRender();
  }

  private getMarkerRodSet(): Set<number> {
    const center = Math.floor(this.totalRods / 2);
    const set = new Set<number>();
    for (let i = 0; i < this.totalRods; i++) {
      if ((i - center) % 3 === 0) {
        set.add(i);
      }
    }
    return set;
  }

  private initRendererAndScene() {
    this.containerW = Math.max(1, this.container.clientWidth);
    this.containerH = Math.max(1, this.container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.setSize(this.containerW, this.containerH);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    if (!this.isSoftwareGl) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.updateBackdropColor();

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envTarget = pmrem.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(
      34,
      this.containerW / this.containerH,
      0.1,
      140
    );

    // Three-point studio lighting tailored to dark wood, brass, and crisp ivory/coral beads
    const hemiLight = new THREE.HemisphereLight(0xf6fbf9, 0x1e2623, 0.65);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffaf0, 1.55);
    keyLight.position.set(5, 11, 14);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
    }
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd9efe8, 0.72);
    rimLight.position.set(-9, 6, 8);
    this.scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xffe6cc, 0.45);
    fillLight.position.set(0, -8, 10);
    this.scene.add(fillLight);

    this.boardGroup.position.set(0, this.boardCenterOffsetY, 0);
    this.scene.add(this.boardGroup);
  }

  private updateBackdropColor() {
    if (!this.scene) return;
    const bgHex =
      this.options.colorMode === 'dark'
        ? this.options.theme.studioBgDark
        : this.options.theme.studioBgLight;
    this.scene.background = new THREE.Color(bgHex);
  }

  private getUpperY(active: boolean): number {
    const innerTop = this.beamHalfH + this.upperZoneH;
    const beadHalf = this.beadHeight * 0.5;
    return active
      ? this.beamHalfH + beadHalf + 0.04
      : innerTop - beadHalf - 0.04;
  }

  private getLowerY(beadIndex: number, lowerCount: number): number {
    const innerBottom = -(this.beamHalfH + this.lowerZoneH);
    const beadHalf = this.beadHeight * 0.5;
    if (beadIndex < lowerCount) {
      return -this.beamHalfH - beadHalf - 0.04 - beadIndex * this.beadHeight;
    }
    return innerBottom + beadHalf + 0.04 + (3 - beadIndex) * this.beadHeight;
  }

  private buildSorobanModel() {
    const theme = this.options.theme;
    const innerW = this.totalRods * this.rodSpacing + 0.56;
    const frameThick = 0.66;
    const frameDepth = 1.12;
    this.outerW = innerW + frameThick * 2;
    const innerTop = this.beamHalfH + this.upperZoneH;
    const innerBottom = -(this.beamHalfH + this.lowerZoneH);
    const innerH = innerTop - innerBottom;
    this.outerH = innerH + frameThick * 2;
    this.boardCenterOffsetY = -(innerTop + innerBottom) * 0.5;
    this.boardGroup.position.set(0, this.boardCenterOffsetY, 0);

    this.woodTex = createWoodTexture(theme.frameColor, theme.frameGrainColor);
    this.plateTex = createNameplateTexture(theme.plateText, theme.brassColor);

    this.frameWoodMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.woodTex,
      roughness: 0.52,
      metalness: 0.08,
    });
    this.beamMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.beamColor),
      roughness: 0.4,
      metalness: 0.16,
    });
    this.rodMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.rodColor),
      roughness: 0.34,
      metalness: 0.52,
    });
    this.brassMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.brassColor),
      roughness: 0.25,
      metalness: 0.88,
    });
    this.plateMat = new THREE.MeshStandardMaterial({
      map: this.plateTex,
      roughness: 0.32,
      metalness: 0.65,
    });
    this.beadWhiteMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(theme.beadColor),
      roughness: theme.beadRoughness,
      metalness: theme.beadMetalness,
      clearcoat: 0.38,
      clearcoatRoughness: 0.22,
    });
    this.beadMarkerMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(theme.markerBeadColor),
      roughness: theme.beadRoughness,
      metalness: theme.beadMetalness,
      clearcoat: 0.42,
      clearcoatRoughness: 0.2,
    });

    const accentWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.05,
    });

    this.disposables.push(
      this.woodTex,
      this.plateTex,
      this.frameWoodMat,
      this.beamMat,
      this.rodMat,
      this.brassMat,
      this.plateMat,
      this.beadWhiteMat,
      this.beadMarkerMat,
      accentWhiteMat
    );

    // Outer 4 frame bars
    const topBarGeo = new THREE.BoxGeometry(this.outerW, frameThick, frameDepth);
    const sideBarGeo = new THREE.BoxGeometry(frameThick, innerH, frameDepth);
    this.disposables.push(topBarGeo, sideBarGeo);

    const topBar = new THREE.Mesh(topBarGeo, this.frameWoodMat);
    topBar.position.set(0, innerTop + frameThick * 0.5, 0);
    topBar.receiveShadow = true;
    this.boardGroup.add(topBar);

    const bottomBar = new THREE.Mesh(topBarGeo, this.frameWoodMat);
    bottomBar.position.set(0, innerBottom - frameThick * 0.5, 0);
    bottomBar.receiveShadow = true;
    this.boardGroup.add(bottomBar);

    const leftBar = new THREE.Mesh(sideBarGeo, this.frameWoodMat);
    leftBar.position.set(-(innerW * 0.5 + frameThick * 0.5), (innerTop + innerBottom) * 0.5, 0);
    leftBar.receiveShadow = true;
    this.boardGroup.add(leftBar);

    const rightBar = new THREE.Mesh(sideBarGeo, this.frameWoodMat);
    rightBar.position.set(innerW * 0.5 + frameThick * 0.5, (innerTop + innerBottom) * 0.5, 0);
    rightBar.receiveShadow = true;
    this.boardGroup.add(rightBar);

    // Subtle recessed inner bevel trim inside frame
    const trimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.frameEdgeColor),
      roughness: 0.45,
      metalness: 0.14,
    });
    this.disposables.push(trimMat);
    const frontBevelTopGeo = new THREE.BoxGeometry(innerW + 0.12, 0.06, 0.14);
    this.disposables.push(frontBevelTopGeo);
    const bevelTop = new THREE.Mesh(frontBevelTopGeo, trimMat);
    bevelTop.position.set(0, innerTop + 0.03, frameDepth * 0.5 - 0.06);
    this.boardGroup.add(bevelTop);
    const bevelBot = new THREE.Mesh(frontBevelTopGeo, trimMat);
    bevelBot.position.set(0, innerBottom - 0.03, frameDepth * 0.5 - 0.06);
    this.boardGroup.add(bevelBot);

    // Horizontal divider beam (with front beveled highlight strip)
    const beamDepth = 0.72;
    const beamMainGeo = new THREE.BoxGeometry(innerW + 0.06, this.beamHalfH * 2, beamDepth);
    const beamFacetGeo = new THREE.BoxGeometry(innerW + 0.06, 0.14, 0.1);
    this.disposables.push(beamMainGeo, beamFacetGeo);

    const beamMesh = new THREE.Mesh(beamMainGeo, this.beamMat);
    beamMesh.position.set(0, 0, 0);
    beamMesh.castShadow = true;
    beamMesh.receiveShadow = true;
    this.boardGroup.add(beamMesh);

    const beamFacet = new THREE.Mesh(beamFacetGeo, trimMat);
    beamFacet.position.set(0, 0, beamDepth * 0.5 + 0.02);
    this.boardGroup.add(beamFacet);

    // Top-center metallic nameplate matching reference image
    const plateGeo = new THREE.BoxGeometry(2.55, 0.34, 0.05);
    this.disposables.push(plateGeo);
    const plateMesh = new THREE.Mesh(plateGeo, this.plateMat);
    plateMesh.position.set(0, innerTop + frameThick * 0.5, frameDepth * 0.5 + 0.02);
    this.boardGroup.add(plateMesh);

    // 4 brushed brass L-shaped corner brackets with 3 tiny rivets each
    const cornerArmLen = 0.76;
    const cornerArmW = 0.22;
    const cornerDepth = 0.06;
    const armHGeo = new THREE.BoxGeometry(cornerArmLen, cornerArmW, cornerDepth);
    const armVGeo = new THREE.BoxGeometry(cornerArmW, cornerArmLen, cornerDepth);
    const rivetGeo = new THREE.SphereGeometry(0.032, 10, 8);
    this.disposables.push(armHGeo, armVGeo, rivetGeo);

    const corners = [
      { sx: -1, sy: 1 },
      { sx: 1, sy: 1 },
      { sx: -1, sy: -1 },
      { sx: 1, sy: -1 },
    ];
    const halfOutW = this.outerW * 0.5;
    const edgeTopY = innerTop + frameThick;
    const edgeBotY = innerBottom - frameThick;
    const frontZ = frameDepth * 0.5 + cornerDepth * 0.5 - 0.005;

    for (const c of corners) {
      const edgeY = c.sy > 0 ? edgeTopY : edgeBotY;
      const edgeX = c.sx * halfOutW;

      const hArm = new THREE.Mesh(armHGeo, this.brassMat);
      hArm.position.set(
        edgeX - c.sx * (cornerArmLen * 0.5 - 0.01),
        edgeY - c.sy * (cornerArmW * 0.5 - 0.01),
        frontZ
      );
      this.boardGroup.add(hArm);

      const vArm = new THREE.Mesh(armVGeo, this.brassMat);
      vArm.position.set(
        edgeX - c.sx * (cornerArmW * 0.5 - 0.01),
        edgeY - c.sy * (cornerArmLen * 0.5 - 0.01),
        frontZ
      );
      this.boardGroup.add(vArm);

      const rivetOffsets: Array<[number, number]> = [
        [edgeX - c.sx * 0.11, edgeY - c.sy * 0.11],
        [edgeX - c.sx * 0.56, edgeY - c.sy * 0.11],
        [edgeX - c.sx * 0.11, edgeY - c.sy * 0.56],
      ];
      for (const [rx, ry] of rivetOffsets) {
        const rivet = new THREE.Mesh(rivetGeo, this.brassMat);
        rivet.position.set(rx, ry, frontZ + cornerDepth * 0.45);
        this.boardGroup.add(rivet);
      }
    }

    // Rods, ferrules, marker dots, and biconical beads
    const rodHeight = innerH + 0.06;
    const rodGeo = new THREE.CylinderGeometry(0.062, 0.062, rodHeight, 14);
    const ferruleGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.055, 16);
    const dotRingGeo = new THREE.CylinderGeometry(0.095, 0.095, 0.03, 18);
    const dotCenterGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.04, 18);
    const beadGeo = createBiconicalBeadGeometry(this.beadRadius, this.beadHeight);
    const hitGeo = new THREE.CylinderGeometry(
      this.beadRadius * 1.06,
      this.beadRadius * 1.06,
      this.beadHeight * 1.12,
      12
    );
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    this.disposables.push(
      rodGeo,
      ferruleGeo,
      dotRingGeo,
      dotCenterGeo,
      beadGeo,
      hitGeo,
      hitMat
    );

    const markerSet = this.getMarkerRodSet();
    const startX = -((this.totalRods - 1) * this.rodSpacing) * 0.5;
    const rodCenterY = (innerTop + innerBottom) * 0.5;

    for (let r = 0; r < this.totalRods; r++) {
      const rodX = startX + r * this.rodSpacing;
      const isMarker = markerSet.has(r);

      const rodMesh = new THREE.Mesh(rodGeo, this.rodMat);
      rodMesh.position.set(rodX, rodCenterY, 0);
      this.boardGroup.add(rodMesh);

      // 4 brass ferrules on rod junctions
      const ferruleYs = [
        innerTop - 0.02,
        this.beamHalfH + 0.02,
        -this.beamHalfH - 0.02,
        innerBottom + 0.02,
      ];
      for (const fy of ferruleYs) {
        const ferrule = new THREE.Mesh(ferruleGeo, this.brassMat);
        ferrule.position.set(rodX, fy, 0);
        this.boardGroup.add(ferrule);
      }

      // Marker dot on divider bar
      if (isMarker) {
        const ring = new THREE.Mesh(dotRingGeo, this.brassMat);
        ring.rotation.x = Math.PI * 0.5;
        ring.position.set(rodX, 0, beamDepth * 0.5 + 0.06);
        this.boardGroup.add(ring);

        const centerDot = new THREE.Mesh(dotCenterGeo, accentWhiteMat);
        centerDot.rotation.x = Math.PI * 0.5;
        centerDot.position.set(rodX, 0, beamDepth * 0.5 + 0.064);
        this.boardGroup.add(centerDot);
      }

      // 1 Upper (heaven) bead
      const upperMesh = new THREE.Mesh(beadGeo, this.beadWhiteMat);
      const upperHit = new THREE.Mesh(hitGeo, hitMat);
      const upperY = this.getUpperY(false);
      upperMesh.position.set(rodX, upperY, 0);
      upperHit.position.set(rodX, upperY, 0);
      upperMesh.castShadow = !this.isSoftwareGl;
      upperMesh.receiveShadow = true;
      this.boardGroup.add(upperMesh);
      this.boardGroup.add(upperHit);

      const upperEntity: BeadEntity = {
        rodIndex: r,
        beadType: 'upper',
        beadIndex: 0,
        mesh: upperMesh,
        hitMesh: upperHit,
        currentY: upperY,
        targetY: upperY,
        isMarker: false,
      };
      upperHit.userData.bead = upperEntity;
      this.beads.push(upperEntity);
      this.hitMeshes.push(upperHit);

      // 4 Lower (earth) beads; top earth bead (index 0) on marker rods is coral-pink
      for (let b = 0; b < 4; b++) {
        const useMarker = isMarker && b === 0;
        const beadMesh = new THREE.Mesh(
          beadGeo,
          useMarker ? this.beadMarkerMat : this.beadWhiteMat
        );
        const beadHit = new THREE.Mesh(hitGeo, hitMat);
        const lowerY = this.getLowerY(b, 0);
        beadMesh.position.set(rodX, lowerY, 0);
        beadHit.position.set(rodX, lowerY, 0);
        beadMesh.castShadow = !this.isSoftwareGl;
        beadMesh.receiveShadow = true;
        this.boardGroup.add(beadMesh);
        this.boardGroup.add(beadHit);

        const lowerEntity: BeadEntity = {
          rodIndex: r,
          beadType: 'lower',
          beadIndex: b,
          mesh: beadMesh,
          hitMesh: beadHit,
          currentY: lowerY,
          targetY: lowerY,
          isMarker: useMarker,
        };
        beadHit.userData.bead = lowerEntity;
        this.beads.push(lowerEntity);
        this.hitMeshes.push(beadHit);
      }
    }
  }

  public applyOptions(next: SorobanSceneOptions, snapImmediate = false) {
    const themeChanged =
      next.theme.id !== this.options.theme.id ||
      next.colorMode !== this.options.colorMode;
    this.options = next;

    if (themeChanged) {
      this.updateBackdropColor();
      this.beadWhiteMat?.color.set(next.theme.beadColor);
      this.beadMarkerMat?.color.set(next.theme.markerBeadColor);
      this.beamMat?.color.set(next.theme.beamColor);
      this.rodMat?.color.set(next.theme.rodColor);
      this.brassMat?.color.set(next.theme.brassColor);
    }

    for (const bead of this.beads) {
      const rod = next.rods[bead.rodIndex] ?? { upperActive: false, lowerCount: 0 };
      const target =
        bead.beadType === 'upper'
          ? this.getUpperY(rod.upperActive)
          : this.getLowerY(bead.beadIndex, rod.lowerCount);
      bead.targetY = target;
      if (snapImmediate) {
        bead.currentY = target;
        bead.mesh.position.y = target;
        bead.hitMesh.position.y = target;
      }
    }

    this.requestRender();
  }

  private measureAndFit(snap = false) {
    if (!this.renderer || !this.camera) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.containerW = w;
    this.containerH = h;
    const aspect = w / h;

    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);

    const halfFovRad = THREE.MathUtils.degToRad(this.camera.fov * 0.5);
    const tanHalf = Math.tan(halfFovRad);
    const fitHeightZ = (this.outerH * 0.56) / tanHalf;
    const fitWidthZ = (this.outerW * 0.53) / (tanHalf * Math.max(0.35, aspect));
    this.baseFitZ = Math.max(fitHeightZ, fitWidthZ);

    if (snap) {
      this.zoomScale = 1.0;
      this.targetZoomScale = 1.0;
      this.panX = 0;
      this.panY = 0;
      this.targetPanX = 0;
      this.targetPanY = 0;
    } else {
      this.clampPanTargets();
    }

    this.requestRender();
  }

  private clampPanTargets() {
    const maxPanX =
      this.targetZoomScale <= 1.02
        ? 0.8
        : this.outerW * 0.5 * (1 - 1 / this.targetZoomScale) + 1.4;
    const maxPanY =
      this.targetZoomScale <= 1.02
        ? 0.55
        : this.outerH * 0.5 * (1 - 1 / this.targetZoomScale) + 0.9;
    this.targetPanX = THREE.MathUtils.clamp(this.targetPanX, -maxPanX, maxPanX);
    this.targetPanY = THREE.MathUtils.clamp(this.targetPanY, -maxPanY, maxPanY);
  }

  public panBy(deltaX: number) {
    this.targetPanX += deltaX;
    this.clampPanTargets();
    this.requestRender();
  }

  public panToRod(rodIndex: number) {
    const startX = -((this.totalRods - 1) * this.rodSpacing) * 0.5;
    this.targetPanX = startX + rodIndex * this.rodSpacing;
    this.clampPanTargets();
    this.requestRender();
  }

  public zoomBy(factor: number) {
    this.targetZoomScale = THREE.MathUtils.clamp(
      this.targetZoomScale * factor,
      0.84,
      2.8
    );
    this.clampPanTargets();
    this.requestRender();
  }

  public resetView() {
    this.targetZoomScale = 1.0;
    this.targetPanX = 0;
    this.targetPanY = 0;
    this.requestRender();
  }

  private clientToLocal(clientX: number, clientY: number): { lx: number; ly: number } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (this.options.isCssRotated90) {
      return {
        lx: clientY - rect.top,
        ly: rect.right - clientX,
      };
    }
    return {
      lx: clientX - rect.left,
      ly: clientY - rect.top,
    };
  }

  private pickBeadAt(lx: number, ly: number): BeadEntity | null {
    _vec2.set(
      (lx / this.containerW) * 2 - 1,
      -(ly / this.containerH) * 2 + 1
    );
    _raycaster.setFromCamera(_vec2, this.camera);
    const hits = _raycaster.intersectObjects(this.hitMeshes, false);
    if (hits.length === 0) return null;
    return (hits[0].object.userData.bead as BeadEntity) ?? null;
  }

  private triggerBeadToggle(bead: BeadEntity) {
    this.callbacks.onBeadSound?.();
    if (bead.beadType === 'upper') {
      this.callbacks.onToggleUpper(bead.rodIndex);
      return;
    }
    const rod = this.options.rods[bead.rodIndex] ?? {
      upperActive: false,
      lowerCount: 0,
    };
    const clickedOrder = bead.beadIndex + 1;
    const nextCount =
      rod.lowerCount >= clickedOrder ? bead.beadIndex : clickedOrder;
    this.callbacks.onSetLowerCount(bead.rodIndex, nextCount);
  }

  private applyBeadDirectionalMove(bead: BeadEntity, towardBeam: boolean) {
    const rod = this.options.rods[bead.rodIndex] ?? {
      upperActive: false,
      lowerCount: 0,
    };
    if (bead.beadType === 'upper') {
      if (towardBeam && !rod.upperActive) {
        this.callbacks.onBeadSound?.();
        this.callbacks.onToggleUpper(bead.rodIndex);
      } else if (!towardBeam && rod.upperActive) {
        this.callbacks.onBeadSound?.();
        this.callbacks.onToggleUpper(bead.rodIndex);
      }
      return;
    }

    const targetActiveCount = bead.beadIndex + 1;
    if (towardBeam && rod.lowerCount < targetActiveCount) {
      this.callbacks.onBeadSound?.();
      this.callbacks.onSetLowerCount(bead.rodIndex, targetActiveCount);
    } else if (!towardBeam && rod.lowerCount >= targetActiveCount) {
      this.callbacks.onBeadSound?.();
      this.callbacks.onSetLowerCount(bead.rodIndex, bead.beadIndex);
    }
  }

  private bindEvents() {
    const dom = this.renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (this.disposed) return;
      dom.setPointerCapture?.(e.pointerId);
      const { lx, ly } = this.clientToLocal(e.clientX, e.clientY);
      this.pointers.set(e.pointerId, {
        id: e.pointerId,
        lx,
        ly,
        startLx: lx,
        startLy: ly,
        type: e.pointerType,
      });

      if (this.pointers.size >= 2) {
        this.activeBeadDrag = null;
        this.activeBgPanPointerId = null;
        const pts = Array.from(this.pointers.values());
        this.pinchStartDist = Math.max(
          1,
          Math.hypot(pts[1].lx - pts[0].lx, pts[1].ly - pts[0].ly)
        );
        this.pinchStartZoom = this.targetZoomScale;
        this.lastMidLx = (pts[0].lx + pts[1].lx) * 0.5;
        this.lastMidLy = (pts[0].ly + pts[1].ly) * 0.5;
        return;
      }

      const hitBead = this.pickBeadAt(lx, ly);
      if (hitBead) {
        this.activeBeadDrag = {
          pointerId: e.pointerId,
          bead: hitBead,
          startLy: ly,
          moved: false,
          appliedOnDrag: false,
        };
        this.activeBgPanPointerId = null;
      } else {
        this.activeBeadDrag = null;
        this.activeBgPanPointerId = e.pointerId;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (this.disposed) return;
      const existing = this.pointers.get(e.pointerId);
      if (!existing) return;

      const { lx, ly } = this.clientToLocal(e.clientX, e.clientY);
      const dx = lx - existing.lx;
      const dy = ly - existing.ly;
      existing.lx = lx;
      existing.ly = ly;

      // Two-finger pinch-to-zoom & pan
      if (this.pointers.size >= 2) {
        const pts = Array.from(this.pointers.values());
        const dist = Math.max(
          1,
          Math.hypot(pts[1].lx - pts[0].lx, pts[1].ly - pts[0].ly)
        );
        const midLx = (pts[0].lx + pts[1].lx) * 0.5;
        const midLy = (pts[0].ly + pts[1].ly) * 0.5;

        const ratio = dist / this.pinchStartDist;
        this.targetZoomScale = THREE.MathUtils.clamp(
          this.pinchStartZoom * ratio,
          0.84,
          2.8
        );

        const worldUnitsPerPx =
          (2 * (this.baseFitZ / this.zoomScale) * Math.tan(THREE.MathUtils.degToRad(17))) /
          Math.max(1, this.containerH);
        this.targetPanX -= (midLx - this.lastMidLx) * worldUnitsPerPx;
        this.targetPanY += (midLy - this.lastMidLy) * worldUnitsPerPx;
        this.lastMidLx = midLx;
        this.lastMidLy = midLy;

        this.clampPanTargets();
        this.requestRender();
        return;
      }

      // Single-finger bead slide
      if (this.activeBeadDrag && this.activeBeadDrag.pointerId === e.pointerId) {
        const totalDy = ly - this.activeBeadDrag.startLy;
        if (Math.abs(totalDy) > 10) {
          this.activeBeadDrag.moved = true;
          if (!this.activeBeadDrag.appliedOnDrag) {
            const dragDown = totalDy > 0;
            const towardBeam =
              this.activeBeadDrag.bead.beadType === 'upper'
                ? dragDown
                : !dragDown;
            this.applyBeadDirectionalMove(this.activeBeadDrag.bead, towardBeam);
            this.activeBeadDrag.appliedOnDrag = true;
          }
        }
        return;
      }

      // Single-finger pan when dragging frame or studio space
      if (this.activeBgPanPointerId === e.pointerId) {
        const worldUnitsPerPx =
          (2 * (this.baseFitZ / this.zoomScale) * Math.tan(THREE.MathUtils.degToRad(17))) /
          Math.max(1, this.containerH);
        this.targetPanX -= dx * worldUnitsPerPx;
        this.targetPanY += dy * worldUnitsPerPx;
        this.clampPanTargets();
        this.requestRender();
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const tracked = this.pointers.get(e.pointerId);
      const { lx, ly } = this.clientToLocal(e.clientX, e.clientY);

      if (
        this.activeBeadDrag &&
        this.activeBeadDrag.pointerId === e.pointerId
      ) {
        if (!this.activeBeadDrag.moved && !this.activeBeadDrag.appliedOnDrag) {
          this.triggerBeadToggle(this.activeBeadDrag.bead);
        }
        this.activeBeadDrag = null;
      } else if (
        this.activeBgPanPointerId === e.pointerId &&
        tracked &&
        Math.hypot(lx - tracked.startLx, ly - tracked.startLy) < 10
      ) {
        const now = performance.now();
        if (now - this.lastBgTapMs < 320) {
          this.resetView();
          this.lastBgTapMs = 0;
        } else {
          this.lastBgTapMs = now;
        }
      }

      if (this.activeBgPanPointerId === e.pointerId) {
        this.activeBgPanPointerId = null;
      }
      this.pointers.delete(e.pointerId);
      dom.releasePointerCapture?.(e.pointerId);

      if (this.pointers.size === 1) {
        const remaining = Array.from(this.pointers.values())[0];
        this.activeBgPanPointerId = remaining.id;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.91;
      this.zoomBy(factor);
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.disposed) {
        this.measureAndFit(false);
      }
    });
    this.resizeObserver.observe(this.container);

    this.disposables.push({
      dispose: () => {
        dom.removeEventListener('pointerdown', onPointerDown);
        dom.removeEventListener('pointermove', onPointerMove);
        dom.removeEventListener('pointerup', onPointerUp);
        dom.removeEventListener('pointercancel', onPointerUp);
        dom.removeEventListener('wheel', onWheel);
      },
    });
  }

  public requestRender() {
    if (this.disposed || !this.renderer || this.rafId !== 0) return;
    this.rafId = window.requestAnimationFrame(this.tick);
  }

  private tick = (nowMs: number) => {
    this.rafId = 0;
    if (this.disposed) return;

    if (this.isSoftwareGl && nowMs - this.lastRenderEndMs < 140) {
      this.rafId = window.requestAnimationFrame(this.tick);
      return;
    }

    const dt =
      this.lastFrameMs > 0
        ? Math.min(0.05, Math.max(0.004, (nowMs - this.lastFrameMs) * 0.001))
        : 0.016;
    this.lastFrameMs = nowMs;

    let moving = false;

    for (const bead of this.beads) {
      const diff = bead.targetY - bead.currentY;
      if (Math.abs(diff) > 0.0015) {
        bead.currentY = THREE.MathUtils.damp(bead.currentY, bead.targetY, 18, dt);
        moving = true;
      } else if (bead.currentY !== bead.targetY) {
        bead.currentY = bead.targetY;
      }
      bead.mesh.position.y = bead.currentY;
      bead.hitMesh.position.y = bead.currentY;
    }

    if (Math.abs(this.targetZoomScale - this.zoomScale) > 0.001) {
      this.zoomScale = THREE.MathUtils.damp(
        this.zoomScale,
        this.targetZoomScale,
        14,
        dt
      );
      moving = true;
    } else {
      this.zoomScale = this.targetZoomScale;
    }

    if (Math.abs(this.targetPanX - this.panX) > 0.001) {
      this.panX = THREE.MathUtils.damp(this.panX, this.targetPanX, 14, dt);
      moving = true;
    } else {
      this.panX = this.targetPanX;
    }

    if (Math.abs(this.targetPanY - this.panY) > 0.001) {
      this.panY = THREE.MathUtils.damp(this.panY, this.targetPanY, 14, dt);
      moving = true;
    } else {
      this.panY = this.targetPanY;
    }

    const camZ = this.baseFitZ / Math.max(0.5, this.zoomScale);
    const tiltFactor = this.options.cameraPreset === 'angled' ? 0.14 : 0.04;
    this.camera.position.set(this.panX, this.panY + camZ * tiltFactor, camZ);
    this.camera.lookAt(this.panX, this.panY, 0);

    this.renderer.render(this.scene, this.camera);
    this.lastRenderEndMs = performance.now();

    if (moving) {
      this.rafId = window.requestAnimationFrame(this.tick);
    }
  };

  public dispose() {
    this.disposed = true;
    if (this.rafId !== 0) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
    this.envTarget?.dispose();
    this.envTarget = null;
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
  }
}
