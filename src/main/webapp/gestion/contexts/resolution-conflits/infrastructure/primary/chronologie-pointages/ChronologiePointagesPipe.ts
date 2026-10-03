import { Pipe, PipeTransform } from '@angular/core';
import { ChronologiePointages } from '../../../domain/dossier/ChronologiePointages';
import { PointageConflit } from '../../../domain/dossier/DossierConflit';

@Pipe({ name: 'chronologiePointages', pure: true })
export class ChronologiePointagesPipe implements PipeTransform {
  transform(journal: readonly PointageConflit[]): readonly PointageConflit[] {
    return new ChronologiePointages(journal).pointages;
  }
}
