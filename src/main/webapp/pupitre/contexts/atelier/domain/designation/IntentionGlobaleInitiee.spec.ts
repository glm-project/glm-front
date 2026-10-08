import { Entreprise } from '../journal-du-pupitre/Entreprise';
import { EMPTY_JOURNAL_DU_PUPITRE, GesteDePointage, JournalDuPupitre, SuiviDuPupitre } from '../journal-du-pupitre/JournalDuPupitre';
import { IntentionGlobaleDAtelier } from './fenetre-operateur/ContexteDeGesteDAtelier';
import { FenetreOperateur } from './fenetre-operateur/FenetreOperateur';
import { Identifiant } from './Identifiant';
import { IdentiteDeFenetre } from './IdentiteDeFenetre';
import { IntentionGlobaleInitiee } from './IntentionGlobaleInitiee';

const racineFixture = { id: '11111111-2222-4333-8444-55550000000a', dateDeSurvenue: '2026-09-05T12:00:00.000Z' };
const suiviFixture = (id: string, activites: SuiviDuPupitre['activites']): SuiviDuPupitre => ({
  id,
  nom: id,
  etat: activites.length === 0 ? 'EN_ATTENTE' : 'EN_COURS',
  categorie: 'OF',
  activites,
  evenements: [],
});
const journalFixture = (suivis: readonly SuiviDuPupitre[]): JournalDuPupitre => ({
  ...EMPTY_JOURNAL_DU_PUPITRE,
  referentiel: {
    operateurs: [
      {
        id: 'jean',
        nom: 'Dupont',
        prenom: 'Jean',
        identifiant: '049',
        postes: [{ id: 'tour', libelle: 'Tour' }],
      },
    ],
    suivis,
    categories: [],
  },
});
const atelierAuTravailFixture = journalFixture([
  suiviFixture('of-204', [
    {
      ouverture: 'activite-fixture-8',
      echeance: '2026-09-05T21:00:00.000Z',
      operateurId: 'jean',
      categorie: 'TRAVAIL',
      depuis: '2026-09-05T08:00:00Z',
      posteId: 'tour',
    },
  ]),
  suiviFixture('of-205', [
    {
      ouverture: 'activite-fixture-9',
      echeance: '2026-09-05T22:00:00.000Z',
      operateurId: 'jean',
      categorie: 'NON_CONFORMITE',
      depuis: '2026-09-05T09:00:00Z',
    },
  ]),
]);
const atelierAuReposFixture = journalFixture([suiviFixture('of-204', [])]);

describe('IntentionGlobaleInitiee', () => {
  it('should mark every suspension of a pause with the root identity fixed at the press', () => {
    const fenetre = givenAWindowOn(atelierAuTravailFixture);

    const gestes = whenPreparing('PAUSE', fenetre);

    thenEverySuspensionBelongsToThePause(gestes, racineFixture.id);
  });

  it.each<[IntentionGlobaleDAtelier, string]>([
    ['PAUSE', 'no personal activity to suspend'],
    ['REPRENDRE', 'no pause in progress to reopen'],
  ])('should record no gesture at all, not even the arrival, for %s decided on a window with %s', intention => {
    const fenetre = givenAWindowOn(atelierAuReposFixture);

    const gestes = whenPreparing(intention, fenetre);

    thenNoGestureIsRecorded(gestes);
  });

  const givenAWindowOn = (journal: JournalDuPupitre): FenetreOperateur =>
    FenetreOperateur.open(
      Entreprise.of('entreprise-a'),
      structuredClone(journal),
      identifiantFixture('049'),
      Date.parse(racineFixture.dateDeSurvenue),
      new IdentiteDeFenetre(1),
    );
  const whenPreparing = (intention: IntentionGlobaleDAtelier, fenetre: FenetreOperateur): readonly GesteDePointage[] =>
    fenetre.capture(new IntentionGlobaleInitiee(intention, racineFixture).prepare(fenetre));
  const thenEverySuspensionBelongsToThePause = (gestes: readonly GesteDePointage[], pause: string): void => {
    expect(gestes.map(geste => geste.suspension?.pause)).toEqual([pause, pause]);
  };
  const thenNoGestureIsRecorded = (gestes: readonly GesteDePointage[]): void => {
    expect(gestes).toEqual([]);
  };
});

const identifiantFixture = (saisie: string): Identifiant =>
  Array.from(saisie).reduce((identifiant, caractere) => identifiant.afterDigit(caractere), Identifiant.empty());
