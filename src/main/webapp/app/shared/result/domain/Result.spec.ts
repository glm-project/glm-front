import { err, ok, Result } from './Result';

describe('Result', () => {
  it('should return a successful value distinguishable from a refusal', () => {
    const result: Result<string, Error> = ok('Tour 1');

    expect(result).toEqual({ ok: true, value: 'Tour 1' });
  });

  it('should return a refusal distinguishable from a successful value', () => {
    const refusal = new Error('Libellé déjà utilisé');

    const result: Result<string, Error> = err(refusal);

    expect(result).toEqual({ ok: false, error: refusal });
  });
});
