import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { relayToBackend } from '../functions/api/_middleware.js';

const apiOrigin = 'https://api.deployment.test';

const givenAnApiAnswering = answer => {
  const reached = [];
  const forward = request => {
    reached.push(request);
    return Promise.resolve(answer);
  };

  return { reached, forward };
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
      body: '{"operateur":"Amel"}',
    };

    await whenTheBrowserAsks('https://glm-pupitre.pages.dev/api/atelier/journees', pointage, forward);

    assert.deepEqual([reached[0].method, await reached[0].text()], ['POST', '{"operateur":"Amel"}']);
  });

  it('should refuse to guess when the project declares no API origin', async () => {
    const answer = await relayToBackend(new Request('https://glm-pupitre.pages.dev/api/operateurs'), { apiOrigin: '' });

    assert.equal(answer.status, 500);
  });

  it('should answer with what the API answered', async () => {
    const refusal = new Response('{"code":"urn:glm:erreur:atelier:journee-de-travail-deja-ouverte"}', { status: 409 });
    const { forward } = givenAnApiAnswering(refusal);

    const answer = await whenTheBrowserAsks('https://glm-pupitre.pages.dev/api/atelier/journees', { method: 'POST' }, forward);

    assert.equal(answer.status, 409);
  });
});
