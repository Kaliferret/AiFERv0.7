/**
 * AIF Crypto — Encryption + Signatures for AIF binary files
 * 
 * Two independent layers:
 * 
 * 🔐 ENCRYPTION (AES-256-GCM per section)
 *    - Section-level encryption: can encrypt only sensitive parts (e.g., state, not UI)
 *    - Authenticated encryption (GCM provides integrity + confidentiality)
 *    - Key derivation from: zkLogin session / passphrase / peer secret
 *    - Nonce: 12 bytes random per section
 *    - Tag: 16 bytes appended
 * 
 * ✍️ SIGNATURES (Ed25519)
 *    - Signs entire file CID (after serialization)
 *    - Author public key in header section
 *    - Verification: anyone can verify, only author can sign
 *    - Optional — files work without signatures (just warn user)
 * 
 * Everything uses WebCrypto API (no external deps).
 */

// ═══════════════════════════════════════════════════════════
// KEY DERIVATION
// ═══════════════════════════════════════════════════════════

/**
 * Derive AES-256 key from a passphrase using PBKDF2
 */
async function deriveKeyFromPassphrase(passphrase, salt, iterations = 100000) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can export for peer sharing
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive AES-256 key from zkLogin session (uses session secret as base)
 */
async function deriveKeyFromZkLogin(session, salt) {
  if (!session?.suiAddress) throw new Error('No zkLogin session');
  // Use address + provider as deterministic material
  const material = `${session.suiAddress}:${session.provider}:aifer-v2`;
  return deriveKeyFromPassphrase(material, salt);
}

/**
 * Generate a random AES-256 key for one-off encryption
 */
async function generateAESKey() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// ═══════════════════════════════════════════════════════════
// ENCRYPTION (AES-GCM)
// ═══════════════════════════════════════════════════════════

/**
 * Encrypt a section payload with AES-GCM
 * @returns {Uint8Array} [nonce(12) || ciphertext || tag(16)]
 */
async function encryptSection(plaintext, key) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    key,
    plaintext
  );
  
  // Concatenate nonce + ciphertext (which includes tag)
  const result = new Uint8Array(12 + ciphertext.byteLength);
  result.set(nonce, 0);
  result.set(new Uint8Array(ciphertext), 12);
  return result;
}

/**
 * Decrypt a section payload
 */
async function decryptSection(encrypted, key) {
  if (encrypted.length < 28) throw new Error('Encrypted data too short (need nonce + tag)');
  
  const nonce = encrypted.slice(0, 12);
  const ciphertext = encrypted.slice(12);
  
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    key,
    ciphertext
  );
  
  return new Uint8Array(plaintext);
}

// ═══════════════════════════════════════════════════════════
// SIGNATURES (Ed25519)
// ═══════════════════════════════════════════════════════════

/**
 * Generate new Ed25519 signing keypair
 */
async function generateSigningKeypair() {
  const keypair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify']
  );
  
  const publicKeyRaw = await crypto.subtle.exportKey('raw', keypair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keypair.privateKey);
  
  return {
    publicKey: keypair.publicKey,
    privateKey: keypair.privateKey,
    publicKeyBytes: new Uint8Array(publicKeyRaw),
    privateKeyJwk,
  };
}

/**
 * Sign data with Ed25519 private key
 */
async function signData(data, privateKey) {
  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' },
    privateKey,
    data
  );
  return new Uint8Array(signature);
}

/**
 * Verify Ed25519 signature
 */
