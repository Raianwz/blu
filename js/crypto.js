const BLU_ENCRYPTION_PASSPHRASE = 'blu-sec-data-key';
const BLU_ENCRYPTED_MARKER = 'blu_encrypted';

let cachedEncryptionKey = null;

async function getEncryptionKey() {
  if (cachedEncryptionKey) return cachedEncryptionKey;

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest('SHA-256', encoder.encode(BLU_ENCRYPTION_PASSPHRASE));
  cachedEncryptionKey = await crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  return cachedEncryptionKey;
}

function bufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function encryptJsonString(jsonString) {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(jsonString));

  return JSON.stringify({
    [BLU_ENCRYPTED_MARKER]: true,
    alg: 'AES-GCM-256',
    iv: bufferToBase64(iv),
    data: bufferToBase64(ciphertext)
  });
}

async function decryptJsonPayload(payload) {
  const key = await getEncryptionKey();
  const iv = new Uint8Array(base64ToBuffer(payload.iv));
  const ciphertextBuffer = base64ToBuffer(payload.data);
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertextBuffer);
  return new TextDecoder().decode(plainBuffer);
}

function isEncryptedPayload(parsed) {
  return !!(parsed && typeof parsed === 'object' && parsed[BLU_ENCRYPTED_MARKER] === true && parsed.iv && parsed.data);
}
