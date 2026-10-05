import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { TestBed } from '@angular/core/testing';
import { AnomaliesRightsPort } from '../../domain/dossier/AnomaliesRightsPort';
import { TokenAnomaliesRights } from './TokenAnomaliesRights';

const authenticationFixture = (payload: unknown) => ({
  currentToken: () => `fixture.${btoa(JSON.stringify(payload))}.signature`,
});

const givenSessionFixture = (payload: unknown): void => {
  TestBed.overrideProvider(AuthenticationPort, { useValue: authenticationFixture(payload) });
};

const givenTokenFixture = (token: string | undefined): void => {
  TestBed.overrideProvider(AuthenticationPort, { useValue: { currentToken: () => token } });
};

const whenApplicationRightsAreRead = (): boolean => TestBed.inject(AnomaliesRightsPort).canApply();

describe('AnomaliesRightsPort', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        { provide: AnomaliesRightsPort, useClass: TokenAnomaliesRights },
        { provide: AuthenticationPort, useValue: authenticationFixture({}) },
      ],
    }),
  );

  it('should refuse a session whose token has no gestionnaire role', () => {
    givenSessionFixture({ realm_access: { roles: ['OPERATEUR'] } });

    const droits = whenApplicationRightsAreRead();

    expect(droits).toBe(false);
  });

  it('should allow the gestionnaire realm role issued by the delivered realm', () => {
    givenSessionFixture({ realm_access: { roles: ['ROLE_GESTIONNAIRE'] } });

    const droits = whenApplicationRightsAreRead();

    expect(droits).toBe(true);
  });

  it.each([
    { nom: 'an absent session', token: undefined },
    { nom: 'a token without a payload', token: 'fixture' },
    { nom: 'invalid base64', token: 'fixture.%%%.signature' },
    { nom: 'invalid JSON', token: `fixture.${btoa('{')}.signature` },
  ])('should refuse $nom', ({ token }) => {
    givenTokenFixture(token);

    const droits = whenApplicationRightsAreRead();

    expect(droits).toBe(false);
  });

  it.each([
    { nom: 'null claims', payload: null },
    { nom: 'scalar claims', payload: 1 },
    { nom: 'absent realm roles', payload: {} },
    { nom: 'null realm roles', payload: { realm_access: null } },
    { nom: 'a scalar role', payload: { realm_access: { roles: 'GESTIONNAIRE' } } },
    { nom: 'another clients role', payload: { resource_access: { unrelated: { roles: ['GESTIONNAIRE'] } } } },
    { nom: 'another case', payload: { realm_access: { roles: ['gestionnaire'] } } },
  ])('should refuse $nom instead of granting an implicit permission', ({ payload }) => {
    givenSessionFixture(payload);

    const droits = whenApplicationRightsAreRead();

    expect(droits).toBe(false);
  });
});
