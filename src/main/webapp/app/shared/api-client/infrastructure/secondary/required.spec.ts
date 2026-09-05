import { required } from './required';

const UN_IDENTIFIANT = '4b136b1';

describe('required', () => {
  it('should hand over the value the server filled in', () => {
    const valeur = whenReadingARequiredValue(UN_IDENTIFIANT, 'suivi.id');

    thenItHandedOver(valeur, UN_IDENTIFIANT);
  });

  it('should refuse a value the server left out, naming the field the domain needs', () => {
    thenItRefuses(() => required(undefined, 'suivi.id'), 'suivi.id');
  });

  const whenReadingARequiredValue = (value: string | undefined, field: string): string => required(value, field);

  const thenItHandedOver = (valeur: string, attendue: string): void => {
    expect(valeur).toBe(attendue);
  };

  const thenItRefuses = (lecture: () => unknown, champ: string): void => {
    expect(lecture).toThrow(champ);
  };
});
