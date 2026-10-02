import { TotalDeDuree } from '../duree/TotalDeDuree';
import { ElementDuReleve } from '../element/ElementDuReleve';
import { ElementReleveId } from '../element/ElementReleveId';
import { SemaineISO } from '../semaine/SemaineISO';
import { CibleDePointage } from './CibleDePointage';
import { IdentiteOperateur } from './IdentiteOperateur';
import { JourDeReleve } from './JourDeReleve';
import { SequenceEnConflit } from './SequenceEnConflit';

const memesJours = (attendus: readonly { readonly value: string }[], jours: readonly JourDeReleve[]): boolean =>
  attendus.every((attendu, rang) => jours[rang]?.jour.value === attendu.value);

const couvreLaSemaine = (semaine: SemaineISO, jours: readonly JourDeReleve[]): boolean => {
  const attendus = semaine.jours();
  if (attendus.length !== jours.length) {
    return false;
  }
  return memesJours(attendus, jours);
};

const elementDe = (id: ElementReleveId, elements: readonly ElementDuReleve[]): ElementDuReleve => {
  const element = elements.find(candidat => candidat.id.estLeMeme(id));
  if (element === undefined) {
    throw new Error('Le relevé reçu du serveur désigne un élément que sa synthèse ne porte pas.');
  }
  return element;
};

const verifieLePoste = (cible: CibleDePointage, element: ElementDuReleve): void => {
  const poste = cible.poste;
  if (poste === undefined) {
    return;
  }
  if (!element.porte(poste)) {
    throw new Error('Le relevé reçu du serveur désigne un poste que son élément ne porte pas.');
  }
};

export interface FicheDuReleve {
  readonly operateur: IdentiteOperateur;
  readonly elements: readonly ElementDuReleve[];
  readonly jours: readonly JourDeReleve[];
  readonly operationnelTotal: TotalDeDuree;
  readonly conflits: readonly SequenceEnConflit[];
}

export class ReleveDesHeures {
  readonly operateur: IdentiteOperateur;
  readonly elements: readonly ElementDuReleve[];
  readonly jours: readonly JourDeReleve[];
  readonly operationnelTotal: TotalDeDuree;
  readonly conflits: readonly SequenceEnConflit[];

  constructor(semaine: SemaineISO, fiche: FicheDuReleve) {
    ReleveDesHeures.verifieLesSeptJours(semaine, fiche.jours);
    ReleveDesHeures.verifieLesReferences(fiche.elements, fiche.jours, fiche.conflits);
    this.operateur = fiche.operateur;
    this.elements = [...fiche.elements];
    this.jours = [...fiche.jours];
    this.operationnelTotal = fiche.operationnelTotal;
    this.conflits = [...fiche.conflits];
  }

  elementDe(id: ElementReleveId): ElementDuReleve {
    return elementDe(id, this.elements);
  }

  travailleEnParallele(element: ElementDuReleve): boolean {
    const intervalles = this.jours.flatMap(jour => jour.intervallesDe(element.id));
    return intervalles.some((intervalle, rang) => intervalles.slice(rang + 1).some(autre => intervalle.chevauche(autre)));
  }

  private static verifieLesReferences(
    elements: readonly ElementDuReleve[],
    jours: readonly JourDeReleve[],
    conflits: readonly SequenceEnConflit[],
  ): void {
    const cibles = [
      ...conflits.map(conflit => conflit.cible),
      ...jours.flatMap(jour => [
        ...jour.intervalles.map(intervalle => intervalle.cible()),
        ...jour.pointages.map(pointage => pointage.cible),
      ]),
    ];
    for (const cible of cibles) {
      verifieLePoste(cible, elementDe(cible.element, elements));
    }
  }

  private static verifieLesSeptJours(semaine: SemaineISO, jours: readonly JourDeReleve[]): void {
    if (!couvreLaSemaine(semaine, jours)) {
      throw new Error('Le relevé reçu du serveur ne couvre pas les sept jours de la semaine demandée.');
    }
  }
}
