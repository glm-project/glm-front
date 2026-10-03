import { ActeResolution, FaitPropose } from '../../domain/acte/ActeResolution';
import { InstantPointage } from '../../domain/acte/InstantPointage';
import { MotifActe } from '../../domain/acte/MotifActe';
import { DossierConflit } from '../../domain/dossier/DossierConflit';

export const refusDemonstrationConflits = (dossier: DossierConflit, acte: ActeResolution): string | undefined => {
  if (motifInvalide(acte)) return 'Un motif de 1 à 255 caractères est requis.';
  const refus = refusPointage(dossier, acte);
  if (refus !== undefined) return refus;
  if (acte.kind === 'ANNULATION') return undefined;
  return (
    refusInstant(dossier, acte.fait.instant)
    ?? refusChangementCle(dossier, acte)
    ?? refusReferentiel(acte.fait)
    ?? refusCible(dossier, acte.fait)
  );
};

const refusReferentiel = (fait: FaitPropose): string | undefined => {
  if (['op-camille', 'op-jean'].indexOf(fait.operateur) === -1) return 'Opérateur inconnu du référentiel de démonstration.';
  return ['', 'poste-dmu', 'poste-tour'].indexOf(fait.poste) !== -1 ? undefined : 'Poste inconnu du référentiel de démonstration.';
};

const motifInvalide = (acte: ActeResolution): boolean => acte.kind !== 'REGULARISATION' && new MotifActe(acte.motif).errors().length > 0;

const refusChangementCle = (dossier: DossierConflit, acte: ActeResolution): string | undefined => {
  if (acte.kind !== 'CORRECTION') return undefined;
  const incompatible = dossier.journal.some(original => {
    if (original.id.pointage !== acte.pointage) return false;
    const creation = original.activiteCreee;
    if (creation === undefined) return false;
    const autreCle = original.fait.operateur !== acte.fait.operateur || original.fait.poste !== acte.fait.poste;
    return (
      autreCle
      && dossier.journal.filter(pointage => pointage.annulation === undefined && pointage.fait.activiteVisee === creation.activite).length
        > 0
    );
  });
  return incompatible ? 'L’ouverture est encore visée sur son opérateur/poste d’origine.' : undefined;
};

const refusPointage = (dossier: DossierConflit, acte: ActeResolution): string | undefined => {
  if (acte.kind === 'REGULARISATION') return undefined;
  const pointage = dossier.journal.find(pointage => pointage.id.pointage === acte.pointage);
  if (pointage === undefined) return 'Pointage à modifier introuvable.';
  return pointage.annulation !== undefined ? 'Le pointage est déjà annulé.' : undefined;
};

const refusInstant = (dossier: DossierConflit, instant: string): string | undefined => {
  const heure = new InstantPointage(instant);
  if (heure.compareTo(new InstantPointage(dossier.engagement)) < 0) return 'L’heure métier précède l’engagement.';
  const apresCloture = dossier.finCloture !== undefined && heure.compareTo(new InstantPointage(dossier.finCloture)) > 0;
  if (apresCloture) return 'L’heure métier dépasse la clôture.';
  return heure.compareTo(new InstantPointage('2026-10-03T10:00:00Z')) > 0
    ? 'L’heure métier est future dans cette démonstration.'
    : undefined;
};

const refusCible = (dossier: DossierConflit, fait: FaitPropose): string | undefined => {
  if (fait.intention === 'OUVERTURE') return undefined;
  const cible = dossier.journal.find(pointage => pointage.activiteCreee?.activite === fait.activiteVisee);
  if (cible === undefined) return 'Activité visée introuvable dans ce suivi.';
  const autreCle = cible.fait.operateur !== fait.operateur || cible.fait.poste !== fait.poste;
  return autreCle ? 'La cible appartient à un autre opérateur ou poste.' : undefined;
};
