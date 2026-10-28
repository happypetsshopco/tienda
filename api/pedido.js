// Recibe el pedido del formulario y lo guarda en Supabase (tabla public.pedidos).
// Iria para Fernando, 2026-10-22.
//
// La conexión con Supabase (y sus variables de entorno) está en _supabase.js.
// El precio y el producto los pone el servidor: no se confía en lo que mande el navegador.

const CIUDADES = require("./_ciudades.json");
const { supabase } = require("./_supabase");

const PRODUCTO_ID = 2283465; // guante quitapelos (Dropi, Impowinner)
const PRECIO = 29900;        // por unidad, envío gratis

const texto = (v, max) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

function validar(b) {
  const p = {
    nombre: texto(b.nombre, 60),
    apellido: texto(b.apellido, 60),
    celular: texto(b.celular, 10),
    departamento: texto(b.departamento, 40),
    ciudad: texto(b.ciudad, 60),
    direccion: texto(b.direccion, 150),
    barrio: texto(b.barrio, 150) || null,
    cantidad: Number(b.cantidad),
    // Quién le mandó el enlace al cliente (?v=sebas). Si viene raro, se ignora: el pedido igual entra.
    vendedor: /^[a-z]{2,15}$/.test(b.vendedor) ? b.vendedor : null,
  };
  if (p.nombre.length < 2) return "nombre";
  if (p.apellido.length < 2) return "apellido";
  if (!/^3\d{9}$/.test(p.celular)) return "celular";
  if (!(CIUDADES[p.departamento] || []).includes(p.ciudad)) return "ciudad";
  if (p.direccion.length < 5) return "direccion";
  if (!Number.isInteger(p.cantidad) || p.cantidad < 1 || p.cantidad > 5) return "cantidad";
  if (b.autoriza !== true) return "autoriza";
  return p;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== "object") return res.status(400).json({ ok: false, campo: "datos" });

  // Trampa para robots: el campo "empresa" está escondido; una persona nunca lo llena
  if (b.empresa) return res.status(200).json({ ok: true });

  const p = validar(b);
  if (typeof p === "string") return res.status(400).json({ ok: false, campo: p });

  let r;
  try {
    r = await supabase("pedidos", {
      method: "POST",
      prefer: "return=minimal",
      body: {
        ...p,
        producto_id: PRODUCTO_ID,
        precio_total: PRECIO * p.cantidad,
        autoriza_datos: true,
      },
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ ok: false });
  }

  if (!r.ok) {
    console.error("Supabase respondió", r.status, await r.text());
    return res.status(502).json({ ok: false });
  }
  return res.status(200).json({ ok: true });
};
