import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { EnregistrementDeFichierPort } from '@/gestion/shared/enregistrement-de-fichier/domain/EnregistrementDeFichierPort';
import { EnregistrementDansLeNavigateur } from '@/gestion/shared/enregistrement-de-fichier/infrastructure/secondary/EnregistrementDansLeNavigateur';
import { Provider } from '@angular/core';
import { RapportDActivitePort } from './contexts/releve-des-heures/domain/rapport/RapportDActivitePort';
import { SyntheseDesHeuresPort } from './contexts/releve-des-heures/domain/releve/SyntheseDesHeuresPort';
import { HttpRapportDActivite } from './contexts/releve-des-heures/infrastructure/secondary/HttpRapportDActivite';
import { HttpSyntheseDesHeures } from './contexts/releve-des-heures/infrastructure/secondary/HttpSyntheseDesHeures';

export const releveDesHeuresProvider: Provider[] = [ApiClient, { provide: SyntheseDesHeuresPort, useClass: HttpSyntheseDesHeures }];

export const rapportDActiviteProvider: Provider[] = [
  ApiClient,
  { provide: RapportDActivitePort, useClass: HttpRapportDActivite },
  { provide: EnregistrementDeFichierPort, useClass: EnregistrementDansLeNavigateur },
];
