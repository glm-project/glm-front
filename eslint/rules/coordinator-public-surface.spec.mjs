import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { inspectCoordinatorPublicSurface } from './coordinator-public-surface.mjs';

const fixtureDirectories = [];

after(() => {
  for (const directory of fixtureDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }
});

const writeFixtureFile = (directory, path, content) => {
  const absolutePath = join(directory, path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
};

const givenCoordinatorFixture = files => {
  const directory = mkdtempSync(join(tmpdir(), 'glm-coordinator-'));
  fixtureDirectories.push(directory);
  for (const [path, content] of Object.entries(files)) {
    writeFixtureFile(directory, path, content);
  }
  return {
    sourceRoot: join(directory, 'src/main/webapp'),
    searchRoots: [join(directory, 'src/main/webapp'), join(directory, 'src/test/webapp')],
  };
};

describe('coordinator public surface inspection', () => {
  it('should detect unreferenced public members in application coordinators', () => {
    const fixture = givenCoordinatorFixture({
      'src/main/webapp/pupitre/contexts/atelier/application/AtelierCoordinator.ts': `
        export class AtelierCoordinator {
          readonly usedProperty = 'used';
          readonly unusedProperty = 'unused';
          unusedMethod(): void {}
        }
      `,
      'src/main/webapp/pupitre/contexts/atelier/infrastructure/primary/page.ts': `
        import { AtelierCoordinator } from '../application/AtelierCoordinator';
        const coordinator = new AtelierCoordinator();
        console.log(coordinator.usedProperty);
      `,
    });

    const violations = inspectCoordinatorPublicSurface(fixture);

    assert.equal(violations.length, 2);
    assert.deepEqual(
      violations.map(v => v.member),
      ['unusedMethod', 'unusedProperty'],
    );
  });

  it('should accept public members referenced in templates or specs', () => {
    const fixture = givenCoordinatorFixture({
      'src/main/webapp/pupitre/contexts/atelier/application/AtelierCoordinator.ts': `
        export class AtelierCoordinator {
          readonly templateProperty = 'template';
          readonly specProperty = 'spec';
        }
      `,
      'src/main/webapp/pupitre/contexts/atelier/infrastructure/primary/page.html': `
        <div>{{ coordinator.templateProperty }}</div>
      `,
      'src/test/webapp/pupitre/contexts/atelier/application/AtelierCoordinator.spec.ts': `
        coordinator.specProperty;
      `,
    });

    const violations = inspectCoordinatorPublicSurface(fixture);

    assert.deepEqual(violations, []);
  });

  it('should ignore private and protected members', () => {
    const fixture = givenCoordinatorFixture({
      'src/main/webapp/pupitre/contexts/atelier/application/AtelierCoordinator.ts': `
        export class AtelierCoordinator {
          private readonly privateField = 'private';
          protected readonly protectedField = 'protected';
          #nativePrivate = 'native';
          private privateMethod(): void {}
        }
      `,
    });

    const violations = inspectCoordinatorPublicSurface(fixture);

    assert.deepEqual(violations, []);
  });
});

it('should have no unused public members in production application classes', () => {
  const violations = inspectCoordinatorPublicSurface({
    sourceRoot: 'src/main/webapp',
    searchRoots: ['src/main/webapp', 'src/test/webapp'],
  });

  assert.deepEqual(violations, []);
});
