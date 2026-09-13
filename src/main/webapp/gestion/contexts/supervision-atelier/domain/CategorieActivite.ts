export class CategorieActivite {
  constructor(readonly value: string) {}
  isNc(): boolean {
    return this.value === 'NC';
  }
}
