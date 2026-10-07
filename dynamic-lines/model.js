export const STOCKS = Object.freeze([
  { symbol: 'AAPL', name: 'Apple', open: 224.50, level: 1.13, color: '#6c58d9' },
  { symbol: 'MSFT', name: 'Microsoft', open: 421.20, level: 1.04, color: '#219b87' },
  { symbol: 'GOOGL', name: 'Alphabet', open: 168.40, level: 0.89, color: '#3d8aca' },
  { symbol: 'AMZN', name: 'Amazon', open: 186.30, level: 0.98, color: '#cc8429' },
  { symbol: 'NVDA', name: 'NVIDIA', open: 118.80, level: 1.28, color: '#cb567b' },
  { symbol: 'TSLA', name: 'Tesla', open: 243.10, level: 0.76, color: '#818b32' },
]);

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
// A logarithmic axis gives reciprocal bounds equal room around today's open.
export function ratioPosition(ratio) {
  return (1 - Math.log2(clamp(ratio, 0.5, 2))) / 2;
}

// Value mode encodes price in speed; equal mode uses a shared constant pace.
export const motionSpeed = (ratio, motion = 'value') => motion === 'equal' ? 5 : 5 * clamp(ratio, 0.5, 2);

// Equal-speed heads stay aligned. In value mode, heads preserve proportional
// value gaps at the edge and cross horizontally when prices cross.
export function lineHeadPositions(ratios, progress, motion = 'value') {
  if (motion === 'equal') return ratios.map(() => clamp(progress, 0, 100));
  const values = ratios.map(ratio => clamp(ratio, 0.5, 2));
  const scale = Math.min(Math.max(0, progress), 100 / Math.max(...values));
  return values.map(value => value * scale);
}

export function readConfig(search, baseURL) {
  const params = new URLSearchParams(search);
  const symbols = params.has('symbols') ? params.get('symbols').split(',').map(s => s.trim().toUpperCase()) : STOCKS.map(s => s.symbol);
  if (symbols.length !== 6 || new Set(symbols).size !== 6 || symbols.some(s => !/^[A-Z][A-Z0-9.-]{0,9}$/.test(s))) {
    throw new Error('Choose exactly six different stock symbols in the symbols URL parameter.');
  }
  let feed = null;
  if (params.has('feed')) {
    const url = new URL(params.get('feed'), baseURL);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('The quote feed must be an HTTP or HTTPS URL without login credentials.');
    feed = url.href;
  }
  return {
    stocks: symbols.map((symbol, i) => ({ ...(STOCKS.find(s => s.symbol === symbol) || { name: symbol, open: 100, level: STOCKS[i].level }), symbol, color: STOCKS[i].color })),
    feed,
    motion: params.get('motion') === 'equal' ? 'equal' : 'value',
    chartOnly: params.get('view') === 'chart',
    monitorOnly: params.get('view') === 'monitor',
  };
}

export function marketDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function validateSnapshot(data, symbols) {
  if (!data || !Array.isArray(data.quotes) || !/^\d{4}-\d{2}-\d{2}$/.test(data.sessionDate || '')) {
    throw new Error('Feed needs a sessionDate and a quotes array.');
  }
  const sessionTime = Date.parse(`${data.sessionDate}T12:00:00Z`);
  if (!Number.isFinite(sessionTime) || new Date(sessionTime).toISOString().slice(0, 10) !== data.sessionDate) throw new Error('Feed sessionDate is invalid.');
  if (typeof data.asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(data.asOf)) throw new Error('Feed needs an ISO timestamp in asOf.');
  const asOf = Date.parse(data.asOf);
  if (!Number.isFinite(asOf)) throw new Error('Feed needs an ISO timestamp in asOf.');
  if (asOf > Date.now() + 30_000) throw new Error('The quote timestamp is in the future.');
  return {
    sessionDate: data.sessionDate,
    asOf,
    quotes: symbols.map(symbol => {
      const matches = data.quotes.filter(q => q.symbol === symbol);
      const quote = matches[0];
      if (matches.length !== 1 || !Number.isFinite(quote.price) || quote.price <= 0 || !Number.isFinite(quote.open) || quote.open <= 0) {
        throw new Error(`Feed needs one valid price and today's open for ${symbol}.`);
      }
      return { symbol, price: quote.price, open: quote.open };
    }),
  };
}

export class DemoFeed {
  constructor(stocks, random = Math.random) {
    this.stocks = stocks;
    this.random = random;
    this.values = stocks.map(s => s.level);
    this.date = marketDate();
  }
  snapshot() {
    const date = marketDate();
    if (date !== this.date) {
      this.values = this.stocks.map(s => s.level);
      this.date = date;
    }
    return {
      sessionDate: this.date,
      asOf: Date.now(),
      quotes: this.stocks.map((stock, i) => {
        // Deliberately illustrative variation makes the motion visible in a demo.
        this.values[i] = clamp(this.values[i] + (stock.level - this.values[i]) * 0.18 + (this.random() - 0.5) * 0.09, 0.53, 1.94);
        return { symbol: stock.symbol, open: stock.open, price: Math.round(stock.open * this.values[i] * 100) / 100 };
      }),
    };
  }
}
