// Cliente do Espaço Sincronizado. Ainda não é carregado pela aplicação principal.
// Nenhuma requisição acontece até uma das funções públicas ser chamada.
(() => {
  const messages = {
    invalid_name: 'Use um nome de 3 a 40 letras, números ou hífens.',
    invalid_password: 'A senha de publicação deve ter de 12 a 256 caracteres.',
    incorrect_password: 'Senha de publicação incorreta.',
    invalid_data: 'Os dados selecionados são inválidos ou muito grandes.',
    invalid_body: 'Confira a senha, a versão e os dados antes de publicar.',
    name_unavailable: 'Este nome já está em uso. Escolha outro.',
    not_found: 'Este espaço não existe ou expirou.',
    version_conflict: 'O espaço recebeu outra publicação. Busque a versão atual antes de publicar novamente.',
    rate_limited: 'Muitas tentativas recentes. Aguarde um pouco e tente novamente.',
    internal_error: 'O serviço está indisponível no momento. Tente novamente mais tarde.',
    network_error: 'Sem conexão com o servidor. Verifique a internet e tente novamente.',
    invalid_response: 'O servidor enviou uma resposta inesperada. Tente novamente mais tarde.'
  };

  class SyncSpaceError extends Error {
    constructor(code, status = 0, version = null) {
      super(messages[code] || 'Não foi possível acessar o Espaço Sincronizado.');
      this.name = 'SyncSpaceError';
      this.code = code;
      this.status = status;
      this.version = Number.isInteger(version) ? version : null;
    }
  }

  function spacePath(name) {
    if (typeof name !== 'string' || !name.trim()) throw new SyncSpaceError('invalid_name');
    return `/api/sync/${encodeURIComponent(name.trim())}`;
  }

  async function request(path, method, body) {
    let response;
    try {
      response = await fetch(path, {
        method,
        cache: 'no-store',
        credentials: 'same-origin',
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (_) {
      throw new SyncSpaceError('network_error');
    }

    let payload;
    try { payload = await response.json(); }
    catch (_) { throw new SyncSpaceError('invalid_response', response.status); }

    if (!response.ok) {
      const code = payload?.error === 'invalid_password' && response.status === 403
        ? 'incorrect_password' : payload?.error || 'request_failed';
      throw new SyncSpaceError(code, response.status, payload?.version);
    }
    if (!payload || typeof payload.name !== 'string' || !Number.isInteger(payload.version)
      || typeof payload.publishedAt !== 'string' || typeof payload.expiresAt !== 'string'
      || !payload.data || !Array.isArray(payload.data.sections)) {
      throw new SyncSpaceError('invalid_response', response.status);
    }
    return payload;
  }

  function create({ name, password, data }) {
    return request('/api/sync', 'POST', { name, password, data });
  }

  function access(name) {
    return request(spacePath(name), 'GET');
  }

  function publish({ name, password, expectedVersion, data }) {
    return request(spacePath(name), 'PATCH', { password, expectedVersion, data });
  }

  window.BluSyncSpaceClient = Object.freeze({ create, access, publish });
})();
