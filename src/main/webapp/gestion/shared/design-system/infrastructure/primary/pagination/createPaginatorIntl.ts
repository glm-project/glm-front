import { MatPaginatorIntl } from '@angular/material/paginator';

export interface PaginatorLabels {
  readonly itemsPerPageLabel: string;
  readonly nextPageLabel: string;
  readonly previousPageLabel: string;
  readonly firstPageLabel: string;
  readonly lastPageLabel: string;
  readonly emptyLabel: string;
  readonly formatRange: (first: number, last: number, total: number) => string;
}

export const DEFAULT_PAGINATOR_LABELS = {
  nextPageLabel: 'Page suivante',
  previousPageLabel: 'Page précédente',
  firstPageLabel: 'Première page',
  lastPageLabel: 'Dernière page',
  formatRange: (first: number, last: number, total: number): string => `${first}–${last} sur ${total}`,
} as const;

export const createPaginatorIntl = (labels: PaginatorLabels): MatPaginatorIntl =>
  Object.assign(new MatPaginatorIntl(), {
    itemsPerPageLabel: labels.itemsPerPageLabel,
    nextPageLabel: labels.nextPageLabel,
    previousPageLabel: labels.previousPageLabel,
    firstPageLabel: labels.firstPageLabel,
    lastPageLabel: labels.lastPageLabel,
    getRangeLabel: (page: number, pageSize: number, total: number): string =>
      total === 0 ? labels.emptyLabel : labels.formatRange(page * pageSize + 1, Math.min((page + 1) * pageSize, total), total),
  });
