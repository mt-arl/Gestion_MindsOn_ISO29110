import { cookies } from 'next/headers';
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  SessionPayload,
} from '@/lib/auth-token';

/**
 * Guardián de autenticación para Server Actions.
 *
 * Verifica que exista una sesión válida en la cookie HTTP-Only.
 * Debe llamarse como primera línea en TODA Server Action exportada
 * (excepto loginAction y getSessionAction).
 *
 * @returns SessionPayload con los datos del administrador autenticado
 * @throws Error si no hay sesión válida (el cliente debe manejar este error)
 *
 * Uso:
 *   export async function myServerAction() {
 *     const session = await requireAuth();
 *     // ... lógica protegida
 *   }
 */
export async function requireAuth(): Promise<SessionPayload> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    throw new Error('NO_AUTH: Sesión no encontrada. Inicia sesión para continuar.');
  }

  const session = await verifySessionToken(token);

  if (!session) {
    throw new Error('NO_AUTH: Sesión inválida o expirada. Inicia sesión nuevamente.');
  }

  return session;
}
