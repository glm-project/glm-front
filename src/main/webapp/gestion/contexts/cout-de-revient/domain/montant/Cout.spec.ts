import { Cout } from './Cout';
import { Montant } from './Montant';

describe('Cout', () => {
  it('should keep machine and labour apart, and the total the server computed', () => {
    const cout = new Cout(new Montant(90), new Montant(40), new Montant(130));

    expect([cout.machine.euros, cout.mainDOeuvre.euros, cout.total.euros]).toEqual([90, 40, 130]);
  });
});
