// Figura umana dell'area pazienti: superficie unica e continua, senza dettagli anatomici.
// La geometria è generata a partire da forme di base fuse tra loro; ogni vertice porta la sua zona.
import * as T from 'three';
import { OrbitControls } from './3d-OrbitControls.js';

// colori del sito: corpo azzurro chiaro, zona scelta verde accento, passaggio del mouse verde chiaro
const COL = { corpo: 0xcbdee8, sel: 0x1b8a6b, hov: 0x7fe0bf };

let dati = null;
function carica() {
  if (!dati) dati = Promise.all([
    import('./3d-umano-dati.js').then(m => m.default),
    fetch(new URL('./3d-corpo-umano.bin', import.meta.url)).then(r => {
      if (!r.ok) throw new Error('corpo_umano.bin ' + r.status); return r.arrayBuffer();
    })
  ]);
  return dati;
}

export async function monta(el, opt = {}) {
  const [J, B] = await carica();

  const pos = new Float32Array(J.v * 3);
  const q = new Uint16Array(B, 0, J.v * 3);
  for (let i = 0; i < pos.length; i++) { const k = i % 3; pos[i] = J.min[k] + q[i] / 65535 * J.ext[k]; }
  const zona = new Float32Array(B, J.oz, J.v);
  const idx = J.w === 2 ? new Uint16Array(B, J.oi, J.i) : new Uint32Array(B, J.oi, J.i);

  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  geo.setAttribute('aZona', new T.BufferAttribute(zona, 1));
  geo.setIndex(new T.BufferAttribute(idx, 1));
  geo.computeVertexNormals(); geo.computeBoundingBox();

  const U = { uSel: { value: 0 }, uHov: { value: 0 } };
  const mat = new T.MeshStandardMaterial({ color: COL.corpo, roughness: 0.68, metalness: 0 });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uSel = U.uSel; sh.uniforms.uHov = U.uHov;
    sh.uniforms.cSel = { value: new T.Color(COL.sel) };
    sh.uniforms.cHov = { value: new T.Color(COL.hov) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aZona;\nvarying float vZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZ = aZona;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vZ;\nuniform float uSel, uHov;\nuniform vec3 cSel, cHov;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float ds = abs(vZ - uSel), dh = abs(vZ - uHov);
        if (uSel > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, cSel, 1.0 - smoothstep(0.16, 0.42, ds));
        if (uHov > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, cHov, 1.0 - smoothstep(0.16, 0.42, dh));`);
  };

  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const W = () => el.clientWidth || 1, H = () => el.clientHeight || 1;
  renderer.setSize(W(), H()); el.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = 'pan-y';

  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(26, W() / H(), 0.05, 20);
  scene.add(new T.HemisphereLight(0xffffff, 0x9db6c4, 1.9));
  const dl = new T.DirectionalLight(0xffffff, 1.4); dl.position.set(0.5, 1.1, 2); cam.add(dl); scene.add(cam);
  const corpo = new T.Mesh(geo, mat); scene.add(corpo);

  const ctr = new OrbitControls(cam, renderer.domElement);
  ctr.enableDamping = true; ctr.dampingFactor = 0.12; ctr.enablePan = false;
  ctr.minDistance = 1.1; ctr.maxDistance = 6;
  ctr.minPolarAngle = 0.55; ctr.maxPolarAngle = 2.35;

  // riquadro di ogni zona, per inquadrarla
  const box = {};
  const vv = new T.Vector3();
  for (let i = 0; i < J.v; i++) {
    const z = zona[i]; if (!z) continue;
    (box[z] ||= new T.Box3()).expandByPoint(vv.fromArray(pos, i * 3));
  }
  const tuttoB = geo.boundingBox.clone();

  let rid = true, sel = 0, hov = 0;
  const DIR = { fronte: [0, 0.06, 1], dietro: [0, 0.06, -1], retro: [0, 0.06, -1], lato: [1, 0.06, 0.1] };
  let dir = DIR.fronte;
  function inquadra(b, d, margine) {
    const c = b.getCenter(new T.Vector3()), s = b.getSize(new T.Vector3());
    const r = Math.max(s.x, s.y, s.z) * 0.5 * margine;
    const dist = r / Math.tan(cam.fov * Math.PI / 360) + r;
    cam.position.copy(c).add(new T.Vector3(...d).normalize().multiplyScalar(dist));
    ctr.target.copy(c); ctr.update(); rid = true;
  }
  const tutto = d => { dir = d || dir; inquadra(tuttoB, dir, 1.14); };
  // inquadra una zona lasciando intorno abbastanza corpo da capire dove si è
  function conContesto(b) {
    const c = b.getCenter(new T.Vector3()), s = b.getSize(new T.Vector3());
    const e = new T.Vector3(Math.max(s.x, 0.80), Math.max(s.y, 0.80), Math.max(s.z, 0.40)).multiplyScalar(0.5);
    return new T.Box3(c.clone().sub(e), c.clone().add(e));
  }

  const ray = new T.Raycaster(), pt = new T.Vector2();
  function sotto(e) {
    const r = renderer.domElement.getBoundingClientRect();
    pt.x = (e.clientX - r.left) / r.width * 2 - 1;
    pt.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(pt, cam);
    const h = ray.intersectObject(corpo, false);
    if (!h.length) return 0;
    const a = h[0].face.a;
    return Math.round(zona[a]);
  }
  let giu = null;
  const dom = renderer.domElement;
  dom.addEventListener('pointerdown', e => { giu = { x: e.clientX, y: e.clientY }; });
  dom.addEventListener('pointerup', e => {
    if (!giu || Math.hypot(e.clientX - giu.x, e.clientY - giu.y) > 7) { giu = null; return; }
    giu = null; const z = sotto(e); if (z && opt.onSel) opt.onSel(z);
  });
  dom.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const z = sotto(e);
    if (z !== hov) { hov = z; U.uHov.value = z; dom.style.cursor = z ? 'pointer' : 'grab'; rid = true; }
  });
  dom.addEventListener('pointerleave', () => { hov = 0; U.uHov.value = 0; rid = true; });

  const ro = new ResizeObserver(() => {
    renderer.setSize(W(), H()); cam.aspect = W() / H(); cam.updateProjectionMatrix(); rid = true;
  });
  ro.observe(el);
  let vivo = true;
  (function ciclo() {
    if (!vivo) return; requestAnimationFrame(ciclo);
    if (ctr.update()) rid = true;
    if (rid) { renderer.render(scene, cam); rid = false; }
  })();

  tutto(DIR.fronte);
  return {
    seleziona(z, inq) {
      sel = z || 0; U.uSel.value = sel; rid = true;
      tutto();
    },
    vista(k) { dir = DIR[k] || DIR.fronte; tutto(dir); },
    tutto() { sel = 0; U.uSel.value = 0; tutto(DIR.fronte); },
    muscoli() {},
    distruggi() { vivo = false; ro.disconnect(); renderer.dispose(); el.innerHTML = ''; }
  };
}
