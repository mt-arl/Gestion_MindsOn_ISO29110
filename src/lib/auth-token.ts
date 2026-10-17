import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';

export const SESSION_COOKIE_NAME = 'mindson_session';

export interface SessionPayload {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Fallback de clave secreta para evitar errores 500 en Vercel si NEXTAUTH_SECRET o JWT_SECRET no están definidas
const JWT_SECRET_STRING =
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET ||
  'mindson-super-secret-key-production-2026-auth-fallback-jwt-security';

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

/**
 * Genera un token JWT firmado compatible con Edge Runtime
 * - rememberMe = true: 30 días de persistencia
 * - rememberMe = false: 12 horas
 */
export async function createSessionToken(
  payload: SessionPayload,
  rememberMe: boolean = true
): Promise<string> {
  const exp = rememberMe ? '30d' : '12h';
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(JWT_SECRET);
}

/**
 * Valida y decodifica un token JWT de sesión
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload || typeof payload !== 'object') return null;

    return {
      id: String(payload.id || ''),
      email: String(payload.email || ''),
      name: String(payload.name || ''),
      role: String(payload.role || 'ADMIN'),
    };
  } catch {
    return null;
  }
}
