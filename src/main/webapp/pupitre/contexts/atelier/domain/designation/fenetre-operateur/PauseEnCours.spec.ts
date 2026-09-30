import {
  ActiviteDuPupitre,
  EvenementDuJournal,
  GesteDePointage,
  JournalDuPupitre,
  ReferentielDuPupitre,
  SuiviDuPupitre,
} from '../../journal-du-pupitre/JournalDuPupitre';
import { ActiviteSuspendue, PauseEnCours } from './PauseEnCours';

const travailAuTourFixture: ActiviteDuPupitre = {
  ouverture: 'activite-fixture-10',
  echeance: '2026-09-05T21:00:00.000Z',
  operateurId: 'jean',
  categorie: 'TRAVAIL',
  depuis: '2026-09-05T08:00:00Z',
  posteId: 'tour',
};
const suiviFixture = (id: string, activites: readonly ActiviteDuPupitre[]): SuiviDuPupitre => ({
  conflits: [],
  id,
  nom: id,
  etat: activites.length === 0 ? 'EN_ATTENTE' : 'EN_COURS',
  type: 'ORDRE_DE_FABRICATION',
  activites,
  evenements: [],
});
const referentielFixture: ReferentielDuPupitre = {
  operateurs: [
    {
      id: 'jean',
      nom: 'Dupont',
      prenom: 'Jean',
      matricule: '049',
      postes: [
        { id: 'tour', libelle: 'Tour' },
        { id: 'fraiseuse', libelle: 'Fraiseuse' },
      ],
    },
  ],
  suivis: [suiviFixture('of-204', [travailAuTourFixture])],
};
const suspensionFixture = (
  suiviId: string,
  extra: Partial<Omit<Extract<GesteDePointage, { readonly intention: 'FIN' }>, 'intention' | 'type'>>,
  pause = 'pause-de-midi',
): GesteDePointage => ({
  id: `fin-${suiviId}-${pause}`,
  dateDeSurvenue: '2026-09-05T12:00:00Z',
  nature: 'POINTAGE',
  operateurId: 'jean',
  suiviId,
  type: 'FIN',
  suspension: { pause, reouverture: 'DEBUT' },
  ...extra,
  intention: 'FIN',
  cible: suiviId === 'of-205' ? 'activite-fixture-12' : 'activite-fixture-10',
});

const nonConformiteFixture: ActiviteDuPupitre = {
  ouverture: 'activite-fixture-12',
  echeance: '2026-09-05T22:00:00.000Z',
  operateurId: 'jean',
  categorie: 'NON_CONFORMITE',
  depuis: '2026-09-05T09:00:00Z',
};
const pauseDeMidiFixture: readonly GesteDePointage[] = [
  suspensionFixture('of-204', { posteId: 'tour' }),
  suspensionFixture('of-205', { suspension: { pause: 'pause-de-midi', reouverture: 'NON_CONFORMITE' } }),
];

