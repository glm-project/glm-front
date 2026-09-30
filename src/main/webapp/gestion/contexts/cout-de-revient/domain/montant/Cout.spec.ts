import { Cout } from './Cout';
import { Montant } from './Montant';
import { TotalDeMontant } from './TotalDeMontant';

describe('Cout', () => {
  it('should keep machine and labour apart, and the total the server computed', () => {
    const cout = new Cout(
      TotalDeMontant.complet(new Montant(90)),
      TotalDeMontant.complet(new Montant(40)),
      TotalDeMontant.complet(new Montant(130)),
    );

    expect([cout.machine.snapshot(), cout.mainDOeuvre.snapshot(), cout.total.snapshot()]).toEqual(
      [90, 40, 130].map(value => ({ complete: true, valeur: new Montant(value) })),
    );
  });
});