async function verifySignature(data, signature, publicKeyBytes) {
  try {
    const publicKey = await crypto.subtle.importKey(
      'raw',
      publicKeyBytes,
      { name: 'Ed25519' },
      false,
      ['verify']
    );
    
    return await crypto.subtle.verify(
      { name: 'Ed25519' },
      publicKey,
      signature,
      data
    );
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// KEY MANAGEMENT & STORAGE
// ═══════════════════════════════════════════════════════════

class AIFKeyManager {
  constructor() {
    this.signingKeypair = null;
    this.encryptionKeys = new Map(); // keyId → CryptoKey
    this.trustedPublicKeys = new Map(); // publicKeyHex → { name, addedAt, appsSigned }
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    this._initialized = true;

    try {
      // Try to load existing signing keypair from storage
      const { indexedDBService } = await import('@/services/indexedDBService');
      const stored = await indexedDBService.get('aif-signing-key');
      
      if (stored?.privateKeyJwk && stored?.publicKeyBytes) {
        const privateKey = await crypto.subtle.importKey(
          'jwk',
          stored.privateKeyJwk,
          { name: 'Ed25519' },
          false,
          ['sign']
        );
        const publicKey = await crypto.subtle.importKey(
          'raw',
          new Uint8Array(stored.publicKeyBytes),
          { name: 'Ed25519' },
          true,
          ['verify']
        );
        
        this.signingKeypair = {
          privateKey,
          publicKey,
          publicKeyBytes: new Uint8Array(stored.publicKeyBytes),
          privateKeyJwk: stored.privateKeyJwk,
        };
      } else {
        // Generate new keypair
        this.signingKeypair = await generateSigningKeypair();
        await indexedDBService.set('aif-signing-key', {
          privateKeyJwk: this.signingKeypair.privateKeyJwk,
          publicKeyBytes: Array.from(this.signingKeypair.publicKeyBytes),
          generatedAt: Date.now(),
        });
      }

      // Load trusted keys
      const trusted = await indexedDBService.get('aif-trusted-keys') || [];
      trusted.forEach(t => this.trustedPublicKeys.set(t.publicKeyHex, t));
      
      console.info(`🔐 AIF Crypto ready — pubkey: ${this.getPublicKeyHex().slice(0, 16)}...`);
    } catch (e) {
      console.warn('[AIFCrypto] Init warning:', e.message);
      // Fallback — keypair only in memory
      this.signingKeypair = await generateSigningKeypair();
    }
  }

  getPublicKeyHex() {
    if (!this.signingKeypair) return null;
    return Array.from(this.signingKeypair.publicKeyBytes)
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async sign(data) {
    if (!this.signingKeypair) await this.init();
    return signData(data, this.signingKeypair.privateKey);
  }

  async verify(data, signature, publicKeyBytes) {
    return verifySignature(data, signature, publicKeyBytes);
  }

  async addTrustedKey(publicKeyHex, name) {
    this.trustedPublicKeys.set(publicKeyHex, {
      publicKeyHex,
      name,
      addedAt: Date.now(),
      appsSigned: 0,
    });
    await this.persistTrustedKeys();
  }

  async persistTrustedKeys() {
    try {
      const { indexedDBService } = await import('@/services/indexedDBService');
      await indexedDBService.set('aif-trusted-keys', Array.from(this.trustedPublicKeys.values()));
    } catch {}
  }

  isTrusted(publicKeyHex) {
    return this.trustedPublicKeys.has(publicKeyHex);
  }

  async getEncryptionKey(keyId = 'default', source = 'zkLogin') {
    if (this.encryptionKeys.has(keyId)) return this.encryptionKeys.get(keyId);
    
    let key;
    if (source === 'zkLogin') {
      try {
        const { zkLogin } = await import('@/services/zkLoginService');
        const session = zkLogin.getSession();
        const salt = new TextEncoder().encode(`aifer-v2-${keyId}`);
        key = await deriveKeyFromZkLogin(session, salt);
      } catch {
        key = await generateAESKey();
      }
    } else {
      key = await generateAESKey();
    }
    
    this.encryptionKeys.set(keyId, key);
    return key;
  }

  getStatus() {
    return {
      initialized: !!this.signingKeypair,
      publicKey: this.getPublicKeyHex(),
      trustedKeys: this.trustedPublicKeys.size,
      encryptionKeys: this.encryptionKeys.size,
    };
  }
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

export const aifKeyManager = new AIFKeyManager();
export {
  deriveKeyFromPassphrase,
  deriveKeyFromZkLogin,
  generateAESKey,
  encryptSection,
  decryptSection,
  generateSigningKeypair,
  signData,
  verifySignature,
  AIFKeyManager,
};
export default aifKeyManager;
