import { Component } from '@angular/core';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { Icon } from './icon';

@Component({
  imports: [Icon],
  template: '<glm-icon name="menu" />',
})
class IconFixture {}

describe('Icon', () => {
  let fixture: ComponentFixture<IconFixture>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconFixture],
      providers: [{ provide: ComponentFixtureAutoDetect, useValue: true }],
    }).compileComponents();
  });

  it('should draw the icon it is named as an SVG the bundle already carries', async () => {
    await whenRenderingAnIcon();

    thenItDrawsAnSvg();
  });

  const whenRenderingAnIcon = async (): Promise<void> => {
    fixture = TestBed.createComponent(IconFixture);
    await fixture.whenStable();
  };

  const thenItDrawsAnSvg = (): void => {
    const drawing = (fixture.nativeElement as HTMLElement).querySelector('svg');

    expect(drawing).not.toBeNull();
    expect(drawing?.innerHTML.trim()).not.toBe('');
  };
});
