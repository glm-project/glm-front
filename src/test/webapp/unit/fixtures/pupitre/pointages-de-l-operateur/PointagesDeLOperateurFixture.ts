import { DemandeDePointages } from '@/pupitre/contexts/pointages-de-l-operateur/domain/DemandeDePointages';
import { DureeTravaillee } from '@/pupitre/contexts/pointages-de-l-operateur/domain/duree/DureeTravaillee';
import { TotalDeDuree } from '@/pupitre/contexts/pointages-de-l-operateur/domain/duree/TotalDeDuree';
import { JourDePointages } from '@/pupitre/contexts/pointages-de-l-operateur/domain/JourDePointages';
import { CategorieDePointage, EtatDeLigne, LigneDePointage } from '@/pupitre/contexts/pointages-de-l-operateur/domain/LigneDePointage';
import { PointagesDeLaSemaine } from '@/pupitre/contexts/pointages-de-l-operateur/domain/PointagesDeLaSemaine';
import { PointagesDeLOperateurPort } from '@/pupitre/contexts/pointages-de-l-operateur/domain/PointagesDeLOperateurPort';
import { SemaineISO } from '@/pupitre/contexts/pointages-de-l-operateur/domain/semaine/SemaineISO';

export type TotalFixture = string | false;

export interface JourFixture {
  readonly total: TotalFixture;
  readonly lignes: readonly LigneDePointage[];
}

export interface LigneFixture {
  readonly element: string;
  readonly poste?: string;
  readonly categorie?: CategorieDePointage;
  readonly debut: Date;
  readonly fin?: Date;
  readonly automatique?: boolean;
}

const etatFixture = ({ fin, automatique = false }: LigneFixture): EtatDeLigne => {
  if (fin !== undefined) return { etat: automatique ? 'TERMINEE_AUTOMATIQUEMENT' : 'TERMINEE', fin };
  return { etat: 'EN_COURS' };
};

export const ligneFixture = (ligne: LigneFixture): LigneDePointage =>
  new LigneDePointage(
    { element: ligne.element, poste: ligne.poste, categorie: ligne.categorie ?? 'TRAVAIL', debut: ligne.debut },
    etatFixture(ligne),
  );

export const totalFixture = (total: TotalFixture): TotalDeDuree =>
  total === false ? TotalDeDuree.incomplet() : TotalDeDuree.complet(new DureeTravaillee(total));

export const semaineFixture = (
  semaine: SemaineISO,
  jours: Readonly<Partial<Record<number, JourFixture>>> = {},
  total: TotalFixture = 'PT0S',
): PointagesDeLaSemaine =>
  new PointagesDeLaSemaine(
    semaine,
    totalFixture(total),
    semaine.jours().map((jour, rang) => {
      const pointe = jours[rang];
      return new JourDePointages(jour, totalFixture(pointe?.total ?? 'PT0S'), pointe?.lignes ?? []);
    }),
  );

const cleDe = (demande: DemandeDePointages): string =>
  `${demande.operateur.value}|${String(demande.semaine.annee)}|${String(demande.semaine.numero)}`;

export class PointagesDeLOperateurFixture extends PointagesDeLOperateurPort {
  readonly demandes: DemandeDePointages[] = [];
  lectureFailure: Error | undefined;
  private readonly semaines = new Map<string, PointagesDeLaSemaine>();

  seed(demande: DemandeDePointages, pointages: PointagesDeLaSemaine): void {
    this.semaines.set(cleDe(demande), pointages);
  }

  override semaine(demande: DemandeDePointages): Promise<PointagesDeLaSemaine> {
    this.demandes.push(demande);
    const failure = this.lectureFailure;
    const pointages = this.semaines.get(cleDe(demande)) ?? semaineFixture(demande.semaine);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (failure === undefined) resolve(pointages);
        else reject(failure);
      });
    });
  }
}
