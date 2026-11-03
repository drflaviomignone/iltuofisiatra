// Corpo 3D dell'area pazienti: muscoli e ossa da BodyParts3D 4.0 (CC BY 4.0), come nell'Atlante della spasticità.
// I distretti sono calcolati dalla posizione (stessa funzione in JS e nello shader): il clic su un punto restituisce il distretto.
import * as T from 'three';
import { OrbitControls } from './3d-OrbitControls.js';

export function segDi(x, y, z) {
  const ax = Math.abs(x); let s = 0;
  if (y < 0.12) s = 11; else if (y < 0.38) s = 10; else if (y < 0.55) s = 9; else if (y < 0.98) s = 7;
  if (y >= 0.95 && y < 1.13) s = z < -0.015 ? 6 : 0;
  if (y >= 0.86 && y < 0.98 && ax < 0.065 && z < -0.06) s = 6;
  if (y >= 0.94 && y < 0.98 && z > 0 && ax < 0.12) s = 0;
  if (y >= 1.13 && y < 1.43) s = 5;
  if (y >= 1.43 && y < 1.57) s = 1;
  if (y >= 1.5 && y < 1.57 && z > 0.025) s = 0;
  if (y >= 1.57) s = 0;
  if (y >= 1.22 && y < 1.47 && ax > (z > 0.02 ? 0.155 : 0.105)) s = 2;
  const w = y < 0.95 ? 0.185 : 0.168;
  if (ax > w && y < 1.22 && y > 0.6) s = y >= 1.17 ? 2 : y >= 0.95 ? 3 : 4;
  return s;
}
const GLSL_SEG = `
float segDi(vec3 p){
  float ax = abs(p.x), y = p.y, z = p.z, s = 0.0;
  if (y < 0.12) s = 11.0; else if (y < 0.38) s = 10.0; else if (y < 0.55) s = 9.0; else if (y < 0.98) s = 7.0;
  if (y >= 0.95 && y < 1.13) s = z < -0.015 ? 6.0 : 0.0;
  if (y >= 0.86 && y < 0.98 && ax < 0.065 && z < -0.06) s = 6.0;
  if (y >= 0.94 && y < 0.98 && z > 0.0 && ax < 0.12) s = 0.0;
  if (y >= 1.13 && y < 1.43) s = 5.0;
  if (y >= 1.43 && y < 1.57) s = 1.0;
  if (y >= 1.5 && y < 1.57 && z > 0.025) s = 0.0;
  if (y >= 1.57) s = 0.0;
  if (y >= 1.22 && y < 1.47 && ax > (z > 0.02 ? 0.155 : 0.105)) s = 2.0;
  float w = y < 0.95 ? 0.185 : 0.168;
  if (ax > w && y < 1.22 && y > 0.6) s = y >= 1.17 ? 2.0 : (y >= 0.95 ? 3.0 : 4.0);
  return s;
}`;

// Colori come nell'Atlante: muscolo rosso, osso avorio, selezione blu, passaggio del mouse arancio.
const COL = { muscolo: 0xb8534a, muscoloZona: 0xc06359, osso: 0xe4dccb, ossoZona: 0xdcd2bd, hov: 0xd8774f, sel: 0x2f8fd0, ossoSel: 0x8fc3ea };

let dati = null;
function carica() {
  if (!dati) dati = Promise.all([
    import('./3d-corpo_meta.js').then(m => m.default),
    fetch(new URL('./3d-corpo.bin', import.meta.url)).then(r => { if (!r.ok) throw new Error('corpo.bin ' + r.status); return r.arrayBuffer(); })
      // anteprima senza file binari: stessa geometria in base64
      .catch(() => import('./3d-corpo_geo.js').then(m => { const b = atob(m.default), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; }))
  ]);
  return dati;
}

