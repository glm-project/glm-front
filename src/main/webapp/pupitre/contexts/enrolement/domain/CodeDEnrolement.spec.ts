import { CodeDEnrolement, VueDuCodeDEnrolement } from './CodeDEnrolement';

const USER_CODE = 'WDJB-MJHT';
const VERIFICATION_URI = 'http://keycloak.test/realms/glm/device';
const LIEN_COMPLET = `${VERIFICATION_URI}?user_code=${USER_CODE}&session=42`;
const MAINTENANT = 1_700_000_000_000;
const UNE_MINUTE = 60_000;

describe('CodeDEnrolement', () => {
  it('should scan the complete link the authorization server issued', () => {
    const code = givenACodeReachableBy(LIEN_COMPLET);

    const vue = whenProjectingAt(code, MAINTENANT);

    thenTheValidationLinkIs(vue, LIEN_COMPLET);
  });

  it('should build the validation link from the verification URI when the server issued none', () => {
    const code = givenACodeReachableBy(undefined);

    const vue = whenProjectingAt(code, MAINTENANT);

    thenTheValidationLinkIs(vue, `${VERIFICATION_URI}?user_code=${USER_CODE}`);
  });

  it('should show the code exactly as issued, with the address to type it on', () => {
    const code = givenACodeExpiringIn(UNE_MINUTE);

    const vue = whenProjectingAt(code, MAINTENANT);

    thenTheCodeToTypeIs(vue, USER_CODE, VERIFICATION_URI);
  });

  it.each([
    ['a full minute ahead', 0, 60],
    ['the last started second', 59_400, 1],
    ['nothing once the deadline is reached', UNE_MINUTE, 0],
    ['nothing once the deadline is behind', UNE_MINUTE + 5_000, 0],
  ])('should count %s', (_situation, elapsed, expected) => {
    const code = givenACodeExpiringIn(UNE_MINUTE);

    const vue = whenProjectingAt(code, MAINTENANT + elapsed);

    thenSecondsLeftAre(vue, expected);
  });

  it.each([
    ['still valid one millisecond before its deadline', UNE_MINUTE - 1, false],
    ['expired the millisecond its deadline is reached', UNE_MINUTE, true],
    ['expired long after its deadline', UNE_MINUTE * 2, true],
  ])('should be %s', (_situation, elapsed, expected) => {
    const code = givenACodeExpiringIn(UNE_MINUTE);

    const expire = whenAskingIfItExpiredAt(code, MAINTENANT + elapsed);

    thenItHasExpired(expire, expected);
  });
});

const givenACodeReachableBy = (lienComplet: string | undefined): CodeDEnrolement =>
  new CodeDEnrolement(USER_CODE, VERIFICATION_URI, lienComplet, MAINTENANT + UNE_MINUTE);

const givenACodeExpiringIn = (duree: number): CodeDEnrolement =>
  new CodeDEnrolement(USER_CODE, VERIFICATION_URI, undefined, MAINTENANT + duree);

const whenProjectingAt = (code: CodeDEnrolement, maintenant: number): VueDuCodeDEnrolement => code.snapshot(maintenant);

const whenAskingIfItExpiredAt = (code: CodeDEnrolement, maintenant: number): boolean => code.aExpire(maintenant);

const thenTheValidationLinkIs = (vue: VueDuCodeDEnrolement, lien: string): void => {
  expect(vue.lienDeValidation).toBe(lien);
};

const thenTheCodeToTypeIs = (vue: VueDuCodeDEnrolement, userCode: string, verificationUri: string): void => {
  expect(vue.userCode).toBe(userCode);
  expect(vue.verificationUri).toBe(verificationUri);
};

const thenSecondsLeftAre = (vue: VueDuCodeDEnrolement, secondes: number): void => {
  expect(vue.secondesRestantes).toBe(secondes);
};

const thenItHasExpired = (expire: boolean, expected: boolean): void => {
  expect(expire).toBe(expected);
};
