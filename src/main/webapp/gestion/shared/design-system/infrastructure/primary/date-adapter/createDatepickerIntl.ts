import { MatDatepickerIntl } from '@angular/material/datepicker';

export const createDatepickerIntl = (): MatDatepickerIntl =>
  Object.assign(new MatDatepickerIntl(), {
    calendarLabel: 'Calendrier',
    openCalendarLabel: 'Ouvrir le calendrier',
    closeCalendarLabel: 'Fermer le calendrier',
    prevMonthLabel: 'Mois précédent',
    nextMonthLabel: 'Mois suivant',
    prevYearLabel: 'Année précédente',
    nextYearLabel: 'Année suivante',
    prevMultiYearLabel: '24 années précédentes',
    nextMultiYearLabel: '24 années suivantes',
    switchToMonthViewLabel: 'Choisir le jour',
    switchToMultiYearViewLabel: 'Choisir le mois et l’année',
    formatYearRangeLabel: (start: string, end: string): string => `${start} à ${end}`,
  });
