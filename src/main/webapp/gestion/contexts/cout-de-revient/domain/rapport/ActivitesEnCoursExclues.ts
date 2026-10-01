export class ActivitesEnCoursExclues {
  constructor(readonly nombre: number) {}

  existent(): boolean {
    return this.nombre > 0;
  }
}
