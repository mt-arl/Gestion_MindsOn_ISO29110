import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
} from '@/lib/auth-token';
import {
  verifyPassword,
  ensureAdminUserExists,
} from '@/lib/auth-service';

/**
 * Endpoint HTTP REST para autenticación
 * Ruta: POST /api/auth/login
 * Diseñado para pruebas funcionales (Postman), scripts y pruebas de carga/estrés (Apache JMeter).
 */
export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Formato de cuerpo inválido. Debe enviar un JSON válido.',
        },
        { status: 400 }
      );
    }

    const { email, password, rememberMe } = body;

    // 1. Validación de entrada
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El campo "email" es requerido.',
        },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'El campo "password" es requerido.',
        },
        { status: 400 }
      );
    }

    // 2. Garantizar aprovisionamiento administrativo en BD si está vacía
    await ensureAdminUserExists();

    const normalizedEmail = email.trim().toLowerCase();

    // 3. Consulta de usuario en PostgreSQL mediante Prisma ORM
    const user = await prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Credenciales inválidas. Correo o contraseña incorrectos.',
        },
        { status: 401 }
      );
    }

    // 4. Verificación criptográfica de contraseña (SHA-256)
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Credenciales inválidas. Correo o contraseña incorrectos.',
        },
        { status: 401 }
      );
    }

    // 5. Generación de Token JWT (Edge compatible vía jose)
    const shouldRemember = rememberMe !== false;
    const token = await createSessionToken(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      shouldRemember
    );

    // 6. Respuesta JSON con Token y datos del usuario
    const response = NextResponse.json(
      {
        success: true,
        message: 'Autenticación exitosa',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 }
    );

    // 7. Configuración de Cookie HTTP-Only complementaria
    const maxAge = shouldRemember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return response;
  } catch (error) {
    console.error('[API /api/auth/login] Error en autenticación:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor al procesar la autenticación.',
      },
      { status: 500 }
    );
  }
}

/**
 * Healthcheck / Métodos informativos
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'active',
      endpoint: 'POST /api/auth/login',
      description: 'Endpoint HTTP para autenticación institucional MindsOn',
      requiredBody: {
        email: 'string',
        password: 'string',
        rememberMe: 'boolean (opcional, default true)',
      },
    },
    { status: 200 }
  );
}

/**
 * Manejo de preflight CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
