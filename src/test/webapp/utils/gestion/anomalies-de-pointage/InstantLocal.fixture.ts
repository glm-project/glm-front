export const instantLocalFixture = (local: Date, fraction = ''): string => {
  const iso = local.toISOString();
  return fraction === '' ? iso : `${iso.slice(0, 19)}.${fraction}Z`;
};

const twoDigits = (value: number): string => String(value).padStart(2, '0');

export const instantLocalWithOffsetFixture = (local: Date, fraction = ''): string => {
  const offsetMinutes = -local.getTimezoneOffset();
  const sign = offsetMinutes < 0 ? '-' : '+';
  const offset = `${sign}${twoDigits(Math.floor(Math.abs(offsetMinutes) / 60))}:${twoDigits(Math.abs(offsetMinutes) % 60)}`;
  const date = `${local.getFullYear()}-${twoDigits(local.getMonth() + 1)}-${twoDigits(local.getDate())}`;
  const time = `${twoDigits(local.getHours())}:${twoDigits(local.getMinutes())}:${twoDigits(local.getSeconds())}`;
  const decimals = fraction === '' ? '' : `.${fraction}`;
  return `${date}T${time}${decimals}${offset}`;
};

export const instantFieldTextsFixture = (local: Date): Readonly<{ date: string; time: string }> => ({
  date: `${twoDigits(local.getDate())}/${twoDigits(local.getMonth() + 1)}/${local.getFullYear()}`,
  time: `${twoDigits(local.getHours())}:${twoDigits(local.getMinutes())}:${twoDigits(local.getSeconds())}`,
});
