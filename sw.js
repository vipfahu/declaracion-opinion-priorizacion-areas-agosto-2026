// Descifra en el navegador los archivos del sitio. No contiene secretos:
// la clave vive solo en memoria y la entrega la página tras ingresar la contraseña.
const CH = 1024 * 1024;
const OV = 28; // 12 bytes de IV + 16 de etiqueta GCM por bloque
const SCOPE = new URL(self.registration.scope);

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('message', (e) => {
  const m = e.data || {};
  if (m.type === 'claim') e.waitUntil(self.clients.claim());
  if (e.ports && e.ports[0]) e.ports[0].postMessage('ok');
});

function pedir(cliente) {
  return new Promise((res) => {
    const ch = new MessageChannel();
    const t = setTimeout(() => res(null), 1500);
    ch.port1.onmessage = (e) => { clearTimeout(t); res(e.data); };
    cliente.postMessage({ type: 'need-key' }, [ch.port2]);
  });
}

// La clave no se guarda aquí: se pide en cada solicitud a una pestaña desbloqueada.
// Al cerrar todas las pestañas, el contenido deja de estar disponible.
async function obtenerEstado() {
  for (const c of await self.clients.matchAll({ type: 'window' })) {
    const s = await pedir(c);
    if (s && s.key) return s;
  }
  return null;
}

self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== SCOPE.origin || !u.pathname.startsWith(SCOPE.pathname)) return;
  const rel = decodeURIComponent(u.pathname.slice(SCOPE.pathname.length));
  if (!rel || rel === 'index.html' || rel === 'sw.js' || rel.startsWith('d/')) return;
  e.respondWith(servir(rel, e.request));
});

const aad = (id, i) => new TextEncoder().encode(id + ':' + i);

async function servir(rel, req) {
  const s = await obtenerEstado();
  const m = s && s.manifest[rel];
  if (!m) return new Response('No encontrado', { status: 404 });

  const size = m.size;
  const base = { 'Content-Type': m.type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
  if (size === 0) return new Response(new Uint8Array(0), { headers: base });

  let ini = 0, fin = size - 1, parcial = false;
  const r = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  if (r) {
    parcial = true;
    if (r[1] === '') ini = Math.max(0, size - Number(r[2]));
    else {
      ini = Number(r[1]);
      // Rango abierto: se entrega un tramo acotado para no descifrar el video entero.
      fin = r[2] !== '' ? Math.min(size - 1, Number(r[2])) : Math.min(size - 1, ini + 8 * CH - 1);
    }
    if (ini >= size) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  }

  const c0 = Math.floor(ini / CH), c1 = Math.floor(fin / CH);
  const total = size + Math.ceil(size / CH) * OV;
  const eIni = c0 * (CH + OV), eFin = Math.min(total, (c1 + 1) * (CH + OV)) - 1;
  const resp = await fetch(new URL('d/' + m.id, SCOPE), { headers: { Range: 'bytes=' + eIni + '-' + eFin } });
  let buf = new Uint8Array(await resp.arrayBuffer());
  if (resp.status === 200) buf = buf.subarray(eIni, eFin + 1); // el servidor ignoró el rango

  const claro = new Uint8Array((c1 - c0 + 1) * CH);
  let off = 0, pos = 0;
  for (let i = c0; i <= c1; i++) {
    const len = Math.min(CH, size - i * CH) + OV;
    const pt = new Uint8Array(await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: buf.subarray(off, off + 12), additionalData: aad(m.id, i) },
      s.key, buf.subarray(off + 12, off + len)));
    claro.set(pt, pos); pos += pt.length; off += len;
  }
  const cuerpo = claro.subarray(ini - c0 * CH, fin - c0 * CH + 1);
  const h = Object.assign({ 'Content-Length': String(cuerpo.length) }, base);
  if (!parcial) return new Response(cuerpo, { status: 200, headers: h });
  h['Content-Range'] = 'bytes ' + ini + '-' + fin + '/' + size;
  return new Response(cuerpo, { status: 206, headers: h });
}
