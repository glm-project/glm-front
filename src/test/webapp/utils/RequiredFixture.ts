const isMissingFixture = (value: unknown): value is null | undefined => value === null || value === undefined;

export const requiredFixture = <T>(value: T | null | undefined, description: string): T => {
  if (isMissingFixture(value)) {
    throw new Error(`Missing ${description} fixture.`);
  }
  return value;
};