describe('PauseEnCours', () => {
  it('should reopen the activity suspended by the operator’s last pause', () => {
    const journal = givenJournal(referentielFixture, pending(suspensionFixture('of-204', { posteId: 'tour' })));

    const pause = whenReadingThePauseOf(journal, 'jean');

    thenActivitiesToReopenAre(pause, [{ suiviId: 'of-204', posteId: 'tour', reouverture: 'DEBUT' }]);
  });

  it('should find no pause for an operator who never paused on this pupitre', () => {
    const journal = givenJournal(referentielFixture, []);

    const pause = whenReadingThePauseOf(journal, 'jean');

    thenThereIsNoPause(pause);
  });

  it('should reopen each activity of the pause on its workstation and in its category', () => {
    const referentiel = withSuivis(referentielFixture, [
      suiviFixture('of-204', [travailAuTourFixture]),
      suiviFixture('of-205', [nonConformiteFixture]),
    ]);
    const journal = givenJournal(referentiel, pending(...pauseDeMidiFixture));

    const pause = whenReadingThePauseOf(journal, 'jean');

    thenActivitiesToReopenAre(pause, [
      { suiviId: 'of-204', posteId: 'tour', reouverture: 'DEBUT' },
      { suiviId: 'of-205', reouverture: 'NON_CONFORMITE' },
    ]);
  });

  it('should reopen only the last pause of the operator', () => {
    const referentiel = withSuivis(referentielFixture, [...referentielFixture.suivis, suiviFixture('of-206', [])]);
    const pauseDuMatin = suspensionFixture('of-206', {}, 'pause-du-matin');
    const journal = givenJournal(referentiel, [...accepted(pauseDuMatin), ...pending(suspensionFixture('of-204', { posteId: 'tour' }))]);

    const pause = whenReadingThePauseOf(journal, 'jean');

    thenActivitiesToReopenAre(pause, [{ suiviId: 'of-204', posteId: 'tour', reouverture: 'DEBUT' }]);
  });

  it('should end the pause at a gesture of the operator appended after it, even refused', () => {
    const referentiel = withSuivis(referentielFixture, [...referentielFixture.suivis, suiviFixture('of-206', [])]);
    const journal = givenJournal(referentiel, [...pending(...pauseDeMidiFixture), ...refused(debutFixture('of-206'))]);

    const pause = whenReadingThePauseOf(journal, 'jean');

    thenThereIsNoPause(pause);
  });

  it('should keep the pause when another operator gestures after it', () => {
    const referentiel = withSuivis(referentielFixture, [
      ...referentielFixture.suivis,
      suiviFixture('of-205', [nonConformiteFixture]),
      suiviFixture('of-206', []),
    ]);
    const journal = givenJournal(referentiel, [
      ...pending(...pauseDeMidiFixture),
      ...pending({ ...debutFixture('of-206'), operateurId: 'marie' }),
    ]);

    const pause = whenReadingThePauseOf(journal, 'jean');

    thenActivitiesToReopenAre(pause, [
      { suiviId: 'of-204', posteId: 'tour', reouverture: 'DEBUT' },
      { suiviId: 'of-205', reouverture: 'NON_CONFORMITE' },
    ]);
  });

  it('should end the pause once the referential shows an activity of the operator opened on another pupitre', () => {
    const referentiel = withSuivis(referentielFixture, [
      suiviFixture('of-204', []),
      suiviFixture('of-205', []),
      suiviFixture('of-206', [travailAuTourFixture]),
    ]);
    const journal = givenJournal(referentiel, accepted(...pauseDeMidiFixture));

    const pause = whenReadingThePauseOf(journal, 'jean');

    thenThereIsNoPause(pause);
  });

  it('should end the pause once a suspended activity is itself reopened on another pupitre', () => {
    const referentiel = withSuivis(referentielFixture, [
      { ...suiviFixture('of-204', [travailAuTourFixture]), evenements: ['fin-of-204-pause-de-midi'] },
      suiviFixture('of-205', [nonConformiteFixture]),
    ]);
    const journal = givenJournal(referentiel, [
      ...accepted(requiredFixture(pauseDeMidiFixture[0])),
      ...pending(requiredFixture(pauseDeMidiFixture[1])),
    ]);

    const pause = whenReadingThePauseOf(journal, 'jean');

    thenThereIsNoPause(pause);
  });

  it.each<[string, ActiviteDuPupitre, string]>([
    ['another element on the same workstation', travailAuTourFixture, 'of-206'],
    ['another workstation of the same element', { ...travailAuTourFixture, posteId: 'fraiseuse' }, 'of-204'],
  ])('should end the pause when the operator works on %s than an activity whose suspension was refused', (_name, activite, suiviId) => {
    const [travail, nonConformite] = pauseDeMidiFixture;
    const referentiel = withSuivis(referentielFixture, [
      suiviFixture('of-204', [travailAuTourFixture]),
      suiviFixture('of-205', [nonConformiteFixture]),
      suiviFixture('of-206', []),
    ]);
    const journal = givenJournal(withActivity(referentiel, suiviId, activite), [
      ...refused(requiredFixture(travail)),
      ...pending(requiredFixture(nonConformite)),
    ]);

    const pause = whenReadingThePauseOf(journal, 'jean');

    thenThereIsNoPause(pause);
  });

  it('should not reopen an activity whose suspension was refused', () => {
    const [travail, nonConformite] = pauseDeMidiFixture;
    const referentiel = withSuivis(referentielFixture, [suiviFixture('of-204', []), suiviFixture('of-205', [nonConformiteFixture])]);
    const journal = givenJournal(referentiel, [...refused(requiredFixture(travail)), ...pending(requiredFixture(nonConformite))]);

    const pause = whenReadingThePauseOf(journal, 'jean');

    thenActivitiesToReopenAre(pause, [{ suiviId: 'of-205', reouverture: 'NON_CONFORMITE' }]);
  });

  it('should keep the pause while an activity whose suspension was refused stays open', () => {
    const [travail, nonConformite] = pauseDeMidiFixture;
    const referentiel = withSuivis(referentielFixture, [
      suiviFixture('of-204', [travailAuTourFixture]),
      suiviFixture('of-205', [nonConformiteFixture]),
    ]);
    const journal = givenJournal(referentiel, [...refused(requiredFixture(travail)), ...pending(requiredFixture(nonConformite))]);

    const pause = whenReadingThePauseOf(journal, 'jean');

    thenActivitiesToReopenAre(pause, [{ suiviId: 'of-205', reouverture: 'NON_CONFORMITE' }]);
  });

  it('should not reopen an element no longer in the referential', () => {
    const referentiel = withSuivis(referentielFixture, [suiviFixture('of-205', [nonConformiteFixture])]);
    const journal = givenJournal(referentiel, pending(...pauseDeMidiFixture));

    const pause = whenReadingThePauseOf(journal, 'jean');

    thenActivitiesToReopenAre(pause, [{ suiviId: 'of-205', reouverture: 'NON_CONFORMITE' }]);
  });

  it('should not reopen on a workstation the operator no longer holds, even one another operator holds', () => {
    const referentiel = withWorkstationHandedOver(
      withSuivis(referentielFixture, [suiviFixture('of-204', [travailAuTourFixture]), suiviFixture('of-205', [nonConformiteFixture])]),
    );
    const journal = givenJournal(referentiel, pending(...pauseDeMidiFixture));

    const pause = whenReadingThePauseOf(journal, 'jean');

    thenActivitiesToReopenAre(pause, [{ suiviId: 'of-205', reouverture: 'NON_CONFORMITE' }]);
  });

  it('should not reopen an activity already open again on the same element and workstation', () => {
    const suspensionAcceptee = suspensionFixture('of-204', { id: 'fin-acceptee', posteId: 'tour' });
    const suspensionRefusee = suspensionFixture('of-204', { id: 'fin-refusee', posteId: 'tour' });
    const referentiel = withSuivis(referentielFixture, [
      { ...suiviFixture('of-204', [travailAuTourFixture]), evenements: ['fin-acceptee'] },
      suiviFixture('of-205', [nonConformiteFixture]),
    ]);
    const journal = givenJournal(referentiel, [
      ...accepted(suspensionAcceptee),
      ...refused(suspensionRefusee),
      ...pending(requiredFixture(pauseDeMidiFixture[1])),
    ]);

    const pause = whenReadingThePauseOf(journal, 'jean');

    thenActivitiesToReopenAre(pause, [{ suiviId: 'of-205', reouverture: 'NON_CONFORMITE' }]);
  });

  it('should find no pause in progress once nothing suspended remains to reopen', () => {
    const referentiel = withSuivis(referentielFixture, [suiviFixture('of-206', [])]);
    const journal = givenJournal(referentiel, pending(...pauseDeMidiFixture));

    const pause = whenReadingThePauseOf(journal, 'jean');

    thenThereIsNoPause(pause);
  });

  it('should not resume a suspension diagnosed as a conflict by the canonical reference', () => {
    const suspension = suspensionFixture('of-204', { posteId: 'tour' });
    const referentiel = withSuivis(referentielFixture, [
      {
        ...suiviFixture('of-204', []),
        evenements: [suspension.id],
        conflits: [{ operateurId: 'jean', activites: [], pointages: [suspension.id] }],
      },
    ]);
    const journal = givenJournal(referentiel, accepted(suspension));

    const pause = whenReadingThePauseOf(journal, 'jean');

    thenThereIsNoPause(pause);
  });

  it.each(['expired', 'conflicting'])('should preserve resumption when another known activity is %s', kind => {
    const suspension = suspensionFixture('of-204', { posteId: 'tour' });
    const otherActivity = {
      ...travailAuTourFixture,
      ouverture: 'autre-ouverture',
      echeance: kind === 'expired' ? '2026-09-05T12:00:00Z' : travailAuTourFixture.echeance,
    };
    const referentiel = withSuivis(referentielFixture, [
      { ...suiviFixture('of-204', []), evenements: [suspension.id] },
      {
        ...suiviFixture('of-206', [otherActivity]),
        conflits: kind === 'conflicting' ? [{ operateurId: 'jean', activites: [otherActivity.ouverture], pointages: ['autre-fin'] }] : [],
      },
    ]);
    const journal = givenJournal(referentiel, accepted(suspension));

    const pause = whenReadingThePauseOf(journal, 'jean');

    thenActivitiesToReopenAre(pause, [{ suiviId: 'of-204', posteId: 'tour', reouverture: 'DEBUT' }]);
  });

  it('should find no pause in progress without a referential', () => {
    const journal: JournalDuPupitre = { evenements: pending(...pauseDeMidiFixture), connecte: true };

    const pause = whenReadingThePauseOf(journal, 'jean');

    thenThereIsNoPause(pause);
  });

  const givenJournal = (referentiel: ReferentielDuPupitre, evenements: readonly EvenementDuJournal[]): JournalDuPupitre => ({
    referentiel,
    evenements,
    connecte: true,
  });
  const whenReadingThePauseOf = (journal: JournalDuPupitre, operateurId: string): PauseEnCours | undefined =>
    PauseEnCours.of(journal, operateurId, Date.parse('2026-09-05T12:00:00Z'));
  const thenActivitiesToReopenAre = (pause: PauseEnCours | undefined, expected: readonly ActiviteSuspendue[]): void => {
    expect(pause?.activitesARouvrir()).toStrictEqual(expected);
  };
  const thenThereIsNoPause = (pause: PauseEnCours | undefined): void => {
    expect(pause).toBeUndefined();
  };
});

