import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let cachedSoftwareGl: boolean | null = null;

/**
 * Detects software WebGL renderers (SwiftShader, llvmpipe, WARP) from the GPU renderer string.
 * Used strictly for rendering cost tuning (pixel ratio, AA, shadows, frame pacing).
 */
export function detectSoftwareWebGL(): boolean {
  if (cachedSoftwareGl !== null) return cachedSoftwareGl;
  if (typeof document === 'undefined') {
    cachedSoftwareGl = false;
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      cachedSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    cachedSoftwareGl = true;
  }
  return cachedSoftwareGl;
}

/**
 * Creates a calibrated studio WebGLRenderer with accurate sRGB color fidelity.
 */
export function createStudioRenderer(alpha = true, exposure = 1.0): {
  renderer: THREE.WebGLRenderer;
  isSoftwareGl: boolean;
} {
  const isSoftwareGl = detectSoftwareWebGL();
  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    alpha,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return { renderer, isSoftwareGl };
}

/**
 * Attaches procedural RoomEnvironment reflections at a calibrated intensity
 * so colors stay rich and saturated instead of washing out.
 */
export function attachStudioEnvironment(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  intensity = 0.25
): THREE.Texture {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  if ('environmentIntensity' in scene) {
    (scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = intensity;
  }
  pmremGenerator.dispose();
  return envTex;
}

/**
 * Software-WebGL-safe frame pacing using WebGL2 fenceSync so CPU renderers never starve UI.
 */
export function scheduleNextFrame(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean,
  cb: () => void,
  setHandle: (id: number, isTimeout: boolean) => void
) {
  if (!isSoftwareGl) {
    const id = requestAnimationFrame(cb);
    setHandle(id, false);
    return;
  }

  const gl = renderer.getContext() as WebGL2RenderingContext;
  if (typeof gl.fenceSync === 'function') {
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        const id = window.setTimeout(poll, 5);
        setHandle(id, true);
      } else {
        if (sync) gl.deleteSync(sync);
        const id = window.setTimeout(cb, 45);
        setHandle(id, true);
      }
    };
    const id = window.setTimeout(poll, 5);
    setHandle(id, true);
  } else {
    const id = window.setTimeout(cb, 45);
    setHandle(id, true);
  }
}

/**
 * Creates a rounded-square extruded 3D tile geometry (pivot centered on XZ, bottom at Y=0).
 * Top surface sits cleanly at Y = thickness + bevelThickness * 2.
 */
