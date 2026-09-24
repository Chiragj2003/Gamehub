/**
 * The Pen Fight scene: a school desk under a warm lamp, rendered with
 * Three.js. The physics lives in ./physics; this file only turns bodies into
 * meshes, drives the camera, and draws the aim arrow and particle effects.
 *
 * Everything is procedural — the wood grain, the floor vignette, the pens —
 * so the game ships no image assets and the whole scene is a few kilobytes of
 * code on top of the renderer.
 */

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { TABLE_D, TABLE_W, type PenBody, type Side } from "./physics";
import type { PenType } from "./pens";

export const SIDE_COLORS: Record<Side, string> = { 0: "#22d3ee", 1: "#fb923c" };

const TABLE_THICKNESS = 3;
const FLOOR_Y = -72;
const CAMERA_ELEVATION = (38 * Math.PI) / 180;
const CAMERA_FOV = 40;
const MAX_PARTICLES = 240;

export interface AimGizmo {
  /** Where the arrow starts: the flick point on the pen. */
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
  /** 0..1 — arrow length and brightness. */
  power: number;
  side: Side;
}

export interface SceneFrame {
  bodies: PenBody[];
  /** Interpolation between the previous and current tick. */
  alpha: number;
  /** Seconds since the last frame, for animations. */
  dt: number;
  selectedId: number | null;
  aim: AimGizmo | null;
  /** Which side the camera sits behind. */
  cameraSide: Side;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
}

