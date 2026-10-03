export const readPageConflitsDemandee = (parametre: string | null): number | undefined => {
  const page = Number(parametre ?? 1);
  return Number.isSafeInteger(page) && page > 0 ? page : undefined;
};
