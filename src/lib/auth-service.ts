import prisma from '@/lib/prisma';
import { AdminRole } from '@prisma/client';

/**
 * Genera un hash criptográfico SHA-256 con salt usando Web Crypto API
 * (Compatible nativamente con Node.js y Edge Runtime sin requerir módulos nativos C++)
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ':mindson_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Valida una contraseña contra el hash almacenado en base de datos.
 * Solo verifica contra hashes SHA-256 (con y sin salt).
 * NO permite fallback de texto plano por seguridad.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // 1. Verificación principal: Hash SHA-256 con salt
  const computed = await hashPassword(password);
  if (computed === storedHash) return true;

  // 2. Verificación secundaria: Hash SHA-256 plano (sin salt) — compatibilidad con registros legacy
  const encoder = new TextEncoder();
  const rawBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
  const rawHash = Array.from(new Uint8Array(rawBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  if (rawHash === storedHash) return true;

  return false;
}

/**
 * Auto-aprovisionamiento seguro del usuario administrador oficial MindsOn.
 * Verifica si existe el admin en prisma.adminUser; si no existe, lo crea automáticamente.
 */
export async function ensureAdminUserExists(): Promise<void> {
  if (process.env.ADMIN_AUTO_PROVISION === 'false') return;

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  try {
    const existing = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!existing) {
      const passwordHash = await hashPassword(password);
      await prisma.adminUser.create({
        data: {
          name: process.env.ADMIN_NAME || 'Administrador MindsOn',
          email,
          passwordHash,
          role: AdminRole.ADMIN,
        },
      });
      console.log('[AUTH] Usuario administrador maestro creado exitosamente.');
    }
  } catch (error) {
    console.error('[AUTH] Error en auto-aprovisionamiento del usuario administrador:', error);
  }
}
