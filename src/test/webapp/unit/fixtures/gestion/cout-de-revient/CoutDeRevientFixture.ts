import { ElementChiffreId } from '@/gestion/contexts/cout-de-revient/domain/element/ElementChiffreId';
import { ElementDisponible } from '@/gestion/contexts/cout-de-revient/domain/element/ElementDisponible';
import { FichierExporte } from '@/gestion/contexts/cout-de-revient/domain/export/FichierExporte';
import { FormatDExport } from '@/gestion/contexts/cout-de-revient/domain/export/FormatDExport';
import { CoutDeRevient } from '@/gestion/contexts/cout-de-revient/domain/rapport/CoutDeRevient';
import { CoutDeRevientPort } from '@/gestion/contexts/cout-de-revient/domain/rapport/CoutDeRevientPort';

const auTourSuivant = <T>(valeur: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(valeur)));

export class CoutDeRevientFixture extends CoutDeRevientPort {
  elements: readonly ElementDisponible[] = [];
  collectionFailure: Error | undefined;
  lecturesCollection = 0;
  readonly demandes: ElementChiffreId[] = [];
  rapports = new Map<string, CoutDeRevient>();
  elementsInconnus = new Set<string>();
  lectureFailure: Error | undefined;
  lectureDifferee: Promise<CoutDeRevient | undefined> | undefined;
  readonly exports: { readonly element: string; readonly format: FormatDExport }[] = [];
  fichiers = new Map<string, FichierExporte>();
  exportFailure: Error | undefined;
  exportDiffere: Promise<FichierExporte> | undefined;

  override async elementsDisponibles(): Promise<readonly ElementDisponible[]> {
    this.lecturesCollection += 1;
    const elements = await auTourSuivant(this.elements);
    if (this.collectionFailure !== undefined) {
      throw this.collectionFailure;
    }
    return elements;
  }

  override rapport(element: ElementChiffreId): Promise<CoutDeRevient | undefined> {
    this.demandes.push(element);
    if (this.lectureFailure !== undefined) {
      return Promise.reject(this.lectureFailure);
    }
    if (this.lectureDifferee !== undefined) {
      return this.lectureDifferee;
    }
    if (this.elementsInconnus.has(element.value)) {
      return auTourSuivant(undefined);
    }
    const rapport = this.rapports.get(element.value);
    if (rapport === undefined) {
      return Promise.reject(new Error(`Aucun rapport semé pour ${element.value}`));
    }
    return auTourSuivant(rapport);
  }

  override exporte(element: ElementChiffreId, format: FormatDExport): Promise<FichierExporte> {
    this.exports.push({ element: element.value, format });
    if (this.exportDiffere !== undefined) {
      return this.exportDiffere;
    }
    if (this.exportFailure !== undefined) {
      return Promise.reject(this.exportFailure);
    }
    const fichier = this.fichiers.get(`${element.value}:${format}`);
    if (fichier === undefined) {
      return Promise.reject(new Error(`Aucun fichier semé pour ${element.value} en ${format}`));
    }
    return auTourSuivant(fichier);
  }
}
