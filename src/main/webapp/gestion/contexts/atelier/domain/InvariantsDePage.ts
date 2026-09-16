const pageInvalide = (page: number): boolean => page < 0 || !Number.isInteger(page);
const tailleInvalide = (taille: number): boolean => taille <= 0 || !Number.isInteger(taille);

export const verifieLaPagination = (page: number, taille: number): void => {
  if (pageInvalide(page)) {
    throw new Error('Le numéro de page doit être un entier positif ou nul.');
  }
  if (tailleInvalide(taille)) {
    throw new Error('La taille de page doit être un entier strictement positif.');
  }
};
