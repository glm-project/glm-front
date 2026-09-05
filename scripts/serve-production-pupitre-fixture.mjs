import { createReadStream, existsSync, mkdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const argument = name => {
  const prefix = `--${name}=`;
  return process.argv.find(candidate => candidate.startsWith(prefix))?.slice(prefix.length);
};

const appPort = Number(argument('port') ?? '9010');
const serviceWorker = argument('service-worker') ?? 'enabled';
const authPort = 9080;
const output = resolve('target/classes/static/pupitre');
const fixtureOutput = resolve('target/production-offline-fixture');
const reportDirectory = resolve('artifacts/production-offline');
const origin = `http://localhost:${appPort}`;
const tokenPayload = Buffer.from(JSON.stringify({ tenant: 'entreprise-a' })).toString('base64url');
const accessToken = `fixture.${tokenPayload}.signature`;
const state = {
  authorizationRequests: 0,
  referenceRequests: 0,
  tokenRequests: 0,
  pushes: [],
};
const controlWaiters = [];

const operator = {
  id: 'operator-1',
  nom: 'Dupont',
  prenom: 'Jean',
  matricule: '049',
  natures: [],
  postes: [],
};

const workshopItem = {
  activitesEnCours: [],
  element: 'element-1',
  engageLe: '2026-09-05T07:30:00Z',
  engagePar: 'manager-1',
  etat: 'EN_ATTENTE',
  id: 'workshop-item-1',
  nom: 'OF-1',
  type: 'PRODUIT',
};

const json = (response, status, body, headers = {}) => {
  response.writeHead(status, { 'cache-control': 'no-store', 'content-type': 'application/json', ...headers });
  response.end(JSON.stringify(body));
};

const writeEvidence = signal => {
  mkdirSync(reportDirectory, { recursive: true });
  const report = join(reportDirectory, `server-${serviceWorker}.json`);
  const pending = `${report}.pending`;
  writeFileSync(pending, `${JSON.stringify({ ...state, appPort, serviceWorker, signal }, undefined, 2)}\n`);
  renameSync(pending, report);
};

const observedCount = field => {
  if (field === 'pushes') return state.pushes.length;
  if (field === 'authorizationRequests') return state.authorizationRequests;
  if (field === 'referenceRequests') return state.referenceRequests;
  if (field === 'tokenRequests') return state.tokenRequests;
  return undefined;
};

const flushControlWaiters = () => {
  for (let index = controlWaiters.length - 1; index >= 0; index--) {
    const waiter = controlWaiters[index];
    const count = observedCount(waiter.field);
    if (count !== undefined && count >= waiter.atLeast) {
      controlWaiters.splice(index, 1);
      json(waiter.response, 200, state);
    }
  }
};

const recordEvidence = () => {
  writeEvidence('running');
  flushControlWaiters();
};

const allowFixtureOrigin = {
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-origin': '*',
};

const readBody = request =>
  new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    request.on('error', rejectBody);
  });

const driver = `<!doctype html><html><head><meta charset="utf-8"><title>Pupitre offline driver</title></head><body data-selector="offline-driver"></body></html>`;

const contentTypes = new Map([
  ['.css', 'text/css'],
  ['.html', 'text/html'],
  ['.js', 'text/javascript'],
  ['.json', 'application/json'],
  ['.webmanifest', 'application/manifest+json'],
]);

const staticFileFor = pathname => {
  const relative = pathname === '/' ? 'index.html' : normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, '');
  const candidate = resolve(output, relative);
  if (!candidate.startsWith(`${output}/`) || !existsSync(candidate) || !statSync(candidate).isFile()) {
    return extname(relative) === '' ? join(output, 'index.html') : undefined;
  }
  return candidate;
};

