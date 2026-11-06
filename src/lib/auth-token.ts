import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';

export const SESSION_COOKIE_NAME = 'mindson_session';

export interface SessionPayload {
  id: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Obtiene la clave secreta JWT de forma lazy.
 *
 * En producción (runtime, NO build-time), emite un warning si no hay secret configurado.
 * En desarrollo se permite un fallback seguro para facilitar el arranque local.
 *
 * IMPORTANTE: Configura JWT_SECRET o NEXTAUTH_SECRET en Vercel para producción.
 */
function getJwtSecret(): Uint8Array {
  const secret =
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET;

  if (!secret && process.env.NODE_ENV === 'production') {
    // Warning en vez de throw para no romper el build de Next.js
    // En runtime, las sesiones seguirán funcionando con el fallback pero serán menos seguras
    console.warn(
      '[AUTH WARNING] JWT_SECRET o NEXTAUTH_SECRET no están configuradas en producción. ' +
      'Configura una de estas variables de entorno en Vercel para máxima seguridad.'
    );
  }

  // Fallback para desarrollo local y como safety net en producción
  const effectiveSecret = secret || 'mindson-dev-only-local-secret-not-for-production';
  return new TextEncoder().encode(effectiveSecret);
}

// Lazy initialization: se calcula al primer uso, no al importar
let _jwtSecret: Uint8Array | null = null;
function getSecret(): Uint8Array {
  if (!_jwtSecret) {
    _jwtSecret = getJwtSecret();
  }
  return _jwtSecret;
}

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
    .sign(getSecret());
}

/**
 * Valida y decodifica un token JWT de sesión.
 * Retorna null si el token es inválido, expiró, o los campos esenciales están vacíos.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload || typeof payload !== 'object') return null;

    const id = String(payload.id || '');
    const email = String(payload.email || '');
    const name = String(payload.name || '');
    const role = String(payload.role || '');

    // Rechazar tokens con campos esenciales vacíos para evitar bypass truthy
    if (!id || !email) return null;

    return { id, email, name, role: role || 'ADMIN' };
  } catch {
    return null;
  }
}
