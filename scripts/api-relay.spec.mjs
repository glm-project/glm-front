import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { relayToBackend } from '../functions/api/_middleware.js';

const apiOrigin = 'https://api.deployment.test';

const givenAnApiAnswering = answer => {
  const reached = [];
  const cachePolicies = [];
  const forward = (request, options) => {
    reached.push(request);
    cachePolicies.push(options);
    return Promise.resolve(answer);
  };

  return { reached, cachePolicies, forward };
};

const whenTheBrowserAsks = (url, options, forward) => relayToBackend(new Request(url, options), { apiOrigin, forward });

describe('API relay', () => {
  it('should reach the API origin on the path the browser asked for', async () => {
    const { reached, forward } = givenAnApiAnswering(new Response('[]'));

    await whenTheBrowserAsks('https://glm-pupitre.pages.dev/api/operateurs', {}, forward);

    assert.equal(reached[0].url, 'https://api.deployment.test/api/operateurs');
  });

  it('should carry the query string the client built', async () => {
    const { reached, forward } = givenAnApiAnswering(new Response('[]'));

    await whenTheBrowserAsks('https://glm-pupitre.pages.dev/api/atelier/suivis?size=100&page=0', {}, forward);

    assert.equal(reached[0].url, 'https://api.deployment.test/api/atelier/suivis?size=100&page=0');
  });

  it('should preserve Gestion no-store through the origin exchange and its response', async () => {
    const { reached, cachePolicies, forward } = givenAnApiAnswering(
      new Response('current-data', { headers: { 'Cache-Control': 'public, max-age=3600', 'X-Request-Id': 'current-reading' } }),
    );

    const answer = await whenTheBrowserAsks(
      'https://glm-supervision.pages.dev/api/operateurs',
      { headers: { 'Cache-Control': 'no-cache, no-store' } },
      forward,
    );
    const body = await answer.text();

    assert.deepEqual(cachePolicies, [{ cf: { cacheTtlByStatus: { '100-599': -1 } } }]);
    assert.equal(reached[0].headers.get('Cache-Control'), 'no-cache, no-store');
    assert.equal(answer.headers.get('Cache-Control'), 'no-store');
    assert.equal(answer.headers.get('X-Request-Id'), 'current-reading');
    assert.equal(body, 'current-data');
  });

  it('should forward the bearer token the interceptor attached', async () => {
    const { reached, forward } = givenAnApiAnswering(new Response('[]'));
    const withToken = { headers: { authorization: 'Bearer un-jeton' } };

    await whenTheBrowserAsks('https://glm-pupitre.pages.dev/api/operateurs', withToken, forward);

    assert.equal(reached[0].headers.get('authorization'), 'Bearer un-jeton');
  });

  it('should forward the method and the body of a write', async () => {
    const { reached, forward } = givenAnApiAnswering(new Response('{}', { status: 201 }));
    const pointage = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"id":"932c0c0b-a676-408d-8f82-e9b56ad7791c","operateur":"0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d","type":"DEBUT"}',
    };

    await whenTheBrowserAsks(
      'https://glm-pupitre.pages.dev/api/atelier/suivis/b7f0c2de-1f2a-4c3b-9d4e-5f6a7b8c9d0e/pointages',
      pointage,
      forward,
    );

    assert.deepEqual(
      [reached[0].method, await reached[0].text()],
      ['POST', '{"id":"932c0c0b-a676-408d-8f82-e9b56ad7791c","operateur":"0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d","type":"DEBUT"}'],
    );
  });

  it('should refuse to guess when the project declares no API origin', async () => {
    const answer = await relayToBackend(new Request('https://glm-pupitre.pages.dev/api/operateurs'), { apiOrigin: '' });

    assert.equal(answer.status, 500);
  });

  it('should answer with what the API answered', async () => {
    const refusal = new Response('{"type":"urn:glm:erreur:atelier:pointage-ignore"}', { status: 409 });
    const { forward } = givenAnApiAnswering(refusal);

    const answer = await whenTheBrowserAsks(
      'https://glm-pupitre.pages.dev/api/atelier/suivis/b7f0c2de-1f2a-4c3b-9d4e-5f6a7b8c9d0e/pointages',
      { method: 'POST' },
      forward,
    );

    assert.equal(answer.status, 409);
  });
});
