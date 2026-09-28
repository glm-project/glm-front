import { DureeTravaillee } from '../duree/DureeTravaillee';
import { ElementDuReleve } from '../element/ElementDuReleve';
import { IntervalleDActivite } from '../element/IntervalleDActivite';
import { SemaineISO } from '../semaine/SemaineISO';
import { IdentiteOperateur } from './IdentiteOperateur';
import { JourDeReleve } from './JourDeReleve';

const memesJours = (attendus: readonly { readonly value: string }[], jours: readonly JourDeReleve[]): boolean =>
  attendus.every((attendu, rang) => jours[rang]?.jour.value === attendu.value);

const couvreLaSemaine = (semaine: SemaineISO, jours: readonly JourDeReleve[]): boolean => {
  const attendus = semaine.jours();
  if (attendus.length !== jours.length) {
    return false;
  }
  return memesJours(attendus, jours);
};

const elementDe = (intervalle: IntervalleDActivite, elements: readonly ElementDuReleve[]): ElementDuReleve => {
  const element = elements.find(candidat => candidat.id.value === intervalle.element.value);
  if (element === undefined) {
    throw new Error('Le relevé reçu du serveur désigne un élément que sa synthèse ne porte pas.');
  }
  return element;
};

const verifieLePoste = (intervalle: IntervalleDActivite, element: ElementDuReleve): void => {
  const poste = intervalle.poste;
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
  readonly presencePointee: DureeTravaillee;
  readonly presencePresumee: DureeTravaillee;
  readonly operationnelPointe: DureeTravaillee;
  readonly operationnelPresume: DureeTravaillee;
}

export class ReleveDesHeures {
  readonly operateur: IdentiteOperateur;
  readonly elements: readonly ElementDuReleve[];
  readonly jours: readonly JourDeReleve[];
  readonly presencePointee: DureeTravaillee;
  readonly presencePresumee: DureeTravaillee;
  readonly operationnelPointe: DureeTravaillee;
  readonly operationnelPresume: DureeTravaillee;

  constructor(semaine: SemaineISO, fiche: FicheDuReleve) {
    ReleveDesHeures.verifieLesSeptJours(semaine, fiche.jours);
    ReleveDesHeures.verifieLesReferences(fiche.elements, fiche.jours);
    this.operateur = fiche.operateur;
    this.elements = [...fiche.elements];
    this.jours = [...fiche.jours];
    this.presencePointee = fiche.presencePointee;
    this.presencePresumee = fiche.presencePresumee;
    this.operationnelPointe = fiche.operationnelPointe;
    this.operationnelPresume = fiche.operationnelPresume;
  }

  travailleEnParallele(element: ElementDuReleve): boolean {
    const intervalles = this.jours.flatMap(jour => jour.intervallesDe(element.id));
    return intervalles.some((intervalle, rang) => intervalles.slice(rang + 1).some(autre => intervalle.chevauche(autre)));
  }

  private static verifieLesReferences(elements: readonly ElementDuReleve[], jours: readonly JourDeReleve[]): void {
    for (const intervalle of jours.flatMap(jour => jour.intervalles)) {
      verifieLePoste(intervalle, elementDe(intervalle, elements));
    }
  }

  private static verifieLesSeptJours(semaine: SemaineISO, jours: readonly JourDeReleve[]): void {
    if (!couvreLaSemaine(semaine, jours)) {
      throw new Error('Le relevé reçu du serveur ne couvre pas les sept jours de la semaine demandée.');
    }
  }
}
