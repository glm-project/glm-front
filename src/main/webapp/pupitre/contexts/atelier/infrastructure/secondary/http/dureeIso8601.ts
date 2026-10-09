const DUREE_EN_HEURES_MINUTES_SECONDES = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;

const MILLISECONDES_PAR_HEURE = 3_600_000;
const MILLISECONDES_PAR_MINUTE = 60_000;
const MILLISECONDES_PAR_SECONDE = 1_000;

const composante = (valeur: string | undefined): number => Number(valeur ?? 0);

export const dureeEnMillisecondes = (iso: string): number => {
  const [, heures, minutes, secondes] = DUREE_EN_HEURES_MINUTES_SECONDES.exec(iso) ?? [];
  const total =
    composante(heures) * MILLISECONDES_PAR_HEURE
    + composante(minutes) * MILLISECONDES_PAR_MINUTE
    + composante(secondes) * MILLISECONDES_PAR_SECONDE;
  if (total <= 0) {
    throw new Error(`La durée maximale d'une activité n'est pas lisible : ${JSON.stringify(iso)}.`);
  }
  return total;
};
