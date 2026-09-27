import { JourCalendaire } from '../../domain/semaine/JourCalendaire';

export const jourCourant = (): JourCalendaire => new JourCalendaire(new Date().toLocaleDateString('en-CA'));