export function createRoundedTileGeometry(
  width: number,
  depth: number,
  radius: number,
  thickness: number
): THREE.ExtrudeGeometry {
  const hw = width / 2;
  const hd = depth / 2;
  const r = Math.min(radius, hw * 0.42, hd * 0.42);
  const bevel = 0.02;

  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
  shape.lineTo(hw, hd - r);
  shape.quadraticCurveTo(hw, hd, hw - r, hd);
  shape.lineTo(-hw + r, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
  shape.lineTo(-hw, -hd + r);
  shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 6,
  });

  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bevel, 0);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates a crisp procedural contact shadow texture.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(18, 42, 28, 0.34)');
  grad.addColorStop(0.55, 'rgba(18, 42, 28, 0.14)');
  grad.addColorStop(1, 'rgba(18, 42, 28, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Creates a crisp high-contrast CanvasTexture for manual X or faint Auto-X on a 3D tile.
 */
export function createCrossTexture(kind: 'manual' | 'auto'): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  ctx.lineCap = 'round';
  if (kind === 'manual') {
    ctx.strokeStyle = '#18201C';
    ctx.lineWidth = 30;
    const m = 68;
    ctx.beginPath();
    ctx.moveTo(m, m);
    ctx.lineTo(size - m, size - m);
    ctx.moveTo(size - m, m);
    ctx.lineTo(m, size - m);
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(24, 32, 28, 0.32)';
    ctx.lineWidth = 18;
    const m = 94;
    ctx.beginPath();
    ctx.moveTo(m, m);
    ctx.lineTo(size - m, size - m);
    ctx.moveTo(size - m, m);
    ctx.lineTo(m, size - m);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates 8 unmistakably distinct, colorblind-friendly procedural tile patterns
 * so scattered Hard-Mode territories are immediately recognizable at a glance while
 * keeping dark X marks and 3D Mini Pandas super readable on top.
 */
export function createTilePatternTexture(patternIndex: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  // Softly clip inside rounded margins so patterns stay tidy inside the tile bevel
  ctx.save();
  const pad = 16;
  const r = 24;
  ctx.beginPath();
  ctx.moveTo(pad + r, pad);
  ctx.lineTo(size - pad - r, pad);
  ctx.quadraticCurveTo(size - pad, pad, size - pad, pad + r);
  ctx.lineTo(size - pad, size - pad - r);
  ctx.quadraticCurveTo(size - pad, size - pad, size - pad - r, size - pad);
  ctx.lineTo(pad + r, size - pad);
  ctx.quadraticCurveTo(pad, size - pad, pad, size - pad - r);
  ctx.lineTo(pad, pad + r);
  ctx.quadraticCurveTo(pad, pad, pad + r, pad);
  ctx.closePath();
  ctx.clip();

  const idx = ((patternIndex % 8) + 8) % 8;
  const inkStroke = 'rgba(20, 30, 24, 0.22)';
  const lightStroke = 'rgba(255, 255, 255, 0.42)';
  const inkFill = 'rgba(20, 30, 24, 0.20)';
  const lightFill = 'rgba(255, 255, 255, 0.40)';

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (idx === 0) {
    // 0: Emerald Bamboo — Crisp Diagonal Stripes (///)
    ctx.strokeStyle = lightStroke;
    ctx.lineWidth = 14;
    for (let x = -size; x < size * 2; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, size);
      ctx.lineTo(x + size, 0);
      ctx.stroke();
    }
  } else if (idx === 1) {
    // 1: Sky Azure — Clean Polka Dots
    ctx.fillStyle = lightFill;
    for (let y = 36; y < size - 20; y += 54) {
      for (let x = 36; x < size - 20; x += 54) {
        const shift = Math.floor(y / 54) % 2 === 0 ? 0 : 27;
        ctx.beginPath();
        ctx.arc(x + shift - 8, y, 11, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (idx === 2) {
    // 2: Golden Honey — Crisp Diamond Lattice (◇)
    ctx.strokeStyle = inkStroke;
    ctx.lineWidth = 8;
    const step = 64;
    for (let y = 0; y <= size; y += step) {
      for (let x = 0; x <= size; x += step) {
        ctx.beginPath();
        ctx.moveTo(x + step / 2, y + 6);
        ctx.lineTo(x + step - 6, y + step / 2);
        ctx.lineTo(x + step / 2, y + step - 6);
        ctx.lineTo(x + 6, y + step / 2);
        ctx.closePath();
        ctx.stroke();
      }
    }
  } else if (idx === 3) {
    // 3: Sakura Rose — Horizontal Waves (~~~)
    ctx.strokeStyle = lightStroke;
    ctx.lineWidth = 11;
    for (let y = 40; y < size - 16; y += 52) {
      ctx.beginPath();
      for (let x = 0; x <= size; x += 8) {
        const wy = y + Math.sin((x / size) * Math.PI * 4) * 11;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
  } else if (idx === 4) {
    // 4: Wisteria Violet — Bold Vertical Bars (|||)
    ctx.fillStyle = lightFill;
    for (let x = 28; x < size - 16; x += 48) {
      ctx.fillRect(x, 0, 16, size);
    }
  } else if (idx === 5) {
    // 5: Apricot Peach — Zigzag Chevrons (^^^)
    ctx.strokeStyle = inkStroke;
    ctx.lineWidth = 10;
    for (let y = 44; y < size - 10; y += 56) {
      ctx.beginPath();
      for (let x = 0; x <= size; x += 32) {
        const py = (x / 32) % 2 === 0 ? y + 12 : y - 12;
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();
    }
  } else if (idx === 6) {
    // 6: Lagoon Teal — Concentric Rings / Bubbles (◎)
    ctx.strokeStyle = lightStroke;
    ctx.lineWidth = 9;
    const centers = [
      [64, 64],
      [192, 64],
      [128, 128],
      [64, 192],
      [192, 192],
    ];
    for (const [cx, cy] of centers) {
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    // 7: Warm Sand — Mini Solid Squares Checkerboard (▪)
    ctx.fillStyle = inkFill;
    const step = 48;
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        if ((row + col) % 2 === 0) {
          ctx.fillRect(col * step + 10, row * step + 10, 22, 22);
        }
      }
    }
  }

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds a composite 3D sculpted Mini Panda Token (11 distinct parts) with a crisp dark
 * outline pedestal rim so it pops unmistakably on every colored territory from top-down!
 */
export function buildMiniPandaToken(
  sharedGeos: {
    rim: THREE.CylinderGeometry;
    head: THREE.SphereGeometry;
    ear: THREE.SphereGeometry;
    patch: THREE.SphereGeometry;
    eye: THREE.SphereGeometry;
    nose: THREE.SphereGeometry;
    cheek: THREE.SphereGeometry;
  },
  mats: {
    whiteFur: THREE.MeshStandardMaterial;
    darkFur: THREE.MeshStandardMaterial;
    glossEye: THREE.MeshBasicMaterial;
    blush: THREE.MeshStandardMaterial;
    conflictDark: THREE.MeshStandardMaterial;
  }
): THREE.Group {
  const group = new THREE.Group();

  // Base sumi-ink token rim so the white panda head has crisp contrast on bright tiles
  const rim = new THREE.Mesh(sharedGeos.rim, mats.darkFur);
  rim.position.set(0, 0.04, 0);
  rim.userData.role = 'fur-dark';
  group.add(rim);

  // Primary silhouette: round sculpted panda head
  const head = new THREE.Mesh(sharedGeos.head, mats.whiteFur);
  head.scale.set(1.06, 0.72, 0.96);
  head.position.set(0, 0.22, 0.02);
  head.castShadow = true;
  group.add(head);

  // Secondary: cute round ears
  const leftEar = new THREE.Mesh(sharedGeos.ear, mats.darkFur);
  leftEar.position.set(-0.27, 0.31, -0.22);
  leftEar.userData.role = 'fur-dark';
  group.add(leftEar);

  const rightEar = new THREE.Mesh(sharedGeos.ear, mats.darkFur);
  rightEar.position.set(0.27, 0.31, -0.22);
  rightEar.userData.role = 'fur-dark';
  group.add(rightEar);

  // Secondary: bold eye patches clearly facing the top-down board camera
  const leftPatch = new THREE.Mesh(sharedGeos.patch, mats.darkFur);
  leftPatch.scale.set(1.0, 0.45, 1.2);
  leftPatch.rotation.y = 0.22;
  leftPatch.position.set(-0.145, 0.39, 0.02);
  leftPatch.userData.role = 'fur-dark';
  group.add(leftPatch);

  const rightPatch = new THREE.Mesh(sharedGeos.patch, mats.darkFur);
  rightPatch.scale.set(1.0, 0.45, 1.2);
  rightPatch.rotation.y = -0.22;
  rightPatch.position.set(0.145, 0.39, 0.02);
  rightPatch.userData.role = 'fur-dark';
  group.add(rightPatch);

  // Accent: sparkling eyes
  const leftEye = new THREE.Mesh(sharedGeos.eye, mats.glossEye);
  leftEye.position.set(-0.135, 0.44, 0.01);
  group.add(leftEye);

  const rightEye = new THREE.Mesh(sharedGeos.eye, mats.glossEye);
  rightEye.position.set(0.135, 0.44, 0.01);
  group.add(rightEye);

  // Accent: button snout
  const nose = new THREE.Mesh(sharedGeos.nose, mats.darkFur);
  nose.scale.set(1.3, 0.6, 0.85);
  nose.position.set(0, 0.41, 0.145);
  nose.userData.role = 'fur-dark';
  group.add(nose);

  return group;
}
