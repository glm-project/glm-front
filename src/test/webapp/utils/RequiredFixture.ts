export const requiredFixture = <T>(value: T | null | undefined, description: string): T => {
  if (value === null || value === undefined) {
    throw new Error(`Missing ${description} fixture.`);
  }
  return value;
};
