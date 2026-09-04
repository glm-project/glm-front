import { obligatoire } from './obligatoire';

const UN_IDENTIFIANT = '4b136b1';

describe('obligatoire', () => {
  it('should hand over the value the server filled in', () => {
    const valeur = obligatoire(UN_IDENTIFIANT, 'suivi.id');

    thenItHandedOver(valeur, UN_IDENTIFIANT);
  });

  it('should refuse a value the server left out, naming the field the domain needs', () => {
    thenItRefuses(() => obligatoire(undefined, 'suivi.id'), 'suivi.id');
  });

  const thenItHandedOver = (valeur: string, attendue: string): void => {
    expect(valeur).toBe(attendue);
  };

  const thenItRefuses = (lecture: () => unknown, champ: string): void => {
    expect(lecture).toThrow(champ);
  };
});
