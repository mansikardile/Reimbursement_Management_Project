import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const base = searchParams.get('base');

    if (base) {
      // Currency conversion
      const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to fetch exchange rates' }, { status: 502 });
      }
      const data = await res.json();
      return NextResponse.json({ rates: data.rates, base: data.base });
    }

    // Countries list
    const res = await fetch('https://restcountries.com/v3.1/all?fields=name,currencies');
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch countries' }, { status: 502 });
    }
    const data = await res.json();

    // Transform to a cleaner format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countries = data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) => {
        const currencies = Object.entries(c.currencies || {}).map(([code, info]: [string, any]) => ({
          code,
          name: info.name,
          symbol: info.symbol,
        }));
        return {
          name: c.name.common,
          currencies,
        };
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((c: any) => c.currencies.length > 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return NextResponse.json({ countries });
  } catch (error) {
    console.error('Currency API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
