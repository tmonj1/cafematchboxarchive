import { describe, it, expect, beforeEach } from 'vitest';
import { saveOidcState, loadOidcState } from './oidc.js';

describe('oidc state management', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('saves and loads oidc state', () => {
    saveOidcState('state-abc', 'verifier-xyz', 'keycloak');
    const loaded = loadOidcState();
    expect(loaded).toEqual({
      state: 'state-abc',
      codeVerifier: 'verifier-xyz',
      providerName: 'keycloak',
    });
  });

  it('removes state from sessionStorage after load', () => {
    saveOidcState('state', 'verifier', 'keycloak');
    loadOidcState();
    expect(loadOidcState()).toBeNull();
  });

  it('returns null when no state is stored', () => {
    expect(loadOidcState()).toBeNull();
  });

  it('returns null for corrupted sessionStorage data', () => {
    sessionStorage.setItem('cma_oidc_state', 'not-valid-json{{{');
    expect(loadOidcState()).toBeNull();
  });
});
