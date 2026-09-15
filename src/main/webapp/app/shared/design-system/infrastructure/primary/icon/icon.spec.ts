import { Component, input } from '@angular/core';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { Icon, IconName } from './icon';

@Component({
  imports: [Icon],
  template: '<glm-icon [name]="name()" />',
})
class IconFixture {
  readonly name = input.required<IconName>();
}

const icons: IconName[] = ['menu', 'plus', 'pencil', 'trash2'];

describe('Icon', () => {
  let fixture: ComponentFixture<IconFixture>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconFixture],
      providers: [{ provide: ComponentFixtureAutoDetect, useValue: true }],
    }).compileComponents();
  });

  it.each(icons)('should draw %s as an SVG the bundle already carries', async name => {
    await whenRenderingAnIcon(name);

    thenItDrawsAnSvg();
  });

  const whenRenderingAnIcon = async (name: IconName): Promise<void> => {
    fixture = TestBed.createComponent(IconFixture);
    fixture.componentRef.setInput('name', name);
    await fixture.whenStable();
  };

  const thenItDrawsAnSvg = (): void => {
    const drawing = (fixture.nativeElement as HTMLElement).querySelector('svg');

    expect(drawing).not.toBeNull();
    expect(drawing?.innerHTML.trim()).not.toBe('');
  };
});
