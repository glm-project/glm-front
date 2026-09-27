const MISSING_ORIGIN = 'This Pages project declares no API_ORIGIN variable, so /api/** leads nowhere.';

export const relayToBackend = (request, { apiOrigin, forward = fetch } = {}) => {
  if (!apiOrigin) {
    return Promise.resolve(new Response(MISSING_ORIGIN, { status: 500 }));
  }

  const asked = new URL(request.url);

  return forward(new Request(new URL(asked.pathname + asked.search, apiOrigin), request));
};

export const onRequest = ({ request, env }) => relayToBackend(request, { apiOrigin: env.API_ORIGIN });
