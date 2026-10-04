const MISSING_ORIGIN = 'This Pages project declares no API_ORIGIN variable, so /api/** leads nowhere.';

const requestsNoStorage = request =>
  (request.headers.get('Cache-Control') ?? '').split(',').some(directive => directive.trim().toLowerCase() === 'no-store');

const preventResponseStorage = answer => {
  const headers = new Headers(answer.headers);
  headers.set('Cache-Control', 'no-store');
  return new Response(answer.body, { status: answer.status, statusText: answer.statusText, headers });
};

export const relayToBackend = (request, { apiOrigin, forward = fetch } = {}) => {
  if (!apiOrigin) {
    return Promise.resolve(new Response(MISSING_ORIGIN, { status: 500 }));
  }

  const asked = new URL(request.url);
  const upstream = new Request(new URL(asked.pathname + asked.search, apiOrigin), request);

  if (requestsNoStorage(request)) {
    return forward(upstream, { cf: { cacheTtlByStatus: { '100-599': -1 } } }).then(preventResponseStorage);
  }
  return forward(upstream);
};

export const onRequest = ({ request, env }) => relayToBackend(request, { apiOrigin: env.API_ORIGIN });
