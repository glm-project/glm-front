import { InstantDAtelier } from '../../domain/InstantDAtelier';

const FORMAT = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

export const formatInstant = (instant: InstantDAtelier): string => FORMAT.format(instant.value);
