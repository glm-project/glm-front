import { components } from '@/app/generated/schema';
import { ApiClient, DownloadedFile } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { PAGE_SIZE } from '@/app/shared/pagination/infrastructure/secondary/buildPageFrom';
import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CategorieDElementChiffre } from '../../domain/element/CategorieDElementChiffre';
import { ElementChiffre } from '../../domain/element/ElementChiffre';
import { ElementChiffreId } from '../../domain/element/ElementChiffreId';
import { ElementDisponible } from '../../domain/element/ElementDisponible';
import { FichierExporte } from '../../domain/export/FichierExporte';
import { FormatDExport } from '../../domain/export/FormatDExport';
import { Cout } from '../../domain/montant/Cout';
import { Montant } from '../../domain/montant/Montant';
import { ActiviteCitee } from '../../domain/pointage/ActiviteCitee';
import { ElementCite } from '../../domain/pointage/ElementCite';
import { OperateurCite } from '../../domain/pointage/OperateurCite';
import { PartDePointage } from '../../domain/pointage/PartDePointage';
import { PointageDeCout } from '../../domain/pointage/PointageDeCout';
import { PosteCite } from '../../domain/pointage/PosteCite';
import { ActivitesEnCoursExclues } from '../../domain/rapport/ActivitesEnCoursExclues';
import { CoutDeRevient } from '../../domain/rapport/CoutDeRevient';
import { CoutDeRevientPort } from '../../domain/rapport/CoutDeRevientPort';
import { LigneDeCout } from '../../domain/rapport/LigneDeCout';
import { NatureDOperation } from '../../domain/rapport/NatureDOperation';
import { DureePassee } from '../../domain/temps/DureePassee';
import { InstantDeTravail } from '../../domain/temps/InstantDeTravail';
import { PeriodeDeTravail } from '../../domain/temps/PeriodeDeTravail';
import { TempsPasse } from '../../domain/temps/TempsPasse';

type RestRapport = components['schemas']['RestCoutDeRevient'];
type RestLigne = components['schemas']['RestLigneDeCout'];
type RestTemps = components['schemas']['RestTempsPasse'];
type RestCout = components['schemas']['RestCout'];
type RestPointage = components['schemas']['RestPointageDuCout'];
type RestPart = components['schemas']['RestPartDuPointageDuCout'];
type RestActiviteCitee = components['schemas']['RestActiviteCiteeDuCout'];
type RestPoste = components['schemas']['RestPosteDuCout'];

const ROUTE = '/api/couts-de-revient/{elementId}';
const ELEMENT_INCONNU = 404;

const toDuree = (total: components['schemas']['RestDureeDuCout'] | undefined, chemin: string): DureePassee =>
  new DureePassee(required(required(total, chemin).valeur, `${chemin}.valeur`));

const toMontant = (total: components['schemas']['RestMontantDuCout'] | undefined, chemin: string): Montant =>
  new Montant(required(required(total, chemin).valeur, `${chemin}.valeur`));

const toTemps = (temps: RestTemps | undefined, chemin: string): TempsPasse => {
  const lu = required(temps, chemin);
  return new TempsPasse(
    toDuree(lu.travail, `${chemin}.travail`),
    toDuree(lu.nonConformite, `${chemin}.nonConformite`),
    toDuree(lu.total, `${chemin}.total`),
  );
};

const toCout = (cout: RestCout | undefined, chemin: string): Cout => {
  const lu = required(cout, chemin);
  return new Cout(
    toMontant(lu.machine, `${chemin}.machine`),
    toMontant(lu.mainDOeuvre, `${chemin}.mainDOeuvre`),
    toMontant(lu.total, `${chemin}.total`),
  );
};

const toNature = (nature: string | undefined): NatureDOperation | undefined =>
  nature === undefined ? undefined : new NatureDOperation(nature);

const toTarif = (tarif: number | undefined): Montant | undefined => (tarif === undefined ? undefined : new Montant(tarif));

