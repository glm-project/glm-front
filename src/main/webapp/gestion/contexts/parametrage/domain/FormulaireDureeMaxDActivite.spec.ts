import { DureeMaxDActivite } from './DureeMaxDActivite';
import { FormulaireDureeMaxDActivite } from './FormulaireDureeMaxDActivite';

describe('FormulaireDureeMaxDActivite', () => {
  it('should start from the duration the company set', () => {
    const formulaire = FormulaireDureeMaxDActivite.depuis(new DureeMaxDActivite(13));

    expect(formulaire.saisie).toBe('13');
    expect(formulaire.erreur()).toBeUndefined();
  });

  it('should produce the typed duration, spaces around it ignored', () => {
    const formulaire = FormulaireDureeMaxDActivite.vide().avecSaisie(' 10 ');

    expect(formulaire.produireDuree()).toEqual({ ok: true, value: new DureeMaxDActivite(10) });
  });

  it.each([
    ['', 'Saisissez un nombre entier d’heures.'],
    ['dix', 'Saisissez un nombre entier d’heures.'],
    ['10,5', 'Saisissez un nombre entier d’heures.'],
    ['-2', 'Saisissez un nombre entier d’heures.'],
    ['0', 'La durée doit être d’au moins 1 h.'],
    ['25', 'La durée ne peut pas dépasser 24 h.'],
  ])('should refuse the typing %p', (saisie, message) => {
    const formulaire = FormulaireDureeMaxDActivite.vide().avecSaisie(saisie);

    expect(formulaire.erreur()).toBe(message);
    expect(formulaire.produireDuree()).toEqual({ ok: false, error: message });
  });

  it('should keep the raw typing', () => {
    const formulaire = FormulaireDureeMaxDActivite.vide().avecSaisie('1x');

    expect(formulaire.saisie).toBe('1x');
  });
});
