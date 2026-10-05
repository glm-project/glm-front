import { Component, computed, input, output, signal } from '@angular/core';
import { PeriodeConsultable } from '../../../../domain/PeriodeConsultable';
import { MoisCalendaire } from '../../../../domain/semaine/MoisCalendaire';
import { SemaineISO } from '../../../../domain/semaine/SemaineISO';
import { LIBELLES_MES_POINTAGES } from '../LibellesMesPointages';

@Component({
  selector: 'glm-choix-de-semaine',
  templateUrl: './choix-de-semaine.html',
  styleUrl: './choix-de-semaine.css',
})
export class ChoixDeSemaine {
  readonly periode = input.required<PeriodeConsultable>();
  readonly semaineAffichee = input.required<SemaineISO>();
  readonly semaineChoisie = output<SemaineISO>();
  readonly fermetureDemandee = output();
  protected readonly moisAffiche = computed(() => MoisCalendaire.deLaSemaine(this.semaineAffichee()));
  protected readonly moisDeLAnnee = computed(() => MoisCalendaire.deLAnnee(this.moisAffiche().annee));
  protected readonly moisChoisi = signal<MoisCalendaire | undefined>(undefined);
  protected readonly labels = LIBELLES_MES_POINTAGES;

  protected choisirLeMois(mois: MoisCalendaire): void {
    this.moisChoisi.set(mois);
  }

  protected revenirAuxMois(): void {
    this.moisChoisi.set(undefined);
  }

  protected estLaSemaineCourante(semaine: SemaineISO): boolean {
    return semaine.estLaMeme(this.periode().semaineCourante);
  }
}
