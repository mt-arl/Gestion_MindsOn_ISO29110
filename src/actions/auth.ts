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
import {
  verifyPassword,
  ensureAdminUserExists,
} from '@/lib/auth-service';

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