const toPoste = (poste: RestPoste | undefined): PosteCite | undefined =>
  poste === undefined ? undefined : new PosteCite(required(poste.id, 'poste.id'), poste.libelle);

const toCategorieCitee = (categorie: string | undefined): CategorieDElementChiffre | undefined =>
  categorie === undefined ? undefined : new CategorieDElementChiffre(categorie);

const toActivite = (activite: RestActiviteCitee): ActiviteCitee => {
  const element = required(activite.element, 'activite.element');
  return new ActiviteCitee(
    new ElementCite(new ElementChiffreId(required(element.id, 'activite.element.id')), element.nom, toCategorieCitee(element.categorie)),
    toPoste(activite.poste),
    toNature(activite.nature),
  );
};

const toPart = (part: RestPart): PartDePointage =>
  new PartDePointage({
    debut: new InstantDeTravail(required(part.debut, 'part.debut')),
    fin: new InstantDeTravail(required(part.fin, 'part.fin')),
    duree: new DureePassee(required(part.duree, 'part.duree')),
    diviseur: required(part.diviseur, 'part.diviseur'),
    mainDOeuvre: toMontant(part.mainDOeuvre, 'part.mainDOeuvre'),
    paralleles: required(part.paralleles, 'part.paralleles').map(toActivite),
  });

const toPointage = (pointage: RestPointage): PointageDeCout => {
  const operateur = required(pointage.operateur, 'pointage.operateur');
  return new PointageDeCout({
    anomalies: required(pointage.anomalies, 'pointage.anomalies'),
    operateur: new OperateurCite(required(operateur.id, 'pointage.operateur.id'), operateur.prenom, operateur.nom),
    poste: toPoste(pointage.poste),
    categorie: required(pointage.categorie, 'pointage.categorie'),
    periode: new PeriodeDeTravail(
      new InstantDeTravail(required(pointage.debut, 'pointage.debut')),
      new InstantDeTravail(required(pointage.fin, 'pointage.fin')),
    ),
    duree: toDuree(pointage.duree, 'pointage.duree'),
    coutHoraire: toTarif(pointage.coutHoraire),
    tauxHoraire: toTarif(pointage.tauxHoraire),
    cout: toCout(pointage.cout, 'pointage.cout'),
    parts: required(pointage.parts, 'pointage.parts').map(toPart),
  });
};

const toLigne = (ligne: RestLigne): LigneDeCout =>
  new LigneDeCout({
    nature: toNature(ligne.nature),
    temps: toTemps(ligne.temps, 'ligne.temps'),
    cout: toCout(ligne.cout, 'ligne.cout'),
    pointages: required(ligne.pointages, 'ligne.pointages').map(toPointage),
  });

const toElement = (rapport: RestRapport, fiche: components['schemas']['RestElementDeFabrication']): ElementChiffre => {
  const element = required(rapport.element, 'rapport.element');
  if (element.id !== fiche.id) {
    throw new Error('Le référentiel ne désigne pas l’élément chiffré.');
  }
  return new ElementChiffre(
    required(element.nom, 'rapport.element.nom'),
    new CategorieDElementChiffre(required(element.categorie, 'rapport.element.categorie')),
    {
      reference: fiche.reference,
      libelle: fiche.description,
    },
  );
};

const toRapport = (rapport: RestRapport, fiche: components['schemas']['RestElementDeFabrication']): CoutDeRevient =>
  new CoutDeRevient(toElement(rapport, fiche), {
    evaluation: new InstantDeTravail(rapport.evaluation),
    activitesEnCours: new ActivitesEnCoursExclues(rapport.activitesEnCours),
    lignes: required(rapport.lignes, 'rapport.lignes').map(toLigne),
    temps: toTemps(rapport.temps, 'rapport.temps'),
    cout: toCout(rapport.cout, 'rapport.cout'),
  });

const estElementInconnu = (failure: unknown): boolean => {
  if (!(failure instanceof HttpErrorResponse)) {
    return false;
  }
  return failure.status === ELEMENT_INCONNU;
};

