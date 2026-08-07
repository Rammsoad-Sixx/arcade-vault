import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Permite probar el dev server desde el celular por IP local (LAN) sin que
  // Next.js bloquee las peticiones a assets/RSC por venir de un origen != localhost.
  // Solo afecta a `next dev`; no tiene efecto en build/producción.
  allowedDevOrigins: ["192.168.1.70"],
};

export default nextConfig;
