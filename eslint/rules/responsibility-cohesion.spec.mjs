import { ESLint, RuleTester } from 'eslint';
import assert from 'node:assert/strict';
import { it } from 'node:test';
import typescript from 'typescript-eslint';
import { responsibilityCohesion } from './responsibility-cohesion.mjs';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: typescript.parser,
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  },
});

ruleTester.run('responsibility-cohesion', responsibilityCohesion, {
  valid: [
    {
      name: 'offline coordinator after extracting an independent responsibility',
      code: `
        class OfflinePupitre {
          private readonly authentication = inject(AuthenticationPort);
          private readonly synchronization = inject(Synchronization);
          private readonly localAcceptance = inject(LocalAcceptance);
          private readonly scheduler = inject(SchedulerPort);
          private readonly designation = signal(Designation.empty());
          private closure: Promise<void> | undefined;

          restore(): void {}
          synchronize(): void {}
          openWindow(): void {}
          closeWindow(): void {}
          execute(): void {}
          private publish(): void {}
        }
      `,
    },
    {
      name: 'cohesive coordinator with a narrow public contract',
      code: `
        class Coordinator {
          private readonly first = inject(FirstPort);
          private readonly second = inject(SecondPort);
          private readonly third = inject(ThirdPort);
          private readonly fourth = inject(FourthPort);
          private readonly selection = signal<string | undefined>(undefined);
          private readonly loading = signal(false);
          private failure: Error | undefined;

          start(): void {}
          finish(): void {}
          private publish(): void {}
          private recover(): void {}
          private observe(): void {}
          private reset(): void {}
        }
      `,
    },
    {
      name: 'rich domain object without injected collaborators',
      code: `
        class Order {
          private state = 'open';
          private accepted = signal(false);
          private failure: Error | undefined;

          open(): void {}
          accept(): void {}
          reject(): void {}
          cancel(): void {}
          archive(): void {}
          restore(): void {}
          retry(): void {}
        }
      `,
    },
    {
      name: 'stateless facade with a broad forwarding surface',
      code: `
        class Facade {
          private readonly first = inject(FirstPort);
          private readonly second = inject(SecondPort);
          private readonly third = inject(ThirdPort);
          private readonly fourth = inject(FourthPort);

          firstOperation(): void {}
          secondOperation(): void {}
          thirdOperation(): void {}
          fourthOperation(): void {}
          fifthOperation(): void {}
          sixthOperation(): void {}
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'stateful coordinator accumulating collaborators and public operations',
      code: `
        class OfflineConsole {
          private readonly authentication = inject(AuthenticationPort);
          private readonly journal = inject(JournalPort);
          private readonly synchronization = inject(Synchronization);
          private readonly scheduler = inject(SchedulerPort);
          private readonly view = signal(View.empty());
          private readonly connected = signal(true);
          private closure: Promise<void> | undefined;

          restore(): void {}
          synchronize(): void {}
          openWindow(): void {}
          closeWindow(): void {}
          execute(): void {}
          diagnostics(): void {}
        }
      `,
      errors: [
        {
          messageId: 'splitResponsibilities',
          data: { className: 'OfflineConsole', collaborators: 4, operations: 6, states: 3 },
        },
      ],
    },
    {
      name: 'dependency injection nested in a collaborator initializer',
      code: `
        class Authentication {
          private readonly transport = new HttpClient(inject(HttpBackend));
          private readonly storage = inject(StoragePort);
          private readonly server = inject(ServerConfiguration);
          private readonly clock = inject(Clock);
          private readonly session = signal<Session | undefined>(undefined);
          private readonly authorizing = signal(false);
          private error: Error | undefined;

          enroll(): void {}
          token(): void {}
          refresh(): void {}
          revoke(): void {}
          restore(): void {}
          synchronize(): void {}
        }
      `,
      errors: [
        {
          messageId: 'splitResponsibilities',
          data: { className: 'Authentication', collaborators: 4, operations: 6, states: 3 },
        },
      ],
    },
  ],
});

const eslint = new ESLint();

it('should apply responsibility cohesion to production classes only', async () => {
  const productionConfig = await eslint.calculateConfigForFile('src/main/webapp/pupitre/contexts/atelier/application/OfflinePupitre.ts');
  const productionSpecConfig = await eslint.calculateConfigForFile(
    'src/main/webapp/pupitre/contexts/atelier/application/OfflinePupitre.spec.ts',
  );
  const testFixtureConfig = await eslint.calculateConfigForFile('src/test/webapp/unit/fixtures/ResponsibilityFixture.ts');

  assert.deepEqual(productionConfig.rules['local/responsibility-cohesion'], [2]);
  assert.equal(productionSpecConfig.rules['local/responsibility-cohesion'], undefined);
  assert.equal(testFixtureConfig.rules['local/responsibility-cohesion'], undefined);
});
