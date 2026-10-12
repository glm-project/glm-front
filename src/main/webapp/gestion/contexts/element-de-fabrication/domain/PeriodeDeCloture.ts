export type PrereglageDeCloture = 'CE_MOIS' | 'TROIS_MOIS' | 'DOUZE_MOIS';

export const PREREGLAGES_DE_CLOTURE: readonly PrereglageDeCloture[] = ['CE_MOIS', 'TROIS_MOIS', 'DOUZE_MOIS'];

export type PeriodeDeCloture = { readonly prereglage: PrereglageDeCloture } | { readonly du: string; readonly au: string };

export const PERIODE_DE_CLOTURE_PAR_DEFAUT: PeriodeDeCloture = { prereglage: 'DOUZE_MOIS' };

export interface BornesDeCloture {
  readonly debut: Date;
  readonly fin: Date;
}

const JOUR = /^(\d{4})-(\d{2})-(\d{2})$/;

export const estUnJour = (jour: string): boolean => {
  const morceaux = JOUR.exec(jour);
  if (morceaux === null) return false;
  const date = new Date(Number(morceaux[1]), Number(morceaux[2]) - 1, Number(morceaux[3]));
  return date.getMonth() === Number(morceaux[2]) - 1 && date.getDate() === Number(morceaux[3]);
};

export const periodeLibre = (du: string, au: string): PeriodeDeCloture | undefined => ([du, au].every(estUnJour) ? { du, au } : undefined);

const debutDuJour = (jour: string): Date => new Date(`${jour}T00:00:00`);

const finDuJour = (jour: Date): Date => new Date(jour.getFullYear(), jour.getMonth(), jour.getDate(), 23, 59, 59, 999);

const debutDuPrereglage = (prereglage: PrereglageDeCloture, aujourdhui: Date): Date => {
  const annee = aujourdhui.getFullYear();
  const mois = aujourdhui.getMonth();
  switch (prereglage) {
    case 'CE_MOIS':
      return new Date(annee, mois, 1);
    case 'TROIS_MOIS':
      return new Date(annee, mois - 3, aujourdhui.getDate());
    case 'DOUZE_MOIS':
      return new Date(annee - 1, mois, aujourdhui.getDate());
  }
};

export const bornesDeCloture = (periode: PeriodeDeCloture, aujourdhui: Date): BornesDeCloture => {
  if ('prereglage' in periode) {
    return { debut: debutDuPrereglage(periode.prereglage, aujourdhui), fin: finDuJour(aujourdhui) };
  }
  const dansLOrdre = periode.du <= periode.au;
  const premier = dansLOrdre ? periode.du : periode.au;
  const dernier = dansLOrdre ? periode.au : periode.du;
  return { debut: debutDuJour(premier), fin: finDuJour(debutDuJour(dernier)) };
};