const hasInvalidPageMetadata = (response: components['schemas']['PageRestElementDeFabrication'], page: number): boolean =>
  !Number.isInteger(response.currentPage)
  || response.currentPage !== page
  || !Number.isInteger(response.pageSize)
  || response.pageSize <= 0
  || !Number.isInteger(response.totalElementsCount)
  || response.totalElementsCount < 0
  || response.content.length > response.pageSize
  || response.content.length > response.totalElementsCount;

const hasIncompletePage = (response: components['schemas']['PageRestElementDeFabrication'], acquired: number): boolean =>
  response.content.length !== Math.min(response.pageSize, response.totalElementsCount - acquired);

const hasChangedPagination = (
  response: components['schemas']['PageRestElementDeFabrication'],
  previous: components['schemas']['PageRestElementDeFabrication'] | undefined,
): boolean =>
  previous !== undefined && (response.totalElementsCount !== previous.totalElementsCount || response.pageSize !== previous.pageSize);

const validateCollectionPage = (
  response: components['schemas']['PageRestElementDeFabrication'],
  acquisition: {
    readonly page: number;
    readonly acquired: number;
    readonly previous: components['schemas']['PageRestElementDeFabrication'] | undefined;
  },
): void => {
  if (hasInvalidPageMetadata(response, acquisition.page)) {
    throw new Error('Pagination incohérente de la collection');
  }
  if (hasChangedPagination(response, acquisition.previous)) {
    throw new Error('Pagination instable de la collection');
  }
  if (hasIncompletePage(response, acquisition.acquired)) {
    throw new Error('Collection incomplète');
  }
};

@Injectable()
export class HttpCoutDeRevient extends CoutDeRevientPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async elementsDisponibles(): Promise<readonly ElementDisponible[]> {
    try {
      return await this.readElements();
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  private async readElements(): Promise<readonly ElementDisponible[]> {
    const elements: ElementDisponible[] = [];
    let page = 0;
    let total: number;
    let previous: components['schemas']['PageRestElementDeFabrication'] | undefined;
    do {
      const response = await this.api.read('/api/elements-de-fabrication', {
        queryParams: { debut: '1970-01-01T00:00:00Z', fin: '2999-12-31T23:59:59Z', page, size: PAGE_SIZE },
      });
      validateCollectionPage(response, { page, acquired: elements.length, previous });
      previous = response;
      elements.push(
        ...response.content.map(element => ({
          id: new ElementChiffreId(required(element.id, 'element.id')),
          identite: new ElementChiffre(
            required(element.nom, 'element.nom'),
            new CategorieDElementChiffre(required(element.categorie, 'element.categorie')),
          ),
        })),
      );
      total = response.totalElementsCount;
      page += 1;
    } while (elements.length < total);
    if (new Set(elements.map(element => element.id.value)).size !== elements.length) {
      throw new Error('Identités dupliquées dans la collection');
    }
    return elements;
  }

  override async rapport(element: ElementChiffreId): Promise<CoutDeRevient | undefined> {
    try {
      const response = await this.api.read(ROUTE, { pathParams: { elementId: element.value } });
      const fiche = await this.api.read('/api/elements-de-fabrication/{id}', { pathParams: { id: element.value } });
      return toRapport(response, fiche);
    } catch (failure) {
      if (estElementInconnu(failure)) {
        return undefined;
      }
      this.errors.handleError(failure);
      throw failure;
    }
  }

  override async exporte(element: ElementChiffreId, format: FormatDExport): Promise<FichierExporte> {
    try {
      const fichier = await this.telecharge(element, format);
      return { nom: required(fichier.filename, 'Content-Disposition.filename'), contenu: fichier.content };
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  private telecharge(element: ElementChiffreId, format: FormatDExport): Promise<DownloadedFile> {
    const pathParams = { elementId: element.value };
    const telechargements: Record<FormatDExport, () => Promise<DownloadedFile>> = {
      EXCEL: () => this.api.download('/api/couts-de-revient/{elementId}/export.xlsx', { pathParams }),
    };
    return telechargements[format]();
  }
}
