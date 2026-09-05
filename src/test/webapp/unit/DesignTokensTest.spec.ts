import { readFileSync } from 'node:fs';

const TOKENS_STYLESHEET = 'src/main/webapp/styles.css';
const PUPITRE_STYLESHEET = 'src/main/webapp/pupitre/styles.css';
const MATERIAL_BRIDGE_STYLESHEET = 'src/main/webapp/gestion/shared/design-system/infrastructure/primary/material-bridge.css';

const WCAG_AA_NORMAL_TEXT = 4.5;
const SRGB_LINEAR_SEGMENT_END = 0.03928;
const CHANNEL_STARTS_AFTER_THE_HASH = [1, 3, 5];
const COLOR_ROLE_DECLARATION = /--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g;
const STYLE_RULE = /([^{}]+)\{([^{}]*)\}/g;
const THEME_AT_RULE = /(@theme[^{]*)\{([^{}]*)\}/g;
const TOKEN_DECLARATION = /(--[a-z0-9-]+):/g;
const MATERIAL_DECLARATION = /(--mat-sys-[a-z0-9-]+):\s*([^;]+);/g;
const TOKEN_REFERENCE = /^var\((--[a-z0-9-]+)\)$/;

interface TextOnBackground {
  text: string;
  background: string;
}

interface StyleRule {
  selector: string;
  properties: string[];
}

interface Bridging {
  materialToken: string;
  value: string;
}

const PAIRS_THE_SCREENS_SHOW: TextOnBackground[] = [
  { text: 'ink', background: 'canvas' },
  { text: 'ink', background: 'surface' },
  { text: 'ink', background: 'sunken' },
  { text: 'ink-muted', background: 'canvas' },
  { text: 'ink-muted', background: 'surface' },
  { text: 'ink-muted', background: 'sunken' },
  { text: 'accent', background: 'canvas' },
  { text: 'accent', background: 'surface' },
  { text: 'accent', background: 'sunken' },
  { text: 'ok', background: 'surface' },
  { text: 'ok', background: 'sunken' },
  { text: 'nc', background: 'surface' },
  { text: 'nc', background: 'sunken' },
  { text: 'glm', background: 'surface' },
  { text: 'glm', background: 'sunken' },
  { text: 'warn', background: 'surface' },
  { text: 'warn', background: 'sunken' },
  { text: 'on-accent', background: 'accent' },
  { text: 'on-accent', background: 'ok' },
  { text: 'on-accent', background: 'nc' },
  { text: 'on-accent', background: 'glm' },
  { text: 'on-accent', background: 'warn' },
];

const ONLY_THE_ROOT_FONT_SIZE: StyleRule[] = [{ selector: 'html', properties: ['font-size'] }];

const A_THEME_THAT_PUBLISHES_EVERY_TOKEN = ['@theme static'];

const linearChannel = (channel: number): number => {
  const scaled = channel / 255;
  return scaled <= SRGB_LINEAR_SEGMENT_END ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = (hex: string): number => {
  const [red, green, blue] = CHANNEL_STARTS_AFTER_THE_HASH.map(start => parseInt(hex.slice(start, start + 2), 16));
  return 0.2126 * linearChannel(red) + 0.7152 * linearChannel(green) + 0.0722 * linearChannel(blue);
};

const hexOf = (roles: Map<string, string>, role: string): string => {
  const hex = roles.get(role);
  if (hex === undefined) {
    throw new Error(`${TOKENS_STYLESHEET} declares no --color-${role}`);
  }
  return hex;
};

const propertiesOf = (declarations: string): string[] =>
  declarations
    .split(';')
    .map(declaration => declaration.split(':')[0].trim())
    .filter(property => property.length > 0);

const matchesIn = (stylesheet: string, pattern: RegExp): RegExpExecArray[] => [...readFileSync(stylesheet, 'utf8').matchAll(pattern)];

const givenTheColorRoles = (): Map<string, string> =>
  new Map(matchesIn(TOKENS_STYLESHEET, COLOR_ROLE_DECLARATION).map(([, role, hex]) => [role, hex]));

const whenMeasuringContrast = (roles: Map<string, string>, pair: TextOnBackground): number => {
  const text = relativeLuminance(hexOf(roles, pair.text));
  const background = relativeLuminance(hexOf(roles, pair.background));
  const lighter = Math.max(text, background);
  const darker = Math.min(text, background);
  return (lighter + 0.05) / (darker + 0.05);
};

const whatItPointsAt = (value: string): string => {
  const [, token] = TOKEN_REFERENCE.exec(value) ?? [];
  return token ?? value;
};

const themeBlocksOf = (stylesheet: string): RegExpExecArray[] => matchesIn(stylesheet, THEME_AT_RULE);

const givenTheTokensTheThemeDeclares = (): string[] =>
  themeBlocksOf(TOKENS_STYLESHEET)
    .flatMap(([, , declarations]) => [...declarations.matchAll(TOKEN_DECLARATION)])
    .map(([, token]) => token);

const whenReadingTheThemeAtRules = (): string[] => themeBlocksOf(TOKENS_STYLESHEET).map(([, atRule]) => atRule.trim());

const whenReadingTheMaterialBridge = (): Bridging[] =>
  matchesIn(MATERIAL_BRIDGE_STYLESHEET, MATERIAL_DECLARATION).map(([, materialToken, value]) => ({
    materialToken,
    value: value.trim(),
  }));

const whenReadingTheRulesOf = (stylesheet: string): StyleRule[] =>
  matchesIn(stylesheet, STYLE_RULE).map(([, selector, declarations]) => ({
    selector: selector.trim(),
    properties: propertiesOf(declarations),
  }));

const thenItStaysReadable = (contrast: number): void => {
  expect(contrast).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
};

const thenTheySetOnlyTheRootFontSize = (rules: StyleRule[]): void => {
  expect(rules).toEqual(ONLY_THE_ROOT_FONT_SIZE);
};

const thenTheyPublishEveryToken = (atRules: string[]): void => {
  expect(atRules).toEqual(A_THEME_THAT_PUBLISHES_EVERY_TOKEN);
};

const thenNoneOfThemCopiesAValue = (bridgings: Bridging[]): void => {
  expect(bridgings.filter(({ value }) => !TOKEN_REFERENCE.test(value))).toEqual([]);
};

const thenTheyAllPointAtOneOf = (bridgings: Bridging[], tokens: string[]): void => {
  expect(bridgings.filter(({ value }) => !tokens.includes(whatItPointsAt(value)))).toEqual([]);
};

const thenItBridgesSomething = (bridgings: Bridging[]): void => {
  expect(bridgings.length).toBeGreaterThan(0);
};

describe('DesignTokensTest', () => {
  describe('Contrast', () => {
    it.each(PAIRS_THE_SCREENS_SHOW)('should show $text on $background above the AA threshold', pair => {
      const roles = givenTheColorRoles();

      const contrast = whenMeasuringContrast(roles, pair);

      thenItStaysReadable(contrast);
    });
  });

  describe('Pupitre scale', () => {
    it('should scale the pupitre through the root font size alone', () => {
      const rules = whenReadingTheRulesOf(PUPITRE_STYLESHEET);

      thenTheySetOnlyTheRootFontSize(rules);
    });
  });

  describe('Publication', () => {
    it('should publish every token, and not only those a utility class uses', () => {
      const atRules = whenReadingTheThemeAtRules();

      thenTheyPublishEveryToken(atRules);
    });
  });

  describe('Material bridge', () => {
    it('should point every Material system token at a design token, never at a copy of one', () => {
      const bridgings = whenReadingTheMaterialBridge();

      thenItBridgesSomething(bridgings);
      thenNoneOfThemCopiesAValue(bridgings);
    });

    it('should point only at tokens the theme declares', () => {
      const tokens = givenTheTokensTheThemeDeclares();

      const bridgings = whenReadingTheMaterialBridge();

      thenTheyAllPointAtOneOf(bridgings, tokens);
    });
  });
});