const fixtureFileFor = pathname => {
  const relative = pathname.replace(/^\/__fixture-assets\//, '');
  const candidate = resolve(fixtureOutput, relative);
  return candidate.startsWith(`${fixtureOutput}/`) && existsSync(candidate) && statSync(candidate).isFile() ? candidate : undefined;
};

const serveFile = (response, file) => {
  response.writeHead(200, {
    'cache-control': 'no-store',
    'content-type': contentTypes.get(extname(file)) ?? 'application/octet-stream',
  });
  createReadStream(file).pipe(response);
};

const appServer = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', origin);
  if (url.pathname === '/__harness') {
    response.writeHead(200, { 'cache-control': 'no-store', 'content-type': 'text/html' });
    response.end(driver);
    return;
  }
  if (url.pathname === '/__fixture') {
    serveFile(response, join(fixtureOutput, 'index.html'));
    return;
  }
  if (url.pathname.startsWith('/__fixture-assets/')) {
    const file = fixtureFileFor(url.pathname);
    if (file === undefined) {
      json(response, 404, { unavailable: url.pathname });
      return;
    }
    serveFile(response, file);
    return;
  }
  if (url.pathname === '/__network-probe') {
    json(response, 200, { online: true });
    return;
  }
  if (url.pathname === '/__control') {
    const field = url.searchParams.get('until');
    const atLeast = Number(url.searchParams.get('atLeast') ?? '0');
    const count = field === null ? undefined : observedCount(field);
    if (field !== null && count !== undefined && count < atLeast) {
      controlWaiters.push({ atLeast, field, response });
      return;
    }
    json(response, 200, state);
    return;
  }
  if (url.pathname === '/api/operateurs' || url.pathname === '/api/atelier/suivis') {
    state.referenceRequests += 1;
    recordEvidence();
    const content = url.pathname === '/api/operateurs' ? [operator] : [workshopItem];
    json(response, 200, { content, currentPage: 0, pageSize: 100, totalElementsCount: content.length });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/atelier/journees') {
    const body = JSON.parse(await readBody(request));
    state.pushes.push({ authorization: request.headers.authorization, body });
    recordEvidence();
    json(response, 200, {});
    return;
  }
  if (serviceWorker === 'disabled' && ['/ngsw-worker.js', '/ngsw.json'].includes(url.pathname)) {
    json(response, 404, { unavailable: url.pathname });
    return;
  }
  const file = staticFileFor(url.pathname);
  if (file === undefined) {
    json(response, 404, { unavailable: url.pathname });
    return;
  }
  serveFile(response, file);
});

const authServer = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${authPort}`);
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'cache-control': 'no-store', ...allowFixtureOrigin });
    response.end();
    return;
  }
  if (url.pathname === '/__network-probe') {
    json(response, 200, { online: true }, allowFixtureOrigin);
    return;
  }
  if (request.method === 'POST' && url.pathname.endsWith('/auth/device')) {
    state.authorizationRequests += 1;
    recordEvidence();
    await readBody(request);
    json(response, 200, { device_code: 'production-offline-device', interval: 0 }, allowFixtureOrigin);
    return;
  }
  if (request.method === 'POST' && url.pathname.endsWith('/token')) {
    state.tokenRequests += 1;
    recordEvidence();
    await readBody(request);
    json(response, 200, { access_token: accessToken, refresh_token: 'production-offline-refresh', expires_in: 3600 }, allowFixtureOrigin);
    return;
  }
  json(response, 404, { unavailable: url.pathname }, allowFixtureOrigin);
});

const listen = (server, port) => new Promise(resolveListening => server.listen(port, '127.0.0.1', resolveListening));

const close = server => new Promise(resolveClosed => server.close(resolveClosed));

const stop = async signal => {
  writeEvidence(signal);
  controlWaiters.splice(0).forEach(waiter => json(waiter.response, 503, { stopped: true }));
  await Promise.all([close(appServer), close(authServer)]);
};

if (!existsSync(join(output, 'index.html'))) {
  throw new Error(`Production pupitre not found in ${output}`);
}
if (!existsSync(join(fixtureOutput, 'index.html'))) {
  throw new Error(`Production fixture not found in ${fixtureOutput}`);
}

await listen(authServer, authPort);
await listen(appServer, appPort);
writeEvidence('running');
console.log(`Production pupitre fixture ready at ${origin} (${serviceWorker})`);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => void stop(signal));
}
