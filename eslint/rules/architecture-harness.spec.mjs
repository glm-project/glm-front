import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { inspectArchitecture } from './architecture-harness.mjs';

const fixtureDirectories = [];

afterEach(() => {
  for (const directory of fixtureDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('architecture boundary discovery', () => {
  it('should accept declared boundaries and the generated API exception', () => {
    const fixture = givenArchitectureFixture({
      'src/main/webapp/app/generated/schema.ts': 'export interface WireModel { readonly id: string; }',
      'src/main/webapp/pupitre/contexts/atelier/domain/Rule.ts': 'export class Rule {}',
    });

    const violations = whenInspectingArchitecture(fixture);

    thenNoViolationIsFound(violations);
  });

  it('should reject a business context without a package declaration', () => {
    const fixture = givenArchitectureFixture({
      'src/main/webapp/gestion/contexts/oubli/domain/Rule.ts': 'export class Rule {}',
    });

    const violations = whenInspectingArchitecture(fixture);

    thenViolationIsFound(violations, 'undeclared-boundary', 'gestion/contexts/oubli');
  });

  it('should reject a declaration inheriting from a lookalike marker', () => {
    const fixture = givenArchitectureFixture({
      'src/main/webapp/app/MyBusinessContext.ts': 'export abstract class MyBusinessContext {}',
      'src/main/webapp/gestion/contexts/imposteur/package-info.ts':
        "import { MyBusinessContext } from '@/app/MyBusinessContext';\nexport class PackageInfo extends MyBusinessContext {}",
    });

    const violations = whenInspectingArchitecture(fixture);

    thenViolationIsFound(violations, 'undeclared-boundary', 'gestion/contexts/imposteur');
  });

  it('should reject a TypeScript file directly inside a boundary namespace', () => {
    const fixture = givenArchitectureFixture({
      'src/main/webapp/app/shared/Loose.ts': 'export class Loose {}',
    });

    const violations = whenInspectingArchitecture(fixture);

    thenViolationIsFound(violations, 'unowned-boundary-file', 'app/shared/Loose.ts');
  });
});

describe('architecture dependencies', () => {
  it('should accept a secondary adapter calling another context through a primary TypeScript adapter', () => {
    const fixture = givenArchitectureFixture({
      'src/main/webapp/pupitre/contexts/vente/package-info.ts': businessPackageInfo(),
      'src/main/webapp/pupitre/contexts/vente/domain/Vente.ts': 'export class Vente {}',
      'src/main/webapp/pupitre/contexts/vente/infrastructure/primary/TypeScriptVente.ts': 'export class TypeScriptVente {}',
      'src/main/webapp/pupitre/contexts/atelier/infrastructure/secondary/VenteAdapter.ts':
        "import { TypeScriptVente } from '@/pupitre/contexts/vente/infrastructure/primary/TypeScriptVente';\n"
        + "import { Atelier } from '../../domain/Atelier';\n"
        + 'export class VenteAdapter { constructor(readonly vente: TypeScriptVente, readonly atelier: Atelier) {} }',
    });

    const violations = whenInspectingArchitecture(fixture);

    thenNoViolationIsFound(violations);
  });

  it('should reject direct imports and re-exports from domain to infrastructure', () => {
    const fixture = givenArchitectureFixture({
      'src/main/webapp/pupitre/contexts/atelier/domain/Direct.ts':
        "import { Secondary } from '../infrastructure/secondary/Secondary';\nexport class Direct extends Secondary {}",
      'src/main/webapp/pupitre/contexts/atelier/domain/Reexport.ts': "export { Secondary } from '../infrastructure/secondary/Secondary';",
      'src/main/webapp/pupitre/contexts/atelier/infrastructure/secondary/Secondary.ts': 'export class Secondary {}',
    });

    const violations = whenInspectingArchitecture(fixture);

    thenViolationIsFound(violations, 'domain-outside', 'pupitre/contexts/atelier/domain/Direct.ts');
    thenViolationIsFound(violations, 'domain-outside', 'pupitre/contexts/atelier/domain/Reexport.ts');
  });

  it('should reject a forbidden dependency hidden behind a domain barrel', () => {
    const fixture = givenArchitectureFixture({
      'src/main/webapp/pupitre/contexts/atelier/domain/barrel.ts':
        "export { Secondary as HiddenSecondary } from '../infrastructure/secondary/Secondary';",
      'src/main/webapp/pupitre/contexts/atelier/domain/Consumer.ts':
        "import { HiddenSecondary } from './barrel';\nexport class Consumer extends HiddenSecondary {}",
      'src/main/webapp/pupitre/contexts/atelier/infrastructure/secondary/Secondary.ts': 'export class Secondary {}',
    });

    const violations = whenInspectingArchitecture(fixture);

    thenViolationTargets(
      violations,
      'domain-outside',
      'pupitre/contexts/atelier/domain/Consumer.ts',
      'infrastructure/secondary/Secondary.ts',
    );
  });

  it('should reject a secondary-to-own-primary dependency even when the secondary also imports its domain', () => {
    const fixture = givenArchitectureFixture({
      'src/main/webapp/pupitre/contexts/atelier/infrastructure/primary/Screen.ts': 'export class Screen {}',
      'src/main/webapp/pupitre/contexts/atelier/infrastructure/secondary/Loop.ts':
        "import { Atelier } from '../../domain/Atelier';\n"
        + "import { Screen } from '../primary/Screen';\n"
        + 'export class Loop { constructor(readonly atelier: Atelier, readonly screen: Screen) {} }',
    });

    const violations = whenInspectingArchitecture(fixture);

    thenViolationIsFound(violations, 'secondary-to-own-primary', 'pupitre/contexts/atelier/infrastructure/secondary/Loop.ts');
  });
});

describe('production domain ambient access', () => {
  it('should reject network, storage, browser, current-time and random globals including aliases', () => {
    const fixture = givenArchitectureFixture({
      'src/main/webapp/pupitre/contexts/atelier/domain/Ambient.ts': `
        export const network = () => fetch('/api');
        export const socket = () => new WebSocket('/events');
        export const storage = () => localStorage.getItem('key');
        export const browser = () => document.title;
        export const currentDate = () => new Date();
        export const currentTimestamp = () => Date.now();
        export const random = () => Math.random();
        export const identity = () => crypto.randomUUID();
        const request = fetch;
        export const aliasedNetwork = () => request('/aliased');
        const Clock = Date;
        export const aliasedClock = () => new Clock();
        export const globalNetwork = () => globalThis.fetch('/global');
        export const globalClock = () => globalThis.Date.now();
        export const calledDate = () => Date('explicit values are ignored by the Date function');
        export const computedRandom = () => Math['random']();
        const { now } = Date;
        export const destructuredClock = () => now();
        const randomGenerator = Math.random;
        export const aliasedRandom = () => randomGenerator();
      `,
    });

    const violations = whenInspectingArchitecture(fixture);

    thenViolationCodesAreFound(violations, [
      'ambient-browser',
      'ambient-clock',
      'ambient-network',
      'ambient-randomness',
      'ambient-storage',
    ]);
    thenViolationCountIsAtLeast(violations, 'ambient-network', 4);
    thenViolationCountIsAtLeast(violations, 'ambient-clock', 6);
    thenViolationCountIsAtLeast(violations, 'ambient-randomness', 4);
  });

  it('should allow explicit time and identity values, pure date operations and locally shadowed homonyms', () => {
    const fixture = givenArchitectureFixture({
      'src/main/webapp/pupitre/contexts/atelier/domain/Explicit.ts': `
        interface Dependencies {
          fetch: (path: string) => string;
          localStorage: { getItem: (key: string) => string | null };
          Date: { now: () => number };
          Math: { random: () => number };
        }
        export const decide = (now: Date, identity: string, dependencies: Dependencies) => ({
          nextDay: new Date(now.getTime() + 86_400_000),
          parsedDate: Date.parse('2026-09-05T12:00:00Z'),
          utcDate: Date.UTC(2026, 8, 5),
          identity,
          response: dependencies.fetch('/explicit'),
          stored: dependencies.localStorage.getItem('key'),
          localNow: dependencies.Date.now(),
          localRandom: dependencies.Math.random(),
        });
        export const shadowed = (fetch: () => string, Date: { now: () => number }, Math: { random: () => number }) => ({
          response: fetch(),
          now: Date.now(),
          random: Math.random(),
        });
      `,
    });

    const violations = whenInspectingArchitecture(fixture);

    thenNoViolationIsFound(violations);
  });
});

it('should accept the production architecture', () => {
  const violations = whenInspectingArchitecture({ sourceRoot: 'src/main/webapp', tsconfigPath: 'tsconfig.json' });

  thenNoViolationIsFound(violations);
});

const givenArchitectureFixture = files => {
  const directory = mkdtempSync(join(tmpdir(), 'glm-architecture-'));
  fixtureDirectories.push(directory);
  const baseline = {
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        baseUrl: '.',
        lib: ['ES2022', 'DOM'],
        module: 'preserve',
        paths: { '@/*': ['src/main/webapp/*'] },
        strict: true,
        target: 'ES2022',
      },
    }),
    'src/main/webapp/app/BusinessContext.ts': 'export abstract class BusinessContext {}',
    'src/main/webapp/app/SharedKernel.ts': 'export abstract class SharedKernel {}',
    'src/main/webapp/app/shared/technical/package-info.ts': sharedPackageInfo(),
    'src/main/webapp/app/shared/technical/domain/Port.ts': 'export abstract class Port {}',
    'src/main/webapp/pupitre/contexts/atelier/package-info.ts': businessPackageInfo(),
    'src/main/webapp/pupitre/contexts/atelier/domain/Atelier.ts': 'export class Atelier {}',
  };
  for (const [path, content] of Object.entries({ ...baseline, ...files })) writeFixtureFile(directory, path, content);
  return { sourceRoot: join(directory, 'src/main/webapp'), tsconfigPath: join(directory, 'tsconfig.json') };
};

