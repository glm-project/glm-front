import { LIBELLES_ANOMALIES } from './LibellesAnomalies';

interface OperateurPresentable {
  readonly operateur: string;
  readonly operateurId?: string;
}

interface PostePresentable {
  readonly poste: string;
  readonly posteId?: string;
}

export const operateurPresente = (ligne: OperateurPresentable): string =>
  ligne.operateur || [LIBELLES_ANOMALIES.operateurNonResolu, ligne.operateurId].join(' · ');

export const postePresente = (ligne: PostePresentable): string =>
  ligne.poste || (ligne.posteId ? `${LIBELLES_ANOMALIES.posteNonResolu} · ${ligne.posteId}` : LIBELLES_ANOMALIES.sansPoste);

export const operateurOuIdentifiant = (ligne: OperateurPresentable): string => ligne.operateur || (ligne.operateurId ?? '');
