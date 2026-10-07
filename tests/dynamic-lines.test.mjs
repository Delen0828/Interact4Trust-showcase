import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DemoFeed, STOCKS, lineHeadPositions, marketDate, motionSpeed, ratioPosition, readConfig, validateSnapshot } from '../dynamic-lines/model.js';

test('reciprocal bounds place the opening price at the exact middle', () => {
  assert.equal(ratioPosition(0.5), 1);
  assert.equal(ratioPosition(1), 0.5);
  assert.equal(ratioPosition(2), 0);
  assert.equal(ratioPosition(0.1), 1);
  assert.equal(ratioPosition(5), 0);
  assert.ok(Math.abs(ratioPosition(0.8) + ratioPosition(1.25) - 1) < 1e-12);
});

test('higher normalized prices advance proportionally faster', () => {
  assert.equal(motionSpeed(1.5) / motionSpeed(1), 1.5);
  assert.equal(motionSpeed(2) / motionSpeed(0.5), 4);
});

test('shared horizontal scale preserves value gaps after every line reaches the border', () => {
  const ratios = [1.13, 1.04, 0.89, 0.98, 1.28, 0.76];
  for (const progress of [0.1, 40, 100, 200, 1_000_000]) {
    const heads = lineHeadPositions(ratios, progress);
    assert.ok(heads.every(x => x >= 0 && x <= 100));
    for (let a = 0; a < ratios.length; a++) {
      for (let b = 0; b < ratios.length; b++) {
        if (ratios[a] > ratios[b]) assert.ok(heads[a] > heads[b]);
      }
    }
    assert.ok(Math.abs((heads[0] - heads[1]) / (heads[1] - heads[2]) - (ratios[0] - ratios[1]) / (ratios[1] - ratios[2])) < 1e-12);
  }
  assert.equal(Math.max(...lineHeadPositions(ratios, 200)), 100);
});

test('a price crossing also crosses the horizontal heads, including after scrolling', () => {
  for (const progress of [20, 1000]) {
    const before = lineHeadPositions([0.9, 1.1, 1.5], progress);
    const tied = lineHeadPositions([1.1, 1.1, 1.5], progress);
    const after = lineHeadPositions([1.2, 1.1, 1.5], progress);
    assert.ok(before[0] < before[1]);
    assert.equal(tied[0], tied[1]);
    assert.ok(after[0] > after[1]);
  }
});

test('URL configuration requires six unique symbols and an HTTP feed', () => {
  const config = readConfig('?symbols=aapl,msft,googl,amzn,nvda,tsla&feed=%2Fquotes&view=chart', 'http://localhost/dynamic-lines/');
  assert.equal(config.feed, 'http://localhost/quotes');
  assert.equal(config.chartOnly, true);
  assert.equal(config.monitorOnly, false);
  assert.equal(readConfig('?view=monitor', 'http://localhost/').monitorOnly, true);
  assert.deepEqual(config.stocks.map(s => s.symbol), STOCKS.map(s => s.symbol));
  assert.throws(() => readConfig('?symbols=AAPL,MSFT', 'http://localhost/'));
  assert.throws(() => readConfig('?symbols=AAPL,AAPL,AAPL,AAPL,AAPL,AAPL', 'http://localhost/'));
  assert.throws(() => readConfig('?feed=javascript:alert(1)', 'http://localhost/'));
  assert.throws(() => readConfig('?feed=https://user:secret@example.com/quotes', 'http://localhost/'));
});

function snapshot() {
  return { sessionDate: '2026-10-07', asOf: new Date().toISOString(), quotes: STOCKS.map(s => ({ symbol: s.symbol, price: s.open, open: s.open })) };
}

test('live snapshots validate the entire basket atomically and retain quote order', () => {
  const data = snapshot();
  data.quotes.reverse();
  const result = validateSnapshot(data, STOCKS.map(s => s.symbol));
  assert.deepEqual(result.quotes.map(q => q.symbol), STOCKS.map(s => s.symbol));
  assert.equal(result.asOf, Date.parse(data.asOf));
  for (const invalid of [null, { ...data, sessionDate: '2026-02-30' }, { ...data, asOf: 'bad' }, { ...data, asOf: new Date(Date.now() + 120_000).toISOString() }, { ...data, quotes: data.quotes.slice(1) }, { ...data, quotes: [...data.quotes, data.quotes[0]] }]) {
    assert.throws(() => validateSnapshot(invalid, STOCKS.map(s => s.symbol)));
  }
  for (const invalid of [0, -1, '100', Infinity, NaN]) {
    const bad = snapshot(); bad.quotes[2].price = invalid;
    assert.throws(() => validateSnapshot(bad, STOCKS.map(s => s.symbol)));
    const badOpen = snapshot(); badOpen.quotes[2].open = invalid;
    assert.throws(() => validateSnapshot(badOpen, STOCKS.map(s => s.symbol)));
  }
});

test('demo uses the New York session date and keeps all prices positive and in range', () => {
  assert.equal(marketDate(new Date('2026-10-08T02:00:00Z')), '2026-10-07');
  const feed = new DemoFeed(STOCKS, () => 1);
  for (let tick = 0; tick < 200; tick++) {
    const data = feed.snapshot();
    assert.equal(data.quotes.length, 6);
    assert.equal(data.sessionDate, marketDate());
    for (const quote of data.quotes) {
      assert.ok(quote.price > 0);
      assert.ok(quote.price / quote.open >= 0.5 && quote.price / quote.open <= 2);
      assert.equal(quote.open, STOCKS.find(s => s.symbol === quote.symbol).open);
    }
  }
});
