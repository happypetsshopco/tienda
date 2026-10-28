// Botones del aviso de Telegram: ✅ Confirmó / ❌ Canceló.
// Iria para Fernando, 2026-10-28.
//
// El enlace trae el número del pedido (id), su clave (un código al azar que solo sale en el aviso) y el estado nuevo (e).
// Abrir el enlace (GET) solo MUESTRA el pedido y pregunta; el cambio se hace al tocar "Sí" (POST).
// Así, si algún programa abre el enlace solo (vista previa), no cambia nada.

const { supabase } = require("./_supabase");

// A qué estado se puede pasar y desde cuáles. Un pedido "subido" ya está en Dropi: aquí no se toca.
const CAMBIOS = {
  confirmado: { desde: ["nuevo", "cancelado"], boton: "Sí, confirmó ✅", color: "#1f8a4c" },
  cancelado: { desde: ["nuevo", "confirmado"], boton: "Sí, canceló ❌", color: "#c0392b" },
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

function pagina(res, status, titulo, cuerpo) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer"); // la clave va en el enlace: que no se filtre a otras páginas
  res.setHeader("X-Robots-Tag", "noindex");
  res.status(status).send(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<style>
  body { margin: 0; padding: 24px 16px; background: #fffdf8; color: #1f1f1f;
         font-family: system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, sans-serif; }
  main { max-width: 420px; margin: 0 auto; background: #fff; border: 1px solid #e6e1d6; border-radius: 14px; padding: 20px; }
  h1 { font-size: 1.3rem; margin: 0 0 12px; }
  p { color: #5c5c5c; line-height: 1.45; }
  button { width: 100%; padding: 14px; border: 0; border-radius: 14px; color: #fff; font-size: 1.05rem; font-weight: 700; }
</style></head>
<body><main><h1>${esc(titulo)}</h1>${cuerpo}</main></body></html>`);
}

module.exports = async (req, res) => {
  const { id, c, e } = req.query;
  const cambio = CAMBIOS[e];
  if (!/^\d{1,9}$/.test(id || "") || !UUID.test(c || "") || !cambio) {
    return pagina(res, 400, "Enlace dañado", "<p>Este enlace no está completo. Ábrelo otra vez desde el aviso de Telegram.</p>");
  }
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return pagina(res, 405, "No permitido", "");
  }

  const filtro = `id=eq.${id}&clave=eq.${c}`;
  try {
    if (req.method === "POST") {
      // Solo cambia si el pedido sigue en un estado permitido (si ya lo subieron a Dropi, no hace nada)
      const r = await supabase(`pedidos?${filtro}&estado=in.(${cambio.desde.join(",")})&select=id`, {
        method: "PATCH",
        prefer: "return=representation",
        body: { estado: e },
      });
      if (!r.ok) throw new Error(`Supabase respondió ${r.status}: ${await r.text()}`);
      const cambiados = await r.json();
      if (cambiados.length) return pagina(res, 200, `Pedido #${id}: ${e} ✔`, "<p>Listo. Ya puedes cerrar esta página.</p>");
      // No cambió: o ya estaba así, o ya está subido, o el enlace no es de ningún pedido. Se muestra qué pasó.
    }

    const r = await supabase(`pedidos?${filtro}&select=id,nombre,apellido,ciudad,estado`);
    if (!r.ok) throw new Error(`Supabase respondió ${r.status}: ${await r.text()}`);
    const [p] = await r.json();
    if (!p) return pagina(res, 404, "Pedido no encontrado", "<p>Este enlace no corresponde a ningún pedido.</p>");

    const quien = `<p><b>${esc(p.nombre)} ${esc(p.apellido)}</b> · ${esc(p.ciudad)}<br>Estado ahora: <b>${esc(p.estado)}</b></p>`;
    if (p.estado === e) return pagina(res, 200, `Pedido #${id}: ya estaba ${e}`, quien);
    if (!cambio.desde.includes(p.estado)) {
      return pagina(res, 409, `Pedido #${id}: no se puede cambiar`, quien +
        "<p>Ya está subido a Dropi. Si hay que cancelarlo, hazlo directamente en Dropi.</p>");
    }
    return pagina(res, 200, `Pedido #${id}`, quien +
      `<form method="post"><button style="background:${cambio.color}">${cambio.boton}</button></form>`);
  } catch (err) {
    console.error(err.message);
    return pagina(res, 500, "Algo falló", "<p>No se pudo cambiar el pedido. Intenta de nuevo en un rato o cámbialo en Supabase.</p>");
  }
};
