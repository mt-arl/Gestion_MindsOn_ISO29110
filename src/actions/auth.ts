'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { AdminRole } from '@prisma/client';
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
  SessionPayload,
} from '@/lib/auth-token';

const MASTER_ADMIN = {
  email: 'mindsonec@gmail.com',
  password: 'mindson26',
  name: 'Administrador MindsOn',
  role: AdminRole.ADMIN,
};

/**
 * Genera un hash criptográfico SHA-256 con salt usando Web Crypto API
 * (Compatible nativamente con Node.js y Edge Runtime sin requerir módulos nativos C++)
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ':mindson_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Valida una contraseña contra el hash almacenado en base de datos
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // 1. Verificación principal: Hash SHA-256 con salt
  const computed = await hashPassword(password);
  if (computed === storedHash) return true;

  // 2. Verificación secundaria: Hash SHA-256 plano (sin salt)
  const encoder = new TextEncoder();
  const rawBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
  const rawHash = Array.from(new Uint8Array(rawBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  if (rawHash === storedHash) return true;

  // 3. Fallback de texto plano por compatibilidad
  if (password === storedHash) return true;

  return false;
}

/**
 * Auto-aprovisionamiento seguro del usuario administrador oficial MindsOn
 * Verifica si existe mindsonec@gmail.com en prisma.adminUser; si no existe, lo crea automáticamente.
 */
async function ensureAdminUserExists(): Promise<void> {
  try {
    const normalizedEmail = MASTER_ADMIN.email.toLowerCase().trim();
    const existing = await prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (!existing) {
      const passwordHash = await hashPassword(MASTER_ADMIN.password);
      await prisma.adminUser.create({
        data: {
          name: MASTER_ADMIN.name,
          email: normalizedEmail,
          passwordHash,
          role: MASTER_ADMIN.role,
        },
      });
      console.log(`[AUTH] Usuario administrador maestro (${normalizedEmail}) creado exitosamente.`);
    }
  } catch (error) {
    console.error('[AUTH] Error en auto-aprovisionamiento del usuario administrador:', error);
  }
}

/**
 * Server Action de Inicio de Sesión
 */
export async function loginAction(data: {
  email: string;
  password: string;
  rememberMe?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.email?.trim() || !data.password) {
      return {
        success: false,
        error: 'Por favor, ingresa tu correo electrónico y contraseña.',
      };
    }

    // 1. Auto-aprovisionar credenciales maestras si la base de datos está vacía
    await ensureAdminUserExists();

    const normalizedEmail = data.email.trim().toLowerCase();

    // 2. Buscar usuario en base de datos
    const user = await prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return {
        success: false,
        error: 'Correo o contraseña incorrectos. Verifica tus credenciales.',
      };
    }

    // 3. Validar contraseña
    const isValid = await verifyPassword(data.password, user.passwordHash);
    if (!isValid) {
      return {
        success: false,
        error: 'Correo o contraseña incorrectos. Verifica tus credenciales.',
      };
    }

    // 4. Generar JWT firmado con jose
    const rememberMe = data.rememberMe !== false; // Activo por defecto
    const token = await createSessionToken(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      rememberMe
    );

    // 5. Configurar cookie HTTP-Only con persistencia condicional
    // 30 días si rememberMe=true (persiste tras cerrar el navegador), 12 horas si rememberMe=false
    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12;

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return { success: true };
  } catch (error) {
    console.error('[AUTH] Error en loginAction:', error);
    return {
      success: false,
      error: 'Ocurrió un error inesperado al iniciar sesión. Inténtalo de nuevo.',
    };
  }
}

/**
 * Server Action para Cerrar Sesión
 * Elimina la cookie de sesión y redirige al login
 */
export async function logoutAction(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (error) {
    console.error('[AUTH] Error al eliminar cookie de sesión:', error);
  }
  redirect('/login');
}

/**
 * Server Action para consultar los datos del administrador con sesión activa
 */
export async function getSessionAction(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch (error) {
    console.error('[AUTH] Error al consultar sesión activa:', error);
    return null;
  }
}
