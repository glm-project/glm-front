import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { PointageDElement } from '../../../domain/releve/PointageDElement';
import { PointageDeReleve } from '../../../domain/releve/PointageDeReleve';
import { ReleveDesHeures } from '../../../domain/releve/ReleveDesHeures';
import { TypeDePointage } from '../../../domain/releve/TypeDePointage';
import { LIBELLES_RELEVE_DES_HEURES } from '../LibellesReleveDesHeures';

const LIBELLES = LIBELLES_RELEVE_DES_HEURES;

export type GlypheDePointage = 'arrivee' | 'depart' | 'debut' | 'nc' | 'fin';

export interface EntreeDeJournal {
  readonly rang: number;
  readonly heure: string;
  readonly libelle: string;
  readonly glyphe: GlypheDePointage;
  readonly objet: string;
  readonly poste: string | undefined;
  readonly effet: string;
  readonly selectionne: boolean;
}

export interface JournalDuJour {
  readonly titre: string;
  readonly entrees: readonly EntreeDeJournal[];
}

const GLYPHES: Record<TypeDePointage, GlypheDePointage> = {
  ARRIVEE: 'arrivee',
  DEPART: 'depart',
  DEBUT: 'debut',
  NON_CONFORMITE: 'nc',
  FIN: 'fin',
};

const effetDe = (releve: ReleveDesHeures, jour: JourDeReleve, pointage: PointageDeReleve): string =>
  LIBELLES.effetDeCloture(
    jour
      .effetDe(pointage)
      .elementsClos()
      .map(id => LIBELLES.nomDElement(releve.elementDe(id))),
  );

const posteDe = (releve: ReleveDesHeures, pointage: PointageDElement): string | undefined =>
  releve.elementDe(pointage.cible.element).libelleDuPoste(pointage.cible.poste);

const entreeDeJournal = (
  releve: ReleveDesHeures,
  jour: JourDeReleve,
  pointage: PointageDeReleve,
  rang: number,
  selection: number | undefined,
): EntreeDeJournal => {
  const commun = {
    rang,
    heure: LIBELLES.heure(pointage.instant),
    libelle: LIBELLES.libelleDePointage(pointage.type),
    glyphe: GLYPHES[pointage.type],
    selectionne: rang === selection,
  };
  if (pointage instanceof PointageDElement) {
    return {
      ...commun,
      objet: LIBELLES.nomDElement(releve.elementDe(pointage.cible.element)),
      poste: posteDe(releve, pointage),
      effet: '',
    };
  }
  return { ...commun, objet: LIBELLES.presence, poste: undefined, effet: effetDe(releve, jour, pointage) };
};

export const journalDuJour = (releve: ReleveDesHeures, jour: JourDeReleve, selection: number | undefined): JournalDuJour => ({
  titre: LIBELLES.titreDuJournal(jour.jour, jour.pointages.length),
  entrees: jour.pointages.map((pointage, rang) => entreeDeJournal(releve, jour, pointage, rang, selection)),
});
