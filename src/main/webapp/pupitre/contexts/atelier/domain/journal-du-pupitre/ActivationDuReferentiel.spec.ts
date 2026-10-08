import { afterActivatingReferentiel } from './ActivationDuReferentiel';
import { EvenementDuJournal, GesteDePointage, JournalDuPupitre, ReferentielDuPupitre, Suspension } from './JournalDuPupitre';

const aReferentiel = (evenementsRecus: Readonly<Record<string, readonly string[]>> = {}): ReferentielDuPupitre => ({
  operateurs: [],
  suivis: ['piece', 'autre'].map(id => ({
    id,
    nom: id,
    categorie: 'MOULE',
    etat: 'EN_ATTENTE',
    activites: [],
    conflits: [],
    evenements: evenementsRecus[id] ?? [],
  })),
  categories: [],
});

const ouverture = (id: string, operateurId = 'jean', suiviId = 'piece'): GesteDePointage => ({
  nature: 'POINTAGE',
  intention: 'OUVERTURE',
  type: 'DEBUT',
  id,
  operateurId,
  suiviId,
  dateDeSurvenue: '2026-09-05T08:00:00Z',
});

const suspendu = (id: string, pause: string, operateurId = 'jean', suiviId = 'piece'): GesteDePointage => {
  const suspension: Suspension = { pause, reouverture: 'DEBUT' };
  return {
    nature: 'POINTAGE',
    intention: 'FIN',
    type: 'FIN',
    cible: 'ouverture-' + id,
    id,
    operateurId,
    suiviId,
    dateDeSurvenue: '2026-09-05T12:00:00Z',
    suspension,
  };
};

const accepte = (geste: GesteDePointage): EvenementDuJournal => ({ geste, etat: 'ACCEPTE' });
const enAttente = (geste: GesteDePointage): EvenementDuJournal => ({ geste, etat: 'EN_ATTENTE' });
const refuse = (geste: GesteDePointage): EvenementDuJournal => ({
  geste,
  etat: 'REFUSE',
  refus: { code: 'CONFLIT', message: 'refusé' },
});

const aJournal = (evenements: readonly EvenementDuJournal[], pausesArretees?: readonly string[]): JournalDuPupitre => ({
  connecte: true,
  evenements,
  ...(pausesArretees === undefined ? {} : { pausesArretees }),
});

const evenementsDuSuivi = (journal: JournalDuPupitre, suiviId: string): readonly string[] =>
  journal.referentiel?.suivis.find(({ id }) => id === suiviId)?.evenements ?? [];

const idsOf = (journal: JournalDuPupitre): readonly string[] => journal.evenements.map(({ geste }) => geste.id);

describe('ActivationDuReferentiel', () => {
  it.each<[string, readonly EvenementDuJournal[], readonly string[]]>([
    ['pending', [enAttente(ouverture('x')), accepte(ouverture('dernier'))], ['x', 'dernier']],
    ['refused', [refuse(ouverture('x')), accepte(ouverture('dernier'))], ['x', 'dernier']],
    ['accepted and last of its operator', [accepte(ouverture('x'))], ['x']],
    ['accepted and carrying the last pause', [accepte(suspendu('x', 'pause')), accepte(suspendu('dernier', 'pause'))], ['x', 'dernier']],
    ['accepted and neither', [accepte(ouverture('x')), accepte(ouverture('dernier'))], ['dernier']],
  ])('should treat an event as follows: %s', (_, evenements, expected) => {
    const active = afterActivatingReferentiel(aJournal(evenements), aReferentiel());

    expect(idsOf(active)).toEqual(expected);
  });

  it('should read the last gesture of each operator separately, whatever other operators did since', () => {
    const journal = aJournal([
      accepte(ouverture('jean-1')),
      accepte(ouverture('marie-1', 'marie')),
      accepte(ouverture('marie-2', 'marie')),
      accepte(ouverture('jean-2')),
    ]);

    const active = afterActivatingReferentiel(journal, aReferentiel());

    expect(idsOf(active)).toEqual(['marie-2', 'jean-2']);
  });

  it('should read the last pause of each operator separately', () => {
    const journal = aJournal([
      accepte(suspendu('jean-1', 'pause-de-jean', 'jean')),
      accepte(suspendu('marie-1', 'pause-de-marie', 'marie')),
      accepte(suspendu('marie-2', 'pause-de-marie', 'marie')),
      accepte(suspendu('jean-2', 'pause-de-jean', 'jean')),
    ]);

    const active = afterActivatingReferentiel(journal, aReferentiel());

    expect(idsOf(active)).toEqual(['jean-1', 'marie-1', 'marie-2', 'jean-2']);
  });

  it('should forget the gestures of an earlier pause of the operator', () => {
    const journal = aJournal([
      accepte(suspendu('ancienne-1', 'pause-ancienne')),
      accepte(suspendu('ancienne-2', 'pause-ancienne')),
      accepte(suspendu('derniere-1', 'pause-derniere')),
      accepte(suspendu('derniere-2', 'pause-derniere')),
    ]);

    const active = afterActivatingReferentiel(journal, aReferentiel());

    expect(idsOf(active)).toEqual(['derniere-1', 'derniere-2']);
  });

  it('should forget the pause of an operator whose last gesture is pending and carries no suspension', () => {
    const journal = aJournal([
      accepte(suspendu('pause-1', 'pause')),
      accepte(suspendu('pause-2', 'pause')),
      enAttente(ouverture('reprise')),
    ]);

    const active = afterActivatingReferentiel(journal, aReferentiel());

    expect(idsOf(active)).toEqual(['reprise']);
  });

  it('should keep the order of the retained events', () => {
    const journal = aJournal([
      refuse(ouverture('refuse')),
      accepte(ouverture('oublie')),
      enAttente(ouverture('en-attente')),
      accepte(ouverture('dernier')),
      enAttente(ouverture('apres', 'marie')),
    ]);

    const active = afterActivatingReferentiel(journal, aReferentiel());

    expect(idsOf(active)).toEqual(['refuse', 'en-attente', 'dernier', 'apres']);
  });

  it('should keep the stopped pauses that a retained gesture still carries and drop the others', () => {
    const journal = aJournal(
      [
        accepte(suspendu('ancienne-1', 'pause-ancienne')),
        enAttente(suspendu('derniere-1', 'pause-derniere')),
        refuse(suspendu('refusee-1', 'pause-refusee', 'marie')),
      ],
      ['pause-ancienne', 'pause-derniere', 'pause-refusee', 'pause-inconnue'],
    );

    const active = afterActivatingReferentiel(journal, aReferentiel());

    expect(active.pausesArretees).toEqual(['pause-derniere', 'pause-refusee']);
  });

  it('should leave the stopped pauses undefined when the journal records none', () => {
    const active = afterActivatingReferentiel(aJournal([accepte(ouverture('dernier'))]), aReferentiel());

    expect(active.pausesArretees).toBeUndefined();
  });

  it('should list the retained accepted gestures of each element after the identities the reference already carries, without duplicate', () => {
    const journal = aJournal([
      accepte(ouverture('ancien')),
      accepte(ouverture('dernier')),
      accepte(ouverture('dernier-de-marie', 'marie', 'autre')),
      enAttente(ouverture('en-attente', 'paul')),
      refuse(ouverture('refuse', 'paul')),
    ]);

    const active = afterActivatingReferentiel(journal, aReferentiel({ piece: ['recu', 'dernier'] }));

    expect(evenementsDuSuivi(active, 'piece')).toEqual(['recu', 'dernier']);
    expect(evenementsDuSuivi(active, 'autre')).toEqual(['dernier-de-marie']);
  });
});
