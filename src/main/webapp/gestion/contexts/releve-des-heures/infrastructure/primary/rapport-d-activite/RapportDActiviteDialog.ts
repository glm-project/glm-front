import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { ErrorMessage } from '@/gestion/shared/design-system/infrastructure/primary/error-message/ErrorMessage';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { PeriodeDuRapport } from '../../../domain/rapport/PeriodeDuRapport';
import { RapportDActivitePort } from '../../../domain/rapport/RapportDActivitePort';
import { OperateurReleveId } from '../../../domain/releve/OperateurReleveId';
import { jourCourant } from '../jourCourant';
import { libelleFinsAutomatiques, libellePeriode, libelleResume } from './LibellesRapportDActivite';

export interface RapportDActiviteDialogData {
  readonly operateur: string;
  readonly prenom: string;
  readonly nom: string;
}

@Component({
  selector: 'glm-rapport-d-activite-dialog',
  templateUrl: './RapportDActiviteDialog.html',
  imports: [ErrorMessage, Icon, MatButtonModule, MatDialogModule, RouterLink],
})
export class RapportDActiviteDialog {
  private readonly data = inject<RapportDActiviteDialogData>(MAT_DIALOG_DATA);
  private readonly port = inject(RapportDActivitePort);
  private readonly aujourdhui = jourCourant();
  private readonly operateur = new OperateurReleveId(this.data.operateur);

  protected readonly operateurId = this.data.operateur;
  protected readonly identite = `${this.data.prenom} ${this.data.nom}`;
  protected readonly periode = signal(PeriodeDuRapport.semaineContenant(this.aujourdhui));
  protected readonly libellePeriode = computed(() => libellePeriode(this.periode()));
  protected readonly precedente = computed(() => this.periode().precedente());
  protected readonly suivante = computed(() => this.periode().suivante(this.aujourdhui));
  protected readonly resume = resource({
    params: () => this.periode(),
    loader: ({ params }) => this.port.resume(this.operateur, params),
  });
  protected readonly libelleResume = libelleResume;
  protected readonly libelleFinsAutomatiques = libelleFinsAutomatiques;

  protected parSemaine(): void {
    this.periode.update(periode => periode.enSemaine(this.aujourdhui));
  }

  protected parMois(): void {
    this.periode.update(periode => periode.enMois(this.aujourdhui));
  }
}
