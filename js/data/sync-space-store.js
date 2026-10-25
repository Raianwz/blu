// Cópia local dos espaços recebidos. Ainda não é carregada pela aplicação principal.
(() => {
  const KEY = 'blu:data-sync';
  const FORMAT_VERSION = 1;
  const MAX_SPACES = 1; // O formato usa uma lista para permitir até três em uma etapa futura.

  class SyncSpaceStoreError extends Error {
    constructor(code, message) {
      super(message);
      this.name = 'SyncSpaceStoreError';
      this.code = code;
    }
  }

  function validSpace(space) {
    return space && typeof space === 'object' && !Array.isArray(space)
      && typeof space.name === 'string' && /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(space.name)
      && !space.name.includes('--')
      && Number.isSafeInteger(space.version) && space.version > 0
      && typeof space.publishedAt === 'string' && Number.isFinite(Date.parse(space.publishedAt))
      && typeof space.expiresAt === 'string' && Number.isFinite(Date.parse(space.expiresAt))
      && typeof space.receivedAt === 'string' && Number.isFinite(Date.parse(space.receivedAt))
      && space.data && typeof space.data === 'object' && !Array.isArray(space.data)
      && Array.isArray(space.data.tags) && Array.isArray(space.data.sections);
  }

  function read() {
    let raw;
    try { raw = localStorage.getItem(KEY); }
    catch (_) { throw new SyncSpaceStoreError('storage_unavailable', 'Não foi possível ler a cópia local do espaço.'); }
    if (raw === null) return { formatVersion: FORMAT_VERSION, spaces: [] };

    try {
      const value = JSON.parse(raw);
      if (value?.formatVersion !== FORMAT_VERSION || !Array.isArray(value.spaces)
        || value.spaces.length > MAX_SPACES || !value.spaces.every(validSpace)
        || new Set(value.spaces.map(space => space.name)).size !== value.spaces.length) throw new Error('invalid');
      return value;
    } catch (_) {
      throw new SyncSpaceStoreError('invalid_storage', 'A cópia local do espaço está inválida. Exporte os dados antes de substituí-la.');
    }
  }

  function list() {
    return structuredClone(read().spaces);
  }

  function get(name) {
    return list().find(space => space.name === name) || null;
  }

  function save(snapshot) {
    const received = { ...snapshot, receivedAt: new Date().toISOString() };
    if (!validSpace(received)) throw new SyncSpaceStoreError('invalid_space', 'A versão recebida do espaço é inválida.');
    const envelope = read();
    const existingIndex = envelope.spaces.findIndex(space => space.name === received.name);
    if (existingIndex < 0 && envelope.spaces.length >= MAX_SPACES)
      throw new SyncSpaceStoreError('space_limit', 'Remova o espaço atual antes de guardar outro.');
    if (existingIndex >= 0 && received.version < envelope.spaces[existingIndex].version)
      throw new SyncSpaceStoreError('older_version', 'A versão recebida é anterior à cópia local.');

    // Serializar antes da gravação também evita manter referências ao objeto da API.
    const copy = JSON.parse(JSON.stringify(received));
    if (existingIndex >= 0) envelope.spaces[existingIndex] = copy;
    else envelope.spaces.push(copy);
    try { localStorage.setItem(KEY, JSON.stringify(envelope)); }
    catch (_) { throw new SyncSpaceStoreError('storage_unavailable', 'Não foi possível salvar a cópia local do espaço.'); }
    return structuredClone(copy);
  }

  function remove(name) {
    const envelope = read();
    const next = envelope.spaces.filter(space => space.name !== name);
    if (next.length === envelope.spaces.length) return false;
    try { localStorage.setItem(KEY, JSON.stringify({ ...envelope, spaces: next })); }
    catch (_) { throw new SyncSpaceStoreError('storage_unavailable', 'Não foi possível remover a cópia local do espaço.'); }
    return true;
  }

  window.BluSyncSpaceStore = Object.freeze({ list, get, save, remove });
})();
