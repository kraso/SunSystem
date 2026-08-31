import * as THREE from 'three';

/**
 * Detecta si WebGL corre en software (SwiftShader/llvmpipe), típico de VMs
 * o GPUs bloqueadas. Permite bajar la calidad para mantener el rendimiento.
 */
function detectSoftwareGL(): boolean {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  if (!context) return true; // Sin contexto: peor caso, tratar como software
  const info = context.getExtension('WEBGL_debug_renderer_info');
  if (!info) return false;
  const rendererName = String(context.getParameter(info.UNMASKED_RENDERER_WEBGL));
  return /swiftshader|llvmpipe|software/i.test(rendererName);
}

/**
 * Configura y devuelve el renderer WebGL.
 */
export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const software = detectSoftwareGL();

  const renderer = new THREE.WebGLRenderer({
    antialias: !software,
    alpha: false,
    powerPreference: 'high-performance',
  });

  // En modo software se reduce la resolución interna y se quitan las sombras
  // (muy caras en CPU): cambia patinar a una simulación fluida.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, software ? 0.75 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // LinearToneMapping con exposición alta — los colores son más vivos que ACES
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 3.0;

  renderer.shadowMap.enabled = !software;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  if (software) {
    console.info('SunSystem: render por software — calidad reducida para rendimiento');
  }

  return renderer;
}