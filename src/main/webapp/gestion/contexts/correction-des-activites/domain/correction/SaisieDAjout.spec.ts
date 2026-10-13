import { CategorieDActivite } from '../journee/CategorieDActivite';
import { CategorieDElement } from '../journee/CategorieDElement';
import { ElementDeLaJournee } from '../journee/ElementDeLaJournee';
import { ElementDeLaJourneeId } from '../journee/ElementDeLaJourneeId';
import { InstantDeLaJournee } from '../journee/InstantDeLaJournee';
import { OperateurDeLaJournee } from '../journee/OperateurDeLaJournee';
import { OperateurDeLaJourneeId } from '../journee/OperateurDeLaJourneeId';
import { PosteDeLaJournee } from '../journee/PosteDeLaJournee';
import { PosteDeLaJourneeId } from '../journee/PosteDeLaJourneeId';
import { SuiviDAtelierId } from '../journee/SuiviDAtelierId';
import { SuiviPresent } from '../journee/SuiviPresent';
import { ContenuDAjout } from './ContenuDAjout';
import { IntervalleDAjout } from './IntervalleDAjout';
import { SaisieDAjout } from './SaisieDAjout';

const instant = (recu: string): InstantDeLaJournee => new InstantDeLaJournee(recu);

interface Variation {
  readonly operateur?: string;
  readonly suivi?: string;
  readonly poste?: string;
  readonly categorie?: CategorieDActivite;
  readonly debut?: string;
  readonly fin?: string;
}

const ELEMENT = new ElementDeLaJournee({
  id: new ElementDeLaJourneeId('element-1'),
  categorie: new CategorieDElement('OF'),
  nom: 'PRD-2026-000001',
  reference: '24-131',
  description: 'Pièce 1',
});

const contenu = (variation: Variation = {}): ContenuDAjout => {
  const intervalle = IntervalleDAjout.entre(
    instant(variation.debut ?? '2026-10-05T13:30:00-03:00'),
    instant(variation.fin ?? '2026-10-05T16:45:00-03:00'),
  );
  if (intervalle === undefined) {
    throw new Error('Intervalle semé incohérent');
  }
  return ContenuDAjout.de(
    new OperateurDeLaJournee(new OperateurDeLaJourneeId(variation.operateur ?? 'op-1'), 'Leroy', 'Hugo'),
    new SuiviPresent({
      suivi: new SuiviDAtelierId(variation.suivi ?? 'suivi-1'),
      element: ELEMENT,
      engageLe: instant('2026-10-01T08:00:00-03:00'),
      clotureLe: undefined,
    }),
    new PosteDeLaJournee(new PosteDeLaJourneeId(variation.poste ?? 'tour'), 'Poste', 'Tournage'),
    variation.categorie ?? 'TRAVAIL',
    intervalle,
  );
};

const vue = (saisie: SaisieDAjout): unknown[] => [
  saisie.id,
  saisie.operateur.value,
  saisie.suivi.value,
  saisie.poste.value,
  saisie.categorie,
  saisie.debut.value.toISOString(),
  saisie.fin.value.toISOString(),
];

describe('Entry of the addition of an activity', () => {
  it('should be given the new identifier and carry the operator, the suivi, the workstation, the type and the hours when no entry precedes it', () => {
    const saisie = SaisieDAjout.pour(undefined, contenu(), () => 'saisie-1');

    expect(vue(saisie)).toEqual(['saisie-1', 'op-1', 'suivi-1', 'tour', 'TRAVAIL', '2026-10-05T16:30:00.000Z', '2026-10-05T19:45:00.000Z']);
  });

  it('should keep the identifier when the same activity is sent again, the answer to the first request may be lost', () => {
    const premiere = SaisieDAjout.pour(undefined, contenu(), () => 'saisie-1');

    const renvoi = SaisieDAjout.pour(premiere, contenu(), () => 'saisie-2');

    expect(renvoi.id).toBe('saisie-1');
  });

  it.each([
    { changement: 'operator', variation: { operateur: 'op-2' } },
    { changement: 'suivi', variation: { suivi: 'suivi-2' } },
    { changement: 'workstation', variation: { poste: 'fraise' } },
    { changement: 'type', variation: { categorie: 'NON_CONFORMITE' } },
    { changement: 'start', variation: { debut: '2026-10-05T13:31:00-03:00' } },
    { changement: 'end', variation: { fin: '2026-10-05T16:46:00-03:00' } },
  ] as const)('should give another identifier when the $changement changes', ({ variation }) => {
    const premiere = SaisieDAjout.pour(undefined, contenu(), () => 'saisie-1');

    const autre = SaisieDAjout.pour(premiere, contenu(variation), () => 'saisie-2');

    expect(autre.id).toBe('saisie-2');
  });
});
