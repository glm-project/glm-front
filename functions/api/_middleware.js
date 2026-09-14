// Every request under /api/** on the deployed pupitre enters here and leaves for the backend unchanged, so
// the pupitre keeps calling its own origin exactly as it does behind the Vite proxy in development and
// ApiClient needs no base URL. Cloudflare runs this file for the whole /api/ directory because of its name.
// `wrangler pages deploy` finds it only if `functions/` sits in the working directory, never inside the
// published one: moved elsewhere it is dropped without a word and /api/** answers the index.html.
const MISSING_ORIGIN = 'This Pages project declares no API_ORIGIN variable, so /api/** leads nowhere.';

export const relayToBackend = (request, { apiOrigin, forward = fetch } = {}) => {
  if (!apiOrigin) {
    return Promise.resolve(new Response(MISSING_ORIGIN, { status: 500 }));
  }

  const asked = new URL(request.url);

  return forward(new Request(new URL(asked.pathname + asked.search, apiOrigin), request));
};

export const onRequest = ({ request, env }) => relayToBackend(request, { apiOrigin: env.API_ORIGIN });
