import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const configuration = readFileSync(new URL('../mise.toml', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const configuredVersion = tool => {
  const match = configuration.match(new RegExp(`^${tool} = "([^"]+)"$`, 'm'));

  if (match === null) {
    throw new Error(`mise.toml does not pin ${tool} to an exact version`);
  }

  return match[1];
};

const nodeVersion = process.versions.node;
const npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim();
const expectedNodeVersion = configuredVersion('node');
const expectedNpmVersion = configuredVersion('npm');

const assertVersion = (tool, actual, expected) => {
  if (actual !== expected) {
    throw new Error(`${tool} ${actual} is running; mise.toml requires ${expected}`);
  }
};

assertVersion('Node.js', nodeVersion, expectedNodeVersion);
assertVersion('npm', npmVersion, expectedNpmVersion);
assertVersion('package.json engines.node', manifest.engines.node, expectedNodeVersion);
assertVersion('package.json engines.npm', manifest.engines.npm, expectedNpmVersion);
assertVersion('package.json packageManager', manifest.packageManager, `npm@${expectedNpmVersion}`);

process.stdout.write(`Node.js ${nodeVersion} and npm ${npmVersion} match mise.toml\n`);
