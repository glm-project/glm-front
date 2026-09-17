const ISO_ABSOLU = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const LONGUEUR_DATE_HEURE = 19;

/**
 * `Date.parse` reporte le 30 février au 2 mars. Comparer la date-heure écrite à sa relecture est ce qui refuse
 * un instant que le calendrier ne porte pas, indépendamment du décalage que la chaîne annonce.
 */
const dateHeureExiste = (instant: string): boolean => {
  const dateHeure = instant.slice(0, LONGUEUR_DATE_HEURE);
  return new Date(`${dateHeure}Z`).toISOString().slice(0, LONGUEUR_DATE_HEURE) === dateHeure;
};

const estInstantAbsolu = (instant: string): boolean => {
  if (!ISO_ABSOLU.test(instant)) {
    return false;
  }
  return dateHeureExiste(instant);
};

/**
 * Un instant reçu du back, refusé s'il ne porte pas son fuseau. Sur un relevé qui alimente la paie, un instant
 * sans fuseau serait réinterprété en heure locale et déplacerait des heures en silence.
 */
export class InstantDeReleve {
  readonly value: Date;

  constructor(instant: string) {
    if (!estInstantAbsolu(instant)) {
      throw new Error('L’instant reçu du serveur n’est pas un instant absolu.');
    }
    this.value = new Date(Date.parse(instant));
  }
}
