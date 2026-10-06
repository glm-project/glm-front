import { ActiviteAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';

const empreinteDeLActivite = (activite: ActiviteAnomalie): readonly (string | undefined)[] => [
  activite.etat,
  activite.periode?.debut,
  activite.periode?.fin,
  activite.periode?.duree,
];

const memeEmpreinte = (gauche: readonly (string | undefined)[], droite: readonly (string | undefined)[]): boolean =>
  gauche.every((valeur, rang) => valeur === droite[rang]);

export const activitesModifiees = (avant: readonly ActiviteAnomalie[], apres: readonly ActiviteAnomalie[]): ReadonlySet<string> =>
  new Set(
    apres
      .filter(activite => {
        const connue = avant.find(candidate => candidate.id.activite === activite.id.activite);
        return connue === undefined || !memeEmpreinte(empreinteDeLActivite(connue), empreinteDeLActivite(activite));
      })
      .map(activite => activite.id.activite),
  );

export const faitsDeLActe = (avant: readonly PointageAnomalie[], apres: readonly PointageAnomalie[]): ReadonlySet<string> => {
  const connus = new Set(avant.map(pointage => pointage.id.pointage));
  return new Set(apres.map(pointage => pointage.id.pointage).filter(identifiant => !connus.has(identifiant)));
};
