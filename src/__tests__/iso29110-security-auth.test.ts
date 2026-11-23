import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { hashPassword, verifyPassword } from '../lib/auth-service';
import { createSessionToken, verifySessionToken } from '../lib/auth-token';
import { validateEcuadorianId, validateEcuadorianPhone, buildWhatsAppUrl } from '../lib/ecuador-validators';
import { GET, POST } from '../app/api/auth/login/route';

describe('ISO/IEC 29110 - IS.4 & IS.5: Suite de Pruebas Unitarias y de Integracion (MindsOn)', () => {
  describe('1. Servicio Criptografico de Contraseñas (src/lib/auth-service.ts)', () => {
    it('UT-01: hashPassword genera un digest SHA-256 hexadecimal deterministico de 64 caracteres con salt', async () => {
      const hash1 = await hashPassword('mindson26');
      const hash2 = await hashPassword('mindson26');
      assert.equal(hash1.length, 64);
      assert.match(hash1, /^[0-9a-f]{64}$/);
      assert.equal(hash1, hash2);
    });

    it('UT-02: verifyPassword valida exitosamente una contraseña legitima contra su hash con salt', async () => {
      const storedHash = await hashPassword('mindson26');
      const isValid = await verifyPassword('mindson26', storedHash);
      assert.equal(isValid, true);
    });

    it('UT-03: verifyPassword rechaza contraseñas incorrectas y bloquea comparacion en texto plano', async () => {
      const storedHash = await hashPassword('mindson26');
      const wrongPass = await verifyPassword('claveIncorrecta', storedHash);
      const plainTextAttempt = await verifyPassword('texto_plano_sin_hash', 'texto_plano_sin_hash');
      assert.equal(wrongPass, false);
      assert.equal(plainTextAttempt, false);
    });
  });

  describe('2. Gestion de Tokens JWT y Prevencion de Bypass (src/lib/auth-token.ts)', () => {
    it('UT-04: createSessionToken y verifySessionToken firman y verifican un payload administrativo valido', async () => {
      const payload = {
        id: 'usr_admin_01',
        email: 'mindsonec@gmail.com',
        name: 'Administrador MindsOn',
        role: 'ADMIN',
      };
      const token = await createSessionToken(payload, true);
      assert.ok(token.split('.').length === 3);

      const verified = await verifySessionToken(token);
      assert.deepEqual(verified, payload);
    });

    it('UT-05: verifySessionToken retorna null ante un token JWT adulterado o invalido', async () => {
      const invalidResult = await verifySessionToken('eyJhbGciOiJIUzI1NiJ9.payload_falso.firma_invalida');
      assert.equal(invalidResult, null);
    });

    it('UT-06: verifySessionToken rechaza payloads con id o email vacios (mitigacion de bypass truthy)', async () => {
      const emptyToken = await createSessionToken(
        { id: '', email: '', name: 'Anon', role: 'ADMIN' },
        false
      );
      const verified = await verifySessionToken(emptyToken);
      assert.equal(verified, null);
    });
  });

  describe('3. Endpoint HTTP REST de Autenticacion (src/app/api/auth/login/route.ts)', () => {
    it('UT-07: GET /api/auth/login responde 200 OK con metadatos de estado activo', async () => {
      const response = await GET();
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.status, 'active');
      assert.equal(body.endpoint, 'POST /api/auth/login');
    });

    it('UT-08: POST /api/auth/login rechaza JSON malformado con estado 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: '{ json_invalido ',
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(req);
      const body = await response.json();
      assert.equal(response.status, 400);
      assert.equal(body.success, false);
    });

    it('UT-09: POST /api/auth/login rechaza peticiones sin email o sin password con estado 400', async () => {
      const reqNoEmail = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: '   ', password: '123' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res1 = await POST(reqNoEmail);
      assert.equal(res1.status, 400);

      const reqNoPass = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'mindsonec@gmail.com' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res2 = await POST(reqNoPass);
      assert.equal(res2.status, 400);
    });
  });

  describe('4. Validadores Regulatorios Ecuatorianos (src/lib/ecuador-validators.ts)', () => {
    it('UT-10: validateEcuadorianId valida cedulas ecuatorianas por Modulo 10 y rechaza digito verificador erroneo', () => {
      const valid = validateEcuadorianId('1710034065');
      const invalidDigit = validateEcuadorianId('1710034069');
      const invalidProvince = validateEcuadorianId('9910034065');
      assert.equal(valid.isValid, true);
      assert.equal(invalidDigit.isValid, false);
      assert.equal(invalidProvince.isValid, false);
    });

    it('UT-11: validateEcuadorianPhone y buildWhatsAppUrl normalizan telefonos al prefijo +593', () => {
      assert.equal(validateEcuadorianPhone('0991234567').isValid, true);
      assert.equal(validateEcuadorianPhone('+593 99 123 4567').isValid, true);
      assert.equal(validateEcuadorianPhone('022345678').isValid, false);
      assert.equal(
        buildWhatsAppUrl('0991234567', 'Hola MindsOn'),
        'https://wa.me/593991234567?text=Hola%20MindsOn'
      );
    });
  });
});