export async function monta(el, op) {
  // op: { nome(n)->string, onSel(n) }
  const [J, B] = await carica();
  const W = () => el.clientWidth, H = () => el.clientHeight;
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(W(), H());
  el.appendChild(renderer.domElement);
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(28, W() / H(), 0.01, 20);
  scene.add(new T.HemisphereLight(0xffffff, 0x8a7f74, 1.6));
  const dl = new T.DirectionalLight(0xffffff, 1.6); dl.position.set(1, 2, 3); cam.add(dl); scene.add(cam);
  const ctr = new OrbitControls(cam, renderer.domElement);
  ctr.enableDamping = true; ctr.dampingFactor = 0.12; ctr.minDistance = 0.3; ctr.maxDistance = 5;
  ctr.zoomToCursor = true; ctr.screenSpacePanning = true;

  const U = { uSel: { value: 0 }, uHov: { value: 0 } };
  function materiale(base, zona, sel, rough) {
    const m = new T.MeshStandardMaterial({ color: 0xffffff, roughness: rough });
    m.onBeforeCompile = sh => {
      sh.uniforms.uSel = U.uSel; sh.uniforms.uHov = U.uHov;
      sh.uniforms.cBase = { value: new T.Color(base) }; sh.uniforms.cZona = { value: new T.Color(zona) };
      sh.uniforms.cHov = { value: new T.Color(COL.hov) }; sh.uniforms.cSel = { value: new T.Color(sel) };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPosC;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPosC = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vPosC;\nuniform float uSel, uHov;\nuniform vec3 cBase, cZona, cHov, cSel;' + GLSL_SEG)
        .replace('#include <color_fragment>', `#include <color_fragment>
          float sg = segDi(vPosC);
          vec3 cz = sg > 0.5 && mod(sg, 2.0) > 0.5 ? cZona : cBase;
          if (sg > 0.5 && abs(sg - uHov) < 0.1) cz = cHov;
          if (sg > 0.5 && abs(sg - uSel) < 0.1) cz = cSel;
          diffuseColor.rgb *= cz;`);
    };
    return m;
  }
  const matM = materiale(COL.muscolo, COL.muscoloZona, COL.sel, 0.6);
  const matO = materiale(COL.osso, COL.ossoZona, COL.ossoSel, 0.75);

  const mn = J.min, ex = J.ext, meshes = [];
  const box = {}, v = new T.Vector3();
  for (const p of J.parts) {
    const q = new Uint16Array(B, p.o, p.v * 3);
    const pos = new Float32Array(p.v * 3);
    for (let i = 0; i < pos.length; i++) { const k = i % 3; pos[i] = mn[k] + q[i] / 65535 * ex[k]; }
    // riquadro di ogni distretto (lato destro del corpo) per l'inquadratura
    for (let i = 0; i < p.v; i += 3) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      if (x > 0.005) continue;
      const s = segDi(x, y, z); if (!s) continue;
      (box[s] ||= new T.Box3()).expandByPoint(v.set(x, y, z));
    }
    const io = p.o + Math.ceil(p.v * 6 / 4) * 4;
    const idx = p.w === 2 ? new Uint16Array(B, io, p.i) : new Uint32Array(B, io, p.i);
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setIndex(new T.BufferAttribute(idx, 1));
    g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
    const m = new T.Mesh(g, p.t === 'o' ? matO : matM);
    m.userData.t = p.t; meshes.push(m); scene.add(m);
  }
  const tutti = new T.Box3(); meshes.forEach(m => tutti.union(m.geometry.boundingBox));

  const S = { sel: 0, hov: 0, muscoli: true };
  const aggiorna = () => { U.uSel.value = S.sel; U.uHov.value = S.hov; rid = true; };

  const DIR = { fronte: new T.Vector3(0, 0.04, 1), retro: new T.Vector3(0, 0.04, -1), lato: new T.Vector3(-1, 0.04, 0.12) };
  let anim = null;
  function vai(c, d, dir) {
    const t0 = ctr.target.clone(), p0 = cam.position.clone();
    const t1 = c.clone(), p1 = c.clone().addScaledVector(dir.clone().normalize(), d);
    const t = performance.now(); cancelAnimationFrame(anim);
    const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    (function passo() {
      const k = ridotto ? 1 : Math.min(1, (performance.now() - t) / 550), e = 1 - Math.pow(1 - k, 3);
      ctr.target.lerpVectors(t0, t1, e); cam.position.lerpVectors(p0, p1, e); rid = true;
      if (k < 1) anim = requestAnimationFrame(passo);
    })();
  }
  const distanza = r => r / Math.sin(T.MathUtils.degToRad(cam.fov / 2)) * (W() < H() ? Math.min(1.9, H() / W()) : 1) * 1.08;
  const dirAttuale = () => cam.position.clone().sub(ctr.target);
  function tutto(dir) { const c = tutti.getCenter(new T.Vector3()), s = tutti.getSize(new T.Vector3()); vai(c, distanza(s.y * 0.5), dir || DIR.fronte); }
  function inquadraSeg(s, dir) {
    const b = box[s]; if (!b) return tutto(dir);
    const c = b.getCenter(new T.Vector3()), z = b.getSize(new T.Vector3());
    vai(c, Math.max(1.7, distanza(Math.max(z.x, z.y, z.z) * 0.5 + 0.2)), dir || dirAttuale());
  }

  const ray = new T.Raycaster(), pt = new T.Vector2();
  function segSotto(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    pt.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(pt, cam);
    const h = ray.intersectObjects(meshes.filter(m => m.visible), false)[0];
    return h ? segDi(h.point.x, h.point.y, h.point.z) : 0;
  }
  const tip = document.createElement('div'); tip.className = 'v3d-tip'; tip.hidden = true; el.appendChild(tip);
  let giu = null;
  renderer.domElement.addEventListener('pointerdown', e => { giu = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!giu || Math.hypot(e.clientX - giu[0], e.clientY - giu[1]) > 6) return;
    const s = segSotto(e); if (s) { S.sel = s; aggiorna(); op.onSel(s); }
  });
  renderer.domElement.addEventListener('pointermove', e => {
    if (e.buttons || e.pointerType === 'touch') { tip.hidden = true; return; }
    const s = segSotto(e);
    if (s !== S.hov) { S.hov = s; aggiorna(); }
    if (s) {
      const r = el.getBoundingClientRect();
      tip.hidden = false; tip.textContent = op.nome(s);
      tip.style.left = (e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top + 10) + 'px';
      renderer.domElement.style.cursor = 'pointer';
    } else { tip.hidden = true; renderer.domElement.style.cursor = 'grab'; }
  });
  renderer.domElement.addEventListener('pointerleave', () => { tip.hidden = true; if (S.hov) { S.hov = 0; aggiorna(); } });

  let rid = true, vivo = true;
  ctr.addEventListener('change', () => {
    const d = cam.position.distanceTo(ctr.target), n = Math.max(0.002, d / 150);
    if (Math.abs(cam.near - n) > n * 0.2) { cam.near = n; cam.updateProjectionMatrix(); }
    rid = true;
  });
  const ro = new ResizeObserver(() => { renderer.setSize(W(), H()); cam.aspect = W() / H(); cam.updateProjectionMatrix(); rid = true; });
  ro.observe(el);
  (function ciclo() { if (!vivo) return; requestAnimationFrame(ciclo); ctr.update(); if (rid) { renderer.render(scene, cam); rid = false; } })();

  cam.position.set(0, 0.9, 4); ctr.target.set(0, 0.86, 0);
  tutto(DIR.fronte); aggiorna();
  return {
    seleziona(s, inq) { S.sel = s || 0; aggiorna(); if (inq && S.sel) inquadraSeg(S.sel); },
    vista(k) { S.sel ? inquadraSeg(S.sel, DIR[k]) : tutto(DIR[k]); },
    tutto() { tutto(DIR.fronte); },
    muscoli(vis) { S.muscoli = vis; meshes.forEach(m => { if (m.userData.t === 'm') m.visible = vis; }); rid = true; },
    distruggi() { vivo = false; ro.disconnect(); renderer.dispose(); el.innerHTML = ''; }
  };
}
