export const currencySymbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL ?? '₦';
export const currencyLocale = process.env.NEXT_PUBLIC_CURRENCY_LOCALE ?? 'en-NG';

export function formatCurrency(n: number | string): string {
    return `${currencySymbol}${Number(n).toLocaleString(currencyLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCurrencyInput(n: number): string {
    return n > 0 ? Number(n).toLocaleString(currencyLocale) : '';
}

export function parseCurrencyInput(s: string): number {
    const raw = s.replace(/[^0-9.]/g, '');
    return raw === '' ? 0 : Number(raw);
}
