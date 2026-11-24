export const formatMoney = (cents: number, locale: string, currency: string): string =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
