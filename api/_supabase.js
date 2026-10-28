// Habla con la tabla de Supabase usando la llave secreta del servidor.
// Las dos variables se ponen en Vercel → Settings → Environment Variables, NUNCA en este repo.
// (El "_" del nombre hace que Vercel no lo publique como página: solo lo usan las otras funciones.)

function supabase(ruta, { method = "GET", body, prefer } = {}) {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en las variables de entorno de Vercel");
  }
  // Las llaves nuevas (sb_secret_…) van solo en "apikey"; la service_role antigua (JWT) va en los dos
  const headers = { apikey: SUPABASE_SECRET_KEY, "Content-Type": "application/json" };
  if (!SUPABASE_SECRET_KEY.startsWith("sb_")) headers.Authorization = "Bearer " + SUPABASE_SECRET_KEY;
  if (prefer) headers.Prefer = prefer;

  return fetch(SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/" + ruta, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

module.exports = { supabase };