function makeWoodTexture(size: number): THREE.CanvasTexture {
  // Same 3:2 proportions as the desk, mapped once, so the grain is neither
  // stretched nor tiled (a tiled gradient shows its seam under the lamp).
  const w = Math.round(size * 1.5);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = size;
  const ctx = c.getContext("2d")!;

  const base = ctx.createLinearGradient(0, 0, w, size);
  base.addColorStop(0, "#b8783f");
  base.addColorStop(0.5, "#a86a33");
  base.addColorStop(1, "#8e5527");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, size);

  // Grain runs along X (the desk's long side). Each line wanders a little.
  const lines = Math.round(size / 6);
  for (let i = 0; i < lines; i++) {
    const y0 = (i / lines) * size + (Math.random() - 0.5) * 6;
    const amp = 2 + Math.random() * 6;
    const freq = 0.004 + Math.random() * 0.01;
    const phase = Math.random() * Math.PI * 2;
    const dark = Math.random() < 0.7;
    ctx.strokeStyle = dark
      ? `rgba(70, 36, 12, ${0.06 + Math.random() * 0.16})`
      : `rgba(255, 214, 160, ${0.04 + Math.random() * 0.08})`;
    ctx.lineWidth = 0.6 + Math.random() * 2.2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const y = y0 + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.7 + phase) * amp * 0.3;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Two knots, off-centre so they read as wood rather than a pattern.
  for (let k = 0; k < 2; k++) {
    const kx = w * (0.2 + Math.random() * 0.6);
    const ky = size * (0.15 + Math.random() * 0.7);
    const kr = size * (0.03 + Math.random() * 0.03);
    for (let ring = 6; ring >= 1; ring--) {
      ctx.strokeStyle = `rgba(60, 30, 10, ${0.05 + ring * 0.015})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(kx, ky, kr * ring * 0.55, kr * ring * 0.36, 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Fine speckle so the surface is not perfectly smooth under the light.
  const img = ctx.getImageData(0, 0, w, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 12;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * The play-area decal: a warm pool of lamp light in the middle, a soft glow
 * ramp toward the perimeter and a crisp line right on the edge.
 *
 * From the player's low angle the drop-off is the whole game and a bare wood
 * plane gives no cue where it is. Drawn at the desk's own 3:2 proportions so
 * the band is the same width in centimetres on every side.
 */
function makeEdgeDecalTexture(): THREE.CanvasTexture {
  const h = 256;
  const w = Math.round(h * (TABLE_W / TABLE_D));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const pxPerCm = h / TABLE_D;

  // Glow ramp: several inset rectangles of rising alpha, blurred together.
  const band = 9 * pxPerCm;
  ctx.filter = `blur(${Math.round(pxPerCm * 2)}px)`;
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const inset = band * t;
    ctx.strokeStyle = `rgba(255, 233, 196, ${0.006 + t * 0.022})`;
    ctx.lineWidth = band / 7;
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  }
  ctx.filter = "none";

  // The edge itself: a bright hairline, unmistakable at any camera angle.
  ctx.strokeStyle = "rgba(255, 244, 222, 0.42)";
  ctx.lineWidth = Math.max(1.5, pxPerCm * 0.5);
  ctx.strokeRect(1, 1, w - 2, h - 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Soft radial falloff, used for the selection pool under the active pen. */
function makeRadialGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.85)");
  g.addColorStop(0.55, "rgba(255,255,255,0.22)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeVignetteTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "#2a2433");
  g.addColorStop(0.45, "#17131e");
  g.addColorStop(1, "#0b0a10");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Orient a Y-axis geometry (cylinder, cone, capsule) along +X at offset x. */
function along(mesh: THREE.Mesh, x: number, flip = false) {
  mesh.rotation.z = flip ? Math.PI / 2 : -Math.PI / 2;
  mesh.position.x = x;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function std(color: string, metalness: number, roughness: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
}

/**
 * The barrel material. Resin and painted pens get a clearcoat: a second
 * specular layer that puts a tight lamp highlight along the length, which is
 * what makes a plastic pen look like plastic rather than tinted clay. Metal
 * barrels skip it — bare metal has no lacquer over it.
 */
function barrelMaterial(type: PenType) {
  const { body } = type.colors;
  const { metalness, roughness } = type.finish;
  if (metalness > 0.6) return new THREE.MeshStandardMaterial({ color: body, metalness, roughness });
  return new THREE.MeshPhysicalMaterial({
    color: body,
    metalness,
    roughness,
    clearcoat: roughness > 0.45 ? 0.35 : 0.85, // matte bodies keep a duller sheen
    clearcoatRoughness: 0.12,
  });
}

/**
 * Build one pen. Each shape is a handful of primitives along the X axis with
 * the tip at +X and the cap at −X, matching the physics body's `angle`.
 */
function buildPen(type: PenType, side: Side): THREE.Group {
  const g = new THREE.Group();
  const L = type.halfLen;
  const r = type.radius;
  const body = barrelMaterial(type);
  const accent = std(type.colors.accent, 0.15, 0.35);
  const tipMat = std(type.colors.tip, 0.85, 0.3);
  const chrome = std("#e5e7eb", 0.95, 0.25);
  const seg = 18;

  const capsule = (radius: number, length: number, mat: THREE.Material, x = 0) =>
    along(new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.1, length - radius * 2), 4, seg), mat), x);
  const cyl = (radius: number, length: number, mat: THREE.Material, x: number, r2 = radius) =>
    along(new THREE.Mesh(new THREE.CylinderGeometry(radius, r2, length, seg), mat), x);
  const cone = (radius: number, length: number, mat: THREE.Material, x: number, flip = false) =>
    along(new THREE.Mesh(new THREE.ConeGeometry(radius, length, seg), mat), x, flip);
  const clip = (x: number, len: number, mat: THREE.Material, y: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.16, 0.34), mat);
    m.position.set(x, y, 0);
    m.castShadow = true;
    return m;
  };

  switch (type.shape) {
    case "ballpoint": {
      g.add(capsule(r, L * 2 - 1.2, body, -0.6));
      g.add(cyl(r * 1.1, 3.4, accent, -L + 1.7));
      g.add(clip(-L + 2.6, 2.6, accent, r * 1.1 + 0.05));
      g.add(cone(r * 0.85, 1.6, tipMat, L - 0.8));
      break;
    }
    case "gel": {
      g.add(capsule(r, L * 2 - 1.4, body, -0.7));
      g.add(cyl(r * 1.15, 3.2, std(type.colors.accent, 0.0, 0.7), L - 3.6));
      g.add(cyl(r * 1.06, 3.6, std("#0f172a", 0.2, 0.3), -L + 1.8));
      g.add(clip(-L + 2.8, 2.8, chrome, r * 1.06 + 0.05));
      g.add(cone(r * 0.8, 1.5, tipMat, L - 0.75));
      break;
    }
    case "jotter": {
      g.add(capsule(r, L * 2 - 1.0, body, -0.4));
      g.add(cyl(r * 1.02, 2.8, std(type.colors.accent, 0.3, 0.4), L - 2.4));
      g.add(cyl(r * 0.55, 0.7, chrome, -L + 0.2));
      g.add(clip(-L + 2.4, 3.2, chrome, r + 0.06));
      g.add(cone(r * 0.9, 1.4, tipMat, L - 0.7));
      break;
    }
    case "fountain": {
      g.add(capsule(r, L * 2 - 1.6, body, -0.4));
      g.add(cyl(r * 1.04, 0.5, std(type.colors.accent, 0.9, 0.25), 0.4));
      g.add(cyl(r * 0.4, 0.8, std(type.colors.accent, 0.9, 0.25), -L + 0.3, r * 0.7));
      g.add(clip(-L + 2.6, 3.0, std(type.colors.accent, 0.9, 0.25), r + 0.05));
      const nib = cone(r * 0.8, 2.2, std(type.colors.tip, 0.95, 0.2), L - 0.6);
      nib.scale.z = 0.4;
      g.add(nib);
      break;
    }
    case "marker": {
      g.add(cyl(r, L * 2 - 1.4, body, 0.3));
      g.add(cyl(r * 1.06, 4.4, accent, -L + 2.2));
      g.add(cyl(r * 0.6, 1.2, std(type.colors.tip, 0, 0.9), L - 0.4, r * 0.75));
      break;
    }
    case "pencil": {
      // Hexagonal barrel: six radial segments instead of eighteen.
      g.add(along(new THREE.Mesh(new THREE.CylinderGeometry(r, r, L * 2 - 3.0, 6), body), -1.2));
      g.add(cone(r, 2.4, std(type.colors.tip, 0, 0.8), L - 1.8));
      g.add(cone(r * 0.28, 0.7, std("#2b2b2b", 0.3, 0.6), L - 0.35));
      g.add(cyl(r * 1.04, 1.3, chrome, -L + 1.2));
      g.add(cyl(r * 0.98, 1.1, std(type.colors.accent, 0, 0.9), -L + 0.2));
      break;
    }
    case "highlighter": {
      g.add(cyl(r, L * 2 - 1.6, body, 0.4));
      g.add(cyl(r * 1.08, 4.6, accent, -L + 2.3));
      g.add(cyl(r * 0.55, 1.0, std(type.colors.tip, 0, 0.9), L - 0.3, r * 0.8));
      break;
    }
  }

  // Team band near the cap: the one visual cue that says whose pen this is.
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 1.12, r * 1.12, 0.7, seg),
    new THREE.MeshStandardMaterial({
      color: SIDE_COLORS[side],
      emissive: SIDE_COLORS[side],
      emissiveIntensity: 0.55,
      roughness: 0.4,
    })
  );
  along(band, -L + 4.4);
  g.add(band);

  return g;
}

export class PenScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private pmrem: THREE.PMREMGenerator;
  private penMeshes = new Map<number, THREE.Group>();
  private penLayer = new THREE.Group();
  private ring: THREE.Mesh;
  private ringMat: THREE.MeshBasicMaterial;
  private selectionGlow: THREE.Mesh;
  private glowMat: THREE.MeshBasicMaterial;
  private arrow = new THREE.Group();
  private arrowShaft: THREE.Mesh;
  private arrowHead: THREE.Mesh;
  private arrowMat: THREE.MeshBasicMaterial;
  private particles: Particle[] = [];
  private points: THREE.Points;
  private pointPos: Float32Array;
  private pointCol: Float32Array;
  private camAngle = 0;
  private camDistance = 100;
  private shake = 0;
  private time = 0;
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private hit = new THREE.Vector3();
  private ndc = new THREE.Vector2();
  private disposables: { dispose: () => void }[] = [];

  constructor(private canvas: HTMLCanvasElement, private lowQuality: boolean) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowQuality ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene.background = new THREE.Color("#0b0a10");
    this.scene.fog = new THREE.Fog(0x0b0a10, 320, 720);

    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 1, 600);

    // Image-based lighting makes the steel and resin pens read as materials
    // rather than flat colour.
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = env;
    this.scene.environmentIntensity = 0.45;

    this.buildLights();
    this.buildDesk();

    this.scene.add(this.penLayer);

    this.ringMat = new THREE.MeshBasicMaterial({
      color: SIDE_COLORS[0],
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.18, 64), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.06;
    this.ring.visible = false;
    this.scene.add(this.ring);

    // A glow pool inside the ring: a radial fade, so the marker reads as light
    // spilling onto the desk rather than a flat decal stuck to it.
    const glowTex = makeRadialGlowTexture();
    this.disposables.push(glowTex);
    this.glowMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      color: SIDE_COLORS[0],
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.selectionGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.glowMat);
    this.selectionGlow.rotation.x = -Math.PI / 2;
    this.selectionGlow.position.y = 0.05;
    this.selectionGlow.visible = false;
    this.scene.add(this.selectionGlow);

    this.arrowMat = new THREE.MeshBasicMaterial({ color: SIDE_COLORS[0], transparent: true, opacity: 0.85, depthWrite: false });
    const shaftGeo = new THREE.PlaneGeometry(1, 1.1);
    shaftGeo.translate(0.5, 0, 0);
    this.arrowShaft = new THREE.Mesh(shaftGeo, this.arrowMat);
    this.arrowShaft.rotation.x = -Math.PI / 2;
    const headShape = new THREE.Shape();
    headShape.moveTo(0, -2.2);
    headShape.lineTo(3.4, 0);
    headShape.lineTo(0, 2.2);
    headShape.closePath();
    this.arrowHead = new THREE.Mesh(new THREE.ShapeGeometry(headShape), this.arrowMat);
    this.arrowHead.rotation.x = -Math.PI / 2;
    this.arrow.add(this.arrowShaft, this.arrowHead);
    this.arrow.position.y = 0.1;
    this.arrow.visible = false;
    this.scene.add(this.arrow);

    this.pointPos = new Float32Array(MAX_PARTICLES * 3);
    this.pointCol = new Float32Array(MAX_PARTICLES * 3);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(this.pointPos, 3));
    pg.setAttribute("color", new THREE.BufferAttribute(this.pointCol, 3));
    this.points = new THREE.Points(
      pg,
      new THREE.PointsMaterial({ size: 1.1, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, sizeAttenuation: true })
    );
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    for (let i = 0; i < MAX_PARTICLES; i++) this.pointPos[i * 3 + 1] = -999;
  }

  private buildLights() {
    const hemi = new THREE.HemisphereLight(0xfff4e0, 0x2a2030, 0.35);
    this.scene.add(hemi);

    // The desk lamp: warm, from over the player's shoulder, casting the shadows.
    const key = new THREE.DirectionalLight(0xffe6c4, 2.1);
    key.position.set(35, 90, 45);
    key.castShadow = true;
    const size = this.lowQuality ? 1024 : 2048;
    key.shadow.mapSize.set(size, size);
    key.shadow.camera.left = -62;
    key.shadow.camera.right = 62;
    key.shadow.camera.top = 52;
    key.shadow.camera.bottom = -52;
    key.shadow.camera.near = 20;
    key.shadow.camera.far = 220;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.03;
    key.shadow.radius = 3;
    this.scene.add(key);

    // Cool fill from the far side so the shadowed faces are not black.
    const fill = new THREE.DirectionalLight(0xbfd8ff, 0.5);
    fill.position.set(-40, 50, -60);
    this.scene.add(fill);

    // Rim: low and behind, so every pen carries a bright edge and separates
    // from the wood instead of sinking into it. The single biggest reason the
    // pens read as objects on a desk rather than decals painted on it.
    const rim = new THREE.DirectionalLight(0xfff0d8, 0.85);
    rim.position.set(-20, 14, -70);
    this.scene.add(rim);
  }

  private buildDesk() {
    const wood = makeWoodTexture(this.lowQuality ? 512 : 1024);
    this.disposables.push(wood);

    const topMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.52, metalness: 0.02 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W, TABLE_THICKNESS, TABLE_D), topMat);
    top.position.y = -TABLE_THICKNESS / 2;
    top.receiveShadow = true;
    top.castShadow = true;
    this.scene.add(top);

    // A thin bright bevel along the top edge catches the lamp and makes the
    // drop-off visible from the player's low angle.
    const bevel = new THREE.Mesh(
      new THREE.BoxGeometry(TABLE_W + 0.6, 0.35, TABLE_D + 0.6),
      new THREE.MeshStandardMaterial({ color: "#d39a5e", roughness: 0.4, metalness: 0.05 })
    );
    bevel.position.y = -0.2;
    bevel.receiveShadow = true;
    this.scene.add(bevel);

    const decal = makeEdgeDecalTexture();
    this.disposables.push(decal);
    const decalMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(TABLE_W, TABLE_D),
      new THREE.MeshBasicMaterial({ map: decal, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    decalMesh.rotation.x = -Math.PI / 2;
    decalMesh.position.y = 0.03;
    this.scene.add(decalMesh);

    const walnut = new THREE.MeshStandardMaterial({ color: "#3b2416", roughness: 0.7 });
    const apron = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W + 4, 2.6, TABLE_D + 4), walnut);
    apron.position.y = -TABLE_THICKNESS - 1.6;
    apron.castShadow = true;
    apron.receiveShadow = true;
    this.scene.add(apron);

    const legGeo = new THREE.CylinderGeometry(1.7, 1.4, -FLOOR_Y - TABLE_THICKNESS - 2, 12);
    const legMat = new THREE.MeshStandardMaterial({ color: "#4a3221", roughness: 0.65 });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(sx * (TABLE_W / 2 - 4), (FLOOR_Y - TABLE_THICKNESS - 2) / 2, sz * (TABLE_D / 2 - 4));
        leg.castShadow = true;
        this.scene.add(leg);
      }
    }

    const vignette = makeVignetteTexture();
    this.disposables.push(vignette);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(700, 700),
      new THREE.MeshStandardMaterial({ map: vignette, roughness: 0.95, metalness: 0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR_Y;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  /** Match the renderer to its container; recomputes how far back the camera sits. */
  resize(width: number, height: number) {
    if (width < 2 || height < 2) return;
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    // Far enough that the whole desk, plus a margin for pens on the edge, fits
    // both across and along the view — portrait phones need a lot more room.
    const t = Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));
    const byWidth = 53 / (t * aspect);
    const byDepth = 37 / t;
    this.camDistance = Math.max(96, byWidth, byDepth);
  }

  /** Rebuild the pen meshes for a new set of bodies. */
  setPens(bodies: PenBody[]) {
    for (const m of this.penMeshes.values()) this.penLayer.remove(m);
    this.penMeshes.clear();
    for (const b of bodies) {
      const mesh = buildPen(b.type, b.side);
      mesh.rotation.order = "YZX";
      this.penMeshes.set(b.id, mesh);
      this.penLayer.add(mesh);
    }
  }

  /** Project a pointer position onto the desk plane. */
  pointerToTable(clientX: number, clientY: number): { x: number; z: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    this.ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const p = this.raycaster.ray.intersectPlane(this.plane, this.hit);
    return p ? { x: p.x, z: p.z } : null;
  }

  spawnSparks(x: number, z: number, strength: number, hex: string) {
    const c = new THREE.Color(hex);
    const n = Math.min(24, 6 + Math.round(strength / 25));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 20 + Math.random() * (30 + strength * 0.2);
      this.pushParticle({
        x, y: 0.6, z,
        vx: Math.cos(a) * sp, vy: 25 + Math.random() * 45, vz: Math.sin(a) * sp,
        life: 0.35 + Math.random() * 0.3, maxLife: 0.6,
        r: c.r, g: c.g, b: c.b,
      });
    }
  }

  spawnDust(x: number, z: number) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 6 + Math.random() * 14;
      this.pushParticle({
        x, y: 0.4, z,
        vx: Math.cos(a) * sp, vy: 8 + Math.random() * 16, vz: Math.sin(a) * sp,
        life: 0.5 + Math.random() * 0.4, maxLife: 0.9,
        r: 0.85, g: 0.75, b: 0.6,
      });
    }
  }

  private pushParticle(p: Particle) {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    p.maxLife = p.life;
    this.particles.push(p);
  }

  addShake(amount: number) {
    this.shake = Math.min(1.6, this.shake + amount);
  }

  /** Move every mesh to its body, animate the effects, and draw the frame. */
  render(frame: SceneFrame) {
    const { bodies, alpha, dt } = frame;
    this.time += dt;

    for (const b of bodies) {
      const mesh = this.penMeshes.get(b.id);
      if (!mesh) continue;
      if (!b.alive) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      const x = b.px + (b.x - b.px) * alpha;
      const z = b.pz + (b.z - b.pz) * alpha;
      const angle = b.pangle + (b.angle - b.pangle) * alpha;
      mesh.position.set(x, b.type.radius + (b.falling ? b.fallY : 0), z);
      mesh.rotation.y = -angle;
      // End-over-end tumble once the pen has left the desk.
      mesh.rotation.z = b.falling ? b.tumble : 0;
      mesh.rotation.x = b.falling ? b.tumble * 0.35 : 0;
    }

    // Selection ring pulses under the chosen pen.
    const sel = frame.selectedId !== null ? bodies.find((b) => b.id === frame.selectedId) : undefined;
    if (sel && sel.alive && !sel.falling) {
      const pulse = Math.sin(this.time * 4);
      const radius = sel.type.halfLen + 1.6 + pulse * 0.3;
      this.ring.visible = true;
      this.ring.position.set(sel.x, 0.06, sel.z);
      this.ring.scale.set(radius, radius, 1);
      this.ringMat.color.set(SIDE_COLORS[sel.side]);
      this.ringMat.opacity = 0.5 + pulse * 0.16;

      this.selectionGlow.visible = true;
      this.selectionGlow.position.set(sel.x, 0.05, sel.z);
      const g = radius * 2.6;
      this.selectionGlow.scale.set(g, g, 1);
      this.glowMat.color.set(SIDE_COLORS[sel.side]);
      this.glowMat.opacity = 0.22 + pulse * 0.06;
    } else {
      this.ring.visible = false;
      this.selectionGlow.visible = false;
    }

    const aim = frame.aim;
    if (aim && aim.power > 0.02) {
      this.arrow.visible = true;
      this.arrow.position.x = aim.x;
      this.arrow.position.z = aim.z;
      this.arrow.rotation.y = -Math.atan2(aim.dirZ, aim.dirX);
      const len = 6 + aim.power * 30;
      this.arrowShaft.scale.x = len;
      this.arrowHead.position.x = len;
      this.arrowMat.color.set(SIDE_COLORS[aim.side]);
      this.arrowMat.opacity = 0.45 + aim.power * 0.5;
    } else {
      this.arrow.visible = false;
    }

    // Friction dust off the tip of anything travelling fast. Costs nothing —
    // the velocities are already on the bodies — and it sells the speed.
    if (dt > 0) {
      for (const b of bodies) {
        if (!b.alive || b.falling) continue;
        const speed = Math.hypot(b.vx, b.vz);
        if (speed < 90 || Math.random() > dt * 40) continue;
        this.pushParticle({
          x: b.x + (Math.random() - 0.5) * b.type.halfLen,
          y: 0.3,
          z: b.z + (Math.random() - 0.5) * b.type.halfLen,
          vx: -b.vx * 0.04, vy: 4 + Math.random() * 8, vz: -b.vz * 0.04,
          life: 0.22 + Math.random() * 0.18, maxLife: 0.4,
          r: 0.8, g: 0.68, b: 0.5,
        });
      }
    }

    this.updateParticles(dt);

    // Camera: swing to the current player's side, with the impact shake on top.
    let target = frame.cameraSide === 0 ? 0 : Math.PI;
    if (Math.abs(target - this.camAngle) > Math.PI) target += this.camAngle > target ? Math.PI * 2 : -Math.PI * 2;
    this.camAngle += (target - this.camAngle) * (1 - Math.exp(-4.5 * dt));
    const d = this.camDistance;
    const cx = Math.sin(this.camAngle) * d * Math.cos(CAMERA_ELEVATION);
    const cz = Math.cos(this.camAngle) * d * Math.cos(CAMERA_ELEVATION);
    const cy = d * Math.sin(CAMERA_ELEVATION);
    this.shake = Math.max(0, this.shake - dt * 4);
    const sh = this.shake * this.shake;
    this.camera.position.set(
      cx + (Math.random() - 0.5) * sh * 2,
      cy + (Math.random() - 0.5) * sh,
      cz + (Math.random() - 0.5) * sh * 2
    );
    this.camera.lookAt(-Math.sin(this.camAngle) * 4, -2, -Math.cos(this.camAngle) * 4);

    this.renderer.render(this.scene, this.camera);
  }

  private updateParticles(dt: number) {
    const pos = this.pointPos;
    const col = this.pointCol;
    let i = 0;
    for (let k = this.particles.length - 1; k >= 0; k--) {
      const p = this.particles[k];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(k, 1);
        continue;
      }
      p.vy -= 160 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < 0.2 && p.vy < 0) {
        p.y = 0.2;
        p.vy *= -0.3;
        p.vx *= 0.7;
        p.vz *= 0.7;
      }
      const fade = p.life / p.maxLife;
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
      col[i * 3] = p.r * fade;
      col[i * 3 + 1] = p.g * fade;
      col[i * 3 + 2] = p.b * fade;
      i++;
    }
    for (; i < MAX_PARTICLES; i++) pos[i * 3 + 1] = -999;
    const geo = this.points.geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  dispose() {
    for (const m of this.penMeshes.values()) this.penLayer.remove(m);
    this.penMeshes.clear();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    for (const d of this.disposables) d.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
  }
}