const businessPackageInfo = () =>
  "import { BusinessContext } from '@/app/BusinessContext';\nexport class PackageInfo extends BusinessContext {}";
const sharedPackageInfo = () => "import { SharedKernel } from '@/app/SharedKernel';\nexport class PackageInfo extends SharedKernel {}";

const writeFixtureFile = (directory, path, content) => {
  const absolutePath = join(directory, path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
};

const whenInspectingArchitecture = fixture => inspectArchitecture(fixture);

const thenNoViolationIsFound = violations => assert.deepEqual(violations, []);
const thenViolationIsFound = (violations, code, file) => {
  assert.ok(
    violations.some(violation => violation.code === code && violation.file === file),
    JSON.stringify(violations, null, 2),
  );
};
const thenViolationTargets = (violations, code, file, targetSuffix) => {
  assert.ok(
    violations.some(violation => violation.code === code && violation.file === file && violation.target?.endsWith(targetSuffix)),
    JSON.stringify(violations, null, 2),
  );
};
const thenViolationCodesAreFound = (violations, codes) => {
  const actualCodes = new Set(violations.map(violation => violation.code));
  for (const code of codes) assert.ok(actualCodes.has(code), JSON.stringify(violations, null, 2));
};
const thenViolationCountIsAtLeast = (violations, code, count) => {
  assert.ok(violations.filter(violation => violation.code === code).length >= count, JSON.stringify(violations, null, 2));
};