const pending = (...gestes: readonly GesteDePointage[]): EvenementDuJournal[] => gestes.map(geste => ({ geste, etat: 'EN_ATTENTE' }));
const withSuivis = (referentiel: ReferentielDuPupitre, suivis: readonly SuiviDuPupitre[]): ReferentielDuPupitre => ({
  ...referentiel,
  suivis,
});
const accepted = (...gestes: readonly GesteDePointage[]): EvenementDuJournal[] => gestes.map(geste => ({ geste, etat: 'ACCEPTE' }));
const refused = (...gestes: readonly GesteDePointage[]): EvenementDuJournal[] =>
  gestes.map(geste => ({ geste, etat: 'REFUSE', refus: { code: 'refus', message: 'Refusé.' } }));
const debutFixture = (suiviId: string): GesteDePointage => ({
  intention: 'OUVERTURE',
  id: `debut-${suiviId}`,
  dateDeSurvenue: '2026-09-05T13:00:00Z',
  nature: 'POINTAGE',
  operateurId: 'jean',
  suiviId,
  type: 'DEBUT',
});
const requiredFixture = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error('Missing pause fixture.');
  return value;
};
const withWorkstationHandedOver = (referentiel: ReferentielDuPupitre): ReferentielDuPupitre => ({
  ...referentiel,
  operateurs: [
    ...referentiel.operateurs.map(operateur => ({ ...operateur, postes: [{ id: 'fraiseuse', libelle: 'Fraiseuse' }] })),
    { id: 'marie', nom: 'Martin', prenom: 'Marie', postes: [{ id: 'tour', libelle: 'Tour' }] },
  ],
});
const withActivity = (referentiel: ReferentielDuPupitre, suiviId: string, activite: ActiviteDuPupitre): ReferentielDuPupitre => ({
  ...referentiel,
  suivis: referentiel.suivis.map(suivi => (suivi.id === suiviId ? { ...suivi, activites: [...suivi.activites, activite] } : suivi)),
});
