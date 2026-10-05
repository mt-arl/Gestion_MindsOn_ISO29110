/**
 * Valida una Cédula de Identidad Ecuatoriana mediante el Algoritmo Módulo 10.
 */
export function validateEcuadorianId(ci?: string | null): { isValid: boolean; error?: string } {
  if (!ci || ci.trim() === '') {
    return { isValid: true };
  }
  const cleanCi = ci.trim();

  if (!/^\d{10}$/.test(cleanCi)) {
    return { isValid: false, error: "La cédula debe contener exactamente 10 dígitos numéricos." };
  }

  const province = parseInt(cleanCi.substring(0, 2), 10);
  if (province < 1 || province > 24) {
    return { isValid: false, error: "Código de provincia inválido (debe ser entre 01 y 24)." };
  }

  const thirdDigit = parseInt(cleanCi.charAt(2), 10);
  if (thirdDigit >= 6) {
    return { isValid: false, error: "El tercer dígito de la cédula es inválido para personas naturales." };
  }

  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let val = parseInt(cleanCi.charAt(i), 10) * coefficients[i];
    if (val >= 10) val -= 9;
    sum += val;
  }

  const verifierDigit = (10 - (sum % 10)) % 10;
  if (verifierDigit !== parseInt(cleanCi.charAt(9), 10)) {
    return { isValid: false, error: "La cédula ecuatoriana ingresada no es válida (dígito verificador incorrecto)." };
  }

  return { isValid: true };
}

/**
 * Valida números de celular ecuatorianos (09XXXXXXXX o +5939XXXXXXXX / 5939XXXXXXXX).
 */
export function validateEcuadorianPhone(phone: string): { isValid: boolean; error?: string } {
  if (!phone || phone.trim() === '') return { isValid: true }; // Opcional si no es obligatorio
  const clean = phone.replace(/[\s\-\+]/g, '');
  
  // Acepta formato local (0987654321) o internacional (593987654321)
  const isLocal = /^09\d{8}$/.test(clean);
  const isIntl = /^5939\d{8}$/.test(clean);

  if (!isLocal && !isIntl) {
    return { isValid: false, error: "Formato de celular inválido (Ej: 0991234567 o +593 99 123 4567)." };
  }

  return { isValid: true };
}

/**
 * Convierte cualquier número telefónico ecuatoriano al formato internacional de WhatsApp (5939XXXXXXXX).
 * Ejemplo: "0991207906" -> "593991207906"
 *          "+593 99 120 7906" -> "593991207906"
 */
export function formatWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  
  // Eliminar cualquier caracter no numérico (+, espacios, guiones, paréntesis)
  let clean = phone.replace(/\D/g, '');

  // Si empieza con '0' y tiene 10 dígitos (formato local común: 09XXXXXXXX), reemplazar el '0' inicial por '593'
  if (clean.startsWith('0') && clean.length === 10) {
    clean = '593' + clean.substring(1);
  } else if (clean.startsWith('9') && clean.length === 9) {
    // Si lo ingresaron sin el cero inicial (9XXXXXXXX)
    clean = '593' + clean;
  } else if (clean.length === 9 && !clean.startsWith('593')) {
    clean = '593' + clean;
  }

  return clean;
}

/**
 * Genera la URL completa de WhatsApp con mensaje codificado
 */
export function buildWhatsAppUrl(phone: string, message: string = ''): string {
  const sanitizedNumber = formatWhatsAppPhone(phone);
  if (!sanitizedNumber) return '#';
  
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${sanitizedNumber}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
}
