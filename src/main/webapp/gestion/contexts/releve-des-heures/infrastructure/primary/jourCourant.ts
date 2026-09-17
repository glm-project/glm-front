import { JourCalendaire } from '../../domain/semaine/JourCalendaire';

/**
 * La seule lecture d'horloge de ce contexte. Le domaine n'a pas le droit de la faire — arch-unit-ts refuse
 * `new Date()` sans argument dans `domain/` — et il ne doit pas : la semaine en cours se déduit d'un jour fourni.
 */
export const jourCourant = (): JourCalendaire => new JourCalendaire(new Date().toLocaleDateString('en-CA'));
