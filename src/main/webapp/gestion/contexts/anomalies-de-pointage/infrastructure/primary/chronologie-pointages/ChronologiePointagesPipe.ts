import { Pipe, PipeTransform } from '@angular/core';
import { ChronologiePointages } from '../../../domain/dossier/ChronologiePointages';
import { PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';

@Pipe({ name: 'chronologiePointages', pure: true })
export class ChronologiePointagesPipe implements PipeTransform {
  transform(journal: readonly PointageAnomalie[]): readonly PointageAnomalie[] {
    return new ChronologiePointages(journal).pointages;
  }
}
