import { Component } from '@angular/core';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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

    fixture = TestBed.createComponent(HeaderFixture);
    await fixture.whenStable();
  });

  it('should show the heading its front gives it', () => {
    const heading: HTMLElement = fixture.debugElement.query(By.css('[data-selector="header-heading"]')).nativeElement;

    expect(heading.textContent.trim()).toBe('glmfront');
  });

  it('should show what its front puts in it', () => {
    const header = fixture.nativeElement as HTMLElement;

    expect(header.querySelector('[data-selector="front-action"]')).not.toBeNull();
  });
});
