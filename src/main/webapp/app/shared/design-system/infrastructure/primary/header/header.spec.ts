import { Component } from '@angular/core';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { dataSelector } from '@test/utils/DataSelector';
import { Header } from './header';

@Component({
  imports: [Header],
  template: '<glm-header heading="glmfront"><button type="button" data-selector="front-action">Se déconnecter</button></glm-header>',
})
class HeaderFixture {}

describe('Header', () => {
  let fixture: ComponentFixture<HeaderFixture>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderFixture],
      providers: [{ provide: ComponentFixtureAutoDetect, useValue: true }],
    }).compileComponents();
  });

  it('should show the heading its front gives it', async () => {
    await whenRenderingAHeaderComposedByItsFront();

    thenItShowsTheHeading('glmfront');
  });

  it('should show what its front puts in it', async () => {
    await whenRenderingAHeaderComposedByItsFront();

    thenItShowsTheActionOfItsFront();
  });

  const whenRenderingAHeaderComposedByItsFront = async (): Promise<void> => {
    fixture = TestBed.createComponent(HeaderFixture);
    await fixture.whenStable();
  };

  const thenItShowsTheHeading = (heading: string): void => {
    const shown: HTMLElement = fixture.debugElement.query(By.css(dataSelector('header-heading'))).nativeElement;

    expect(shown.textContent.trim()).toBe(heading);
  };

  const thenItShowsTheActionOfItsFront = (): void => {
    const header = fixture.nativeElement as HTMLElement;

    expect(header.querySelector(dataSelector('front-action'))).not.toBeNull();
  };
});
