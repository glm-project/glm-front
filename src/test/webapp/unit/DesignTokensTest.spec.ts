import { readFileSync } from 'node:fs';

const TOKENS_STYLESHEET = 'src/main/webapp/styles.css';

const WCAG_AA_NORMAL_TEXT = 4.5;
const SRGB_LINEAR_SEGMENT_END = 0.03928;
const CHANNEL_STARTS_AFTER_THE_HASH = [1, 3, 5];
const COLOR_ROLE_DECLARATION = /--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g;

interface TextOnBackground {
  text: string;
  background: string;
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

const givenTheColorRoles = (): Map<string, string> => {
  const declarations = readFileSync(TOKENS_STYLESHEET, 'utf8').matchAll(COLOR_ROLE_DECLARATION);
  return new Map([...declarations].map(([, role, hex]) => [role, hex]));
};

const whenMeasuringContrast = (roles: Map<string, string>, pair: TextOnBackground): number => {
  const text = relativeLuminance(hexOf(roles, pair.text));
  const background = relativeLuminance(hexOf(roles, pair.background));
  const lighter = Math.max(text, background);
  const darker = Math.min(text, background);
  return (lighter + 0.05) / (darker + 0.05);
};

const thenItStaysReadable = (contrast: number): void => {
  expect(contrast).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
};

describe('DesignTokensTest', () => {
  describe('Contrast', () => {
    it.each(PAIRS_THE_SCREENS_SHOW)('should show $text on $background above the AA threshold', pair => {
      const roles = givenTheColorRoles();

      const contrast = whenMeasuringContrast(roles, pair);

      thenItStaysReadable(contrast);
    });
  });
});
