import { DemoFeed, clamp, lineHeadPositions, marketDate, motionSpeed, ratioPosition, readConfig, validateSnapshot } from './model.js';

const $ = selector => document.querySelector(selector);
const svgNS = 'http://www.w3.org/2000/svg';
const icons = {
  share: '<path d="M9 10V2m-3 3 3-3 3 3M5 8H3v8h12V8h-2"/>',
  pause: '<path d="M6 3v12M12 3v12"/>',
  play: '<path d="m5 3 10 6-10 6Z"/>',
  reset: '<path d="M3 7a6 6 0 1 1 0 5M3 3v4h4"/>',
  motion: '<path d="M2 5h7M2 9h4M2 13h7m2-9 5 5-5 5M7 9h9"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 18 18" aria-hidden="true">${icons[name]}</svg>`;
const embedded = document.body.dataset.embed === 'true';
let config;
try {
  config = readConfig(location.search, location.href);
} catch (error) {
  const section = document.createElement('main');
  section.className = 'fatal';
  const title = document.createElement('h1');
  title.textContent = 'Unable to start monitor';
  const message = document.createElement('p');
  message.textContent = error.message;
  section.append(title, message);
  $('#app').append(section);
  document.body.dataset.ready = 'error';
}
if (config) initialize(config);

function initialize(config) {
  const chartOnly = embedded && config.chartOnly;
  const monitorOnly = embedded && config.monitorOnly;
  document.body.classList.toggle('chart-only', chartOnly);
  document.body.classList.toggle('monitor-only', monitorOnly);
  const demo = !config.feed;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  let active = true;
  let pending = false;
  let controller = null;
  let generation = 0;
  let timer = null;
  let animation = null;
  let lastFrame = performance.now();
  let lastSample = 0;
  let sessionDate = '';
  let feedError = '';
  let hasSnapshot = false;
  let sharedProgress = 0;
  let width = 1000;
  let height = 400;
  let plot;
  const source = new DemoFeed(config.stocks);
  const clock = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const series = config.stocks.map(stock => ({ ...stock, price: null, ratio: 1, displayRatio: 1, fromRatio: 1, transitionAt: 0, distance: 0, history: [], visible: true }));

  $('#app').innerHTML = `
    <main class="shell">
      <header class="masthead">
        <div class="brand"><img src="./favicon.svg" alt="">Interact4Trust <span style="color:#bbbcc6;font-weight:400">/</span> <span style="font-weight:400;color:#858995">Showcase</span></div>
        <span class="lab-label">Visualization lab &nbsp; / &nbsp; 02</span>
      </header>
      <section class="hero" aria-labelledby="page-title">
        <div><p class="eyebrow">A study in motion</p><h1 id="page-title">Dynamic lines.</h1><p class="intro">Six stocks. One starting point. Watch value set the pace.</p></div>
        <button class="button primary" type="button" data-share aria-label="Share or embed this monitor">${icon('share')}<span class="share-text">Share / Embed</span></button>
      </section>
      <div class="embed-heading"><h1>${monitorOnly ? 'Stock monitor' : 'Dynamic lines'}</h1><button class="button" type="button" data-share>${icon('share')} Share</button></div>
      <section aria-label="Stock price monitor">
        <div class="monitor-meta">
          <span id="feed-status" class="feed-status" role="status"><span class="status-dot"></span><span id="feed-label">${demo ? 'Simulated feed' : 'Connecting to quote feed'}</span></span>
          <div class="meta-right"><time id="updated-at"></time><span class="refresh-label">Refresh <strong>1s</strong></span></div>
        </div>
        <div class="stocks" id="stocks" role="group" aria-label="${monitorOnly ? 'Stock prices' : 'Toggle stock lines'}"></div>
      </section>
      <section class="chart-panel" aria-labelledby="chart-title">
        <header class="chart-heading">
          <div><h2 id="chart-title">Relative to today’s open<span class="chart-feed-label" ${chartOnly ? '' : 'hidden'} id="chart-feed-label">${demo ? 'Simulated' : 'Connecting'}</span></h2><p class="chart-subtitle"><span id="session-label">${marketDate()}</span> · 1× is the starting price</p></div>
          <div class="chart-controls"><button id="pause" class="button" type="button" aria-pressed="false">${icon('pause')}<span>Pause</span></button><button id="reset" class="button icon-button" type="button" title="Restart drawing trails" aria-label="Restart drawing trails">${icon('reset')}</button></div>
        </header>
        <div class="chart-stage" id="chart-stage">
          <svg id="line-chart" role="img" aria-labelledby="svg-title svg-description"><title id="svg-title">Six stock prices relative to their daily opening prices</title><desc id="svg-description">The logarithmic vertical axis runs from half to twice the opening price, with one times at the center. Higher values draw faster from left to right. Line heads share a horizontal value scale, so higher values stay ahead even at the right edge and overtake in both axes when prices cross. Horizontal position does not represent a shared time axis.</desc><defs><clipPath id="plot-clip"><rect id="clip-rect"/></clipPath></defs><g id="grid"></g><g id="lines" clip-path="url(#plot-clip)"></g><g id="labels"></g><g id="axis"></g></svg>
          <div class="empty-message" id="empty-message" hidden><span>All lines are hidden.</span><button class="button" id="show-all" type="button">Show all six stocks</button></div>
        </div>
        <footer class="chart-footer"><div class="motion-key">${icon('motion')}<span><strong>Higher value. Faster line.</strong> <span class="speed-explanation">1.5× moves 50% faster than 1×.</span></span></div><span class="visible-count" id="visible-count">6 / 6 visible</span></footer>
      </section>
      <p class="error-message" id="feed-error" role="status" hidden></p>
      <footer class="page-footer"><p id="data-note">${demo ? 'Illustrative prices, refreshed every second. Simulated opening prices and movements are not market quotes.' : 'Prices from your configured quote feed. Opening prices use the feed’s trading session.'}<br>Logarithmic scale · 0.5× to 2× · Independent drawing progress, not a shared time axis.</p><span class="credit">Made for interaction.</span></footer>
    </main>
    <dialog id="share-dialog" aria-labelledby="share-title">
      <div class="dialog-heading"><h2 id="share-title">Take the motion with you.</h2><button class="close-button" id="close-share" type="button" aria-label="Close sharing dialog">×</button></div>
      <p>Share a standalone link or add the live visualization to your website.</p>
      <label class="field-label" for="share-url">Shareable link</label><input id="share-url" type="url" readonly><div class="copy-row"><button class="button" data-copy="share-url" type="button">Copy link</button></div>
      <fieldset class="embed-options"><legend>What to embed</legend><label><input type="radio" name="embed-view" value="dashboard" checked> Monitor + chart</label><label><input type="radio" name="embed-view" value="chart"> Chart only</label><label><input type="radio" name="embed-view" value="monitor"> Monitor only</label></fieldset>
      <label class="field-label" for="share-code">Iframe code</label><textarea id="share-code" rows="5" readonly spellcheck="false"></textarea><div class="copy-row"><button class="button primary" data-copy="share-code" type="button">Copy iframe</button></div>
      <p id="copy-status" role="status"></p>
    </dialog>`;
  if (!embedded) $('.embed-heading').hidden = true;
  $(`input[name="embed-view"][value="${chartOnly ? 'chart' : monitorOnly ? 'monitor' : 'dashboard'}"]`).checked = true;

  class RollingNumber {
    constructor(element) { this.element = element; this.value = ''; this.animations = []; }
    set(price) {
      const next = price.toFixed(2);
      this.animations.forEach(animation => animation.cancel());
      this.animations = [];
      this.element.setAttribute('aria-label', `$${next}`);
      const previous = this.value;
      if (previous.length !== next.length) this.element.replaceChildren();
      for (let i = 0; i < next.length; i++) {
        let slot = this.element.children[i];
        if (!slot) {
          slot = document.createElement('span');
          this.element.append(slot);
        }
        slot.setAttribute('aria-hidden', 'true');
        const character = next[i];
        if (character === '.') {
          slot.className = 'punctuation';
          slot.textContent = character;
          continue;
        }
        slot.className = 'digit-window';
        const reel = document.createElement('span');
        reel.className = 'digit-reel';
        const changed = previous.length === next.length && previous[i] !== character && !reducedMotion.matches;
        const chars = changed ? [previous[i], character] : [character];
        for (const char of chars) { const digit = document.createElement('span'); digit.textContent = char; reel.append(digit); }
        slot.replaceChildren(reel);
        if (changed) {
          const goingUp = price >= Number(previous);
          if (!goingUp) { reel.prepend(reel.lastElementChild); }
          const animation = reel.animate(goingUp ? [{ transform: 'translateY(0)' }, { transform: 'translateY(-50%)' }] : [{ transform: 'translateY(-50%)' }, { transform: 'translateY(0)' }], { duration: 620, easing: 'cubic-bezier(.22,.75,.25,1)', fill: 'forwards' });
          this.animations.push(animation);
        }
      }
      this.value = next;
    }
  }

  function svg(tag, attrs, parent) {
    const element = document.createElementNS(svgNS, tag);
    for (const [key, value] of Object.entries(attrs || {})) element.setAttribute(key, value);
    if (parent) parent.append(element);
    return element;
  }

  for (const stock of series) {
    const card = document.createElement(monitorOnly ? 'article' : 'button');
    card.className = 'stock'; card.style.setProperty('--color', stock.color);
    if (!monitorOnly) card.type = 'button';
    card.dataset.symbol = stock.symbol;
    if (!monitorOnly) card.setAttribute('aria-pressed', 'true');
    card.setAttribute('aria-label', monitorOnly ? stock.symbol : `Show ${stock.symbol} chart line`);
    card.innerHTML = '<span class="stock-heading"><span class="swatch"></span><span class="symbol"></span></span><span class="company"></span><span class="price"><span class="currency" aria-hidden="true">$</span><span class="rolling-number">—</span></span><span class="stock-bottom"><span class="change">—</span><span class="multiple">—</span></span>';
    card.querySelector('.symbol').textContent = stock.symbol;
    card.querySelector('.company').textContent = stock.name;
    stock.number = new RollingNumber(card.querySelector('.rolling-number'));
    stock.card = card;
    stock.path = svg('path', { class: 'price-line', stroke: stock.color, 'data-symbol': stock.symbol }, $('#lines'));
    stock.dot = svg('circle', { class: 'endpoint', r: 4, fill: stock.color }, $('#lines'));
    stock.leader = svg('path', { class: 'leader', stroke: stock.color }, $('#labels'));
    stock.label = svg('text', { class: 'end-label', fill: stock.color }, $('#labels'));
    stock.ratioLabel = svg('text', { class: 'end-ratio', fill: stock.color }, $('#labels'));
    if (!monitorOnly) card.addEventListener('click', () => { stock.visible = !stock.visible; updateVisibility(); });
    $('#stocks').append(card);
  }

  function updateVisibility() {
    for (const stock of series) {
      stock.card.setAttribute('aria-pressed', String(stock.visible));
      for (const element of [stock.path, stock.dot, stock.leader, stock.label, stock.ratioLabel]) element.style.display = stock.visible ? '' : 'none';
    }
    const count = series.filter(s => s.visible).length;
    $('#visible-count').textContent = `${count} / 6 visible`;
    $('#empty-message').hidden = count > 0;
    draw();
  }
  $('#show-all').addEventListener('click', () => { series.forEach(s => { s.visible = true; }); updateVisibility(); });

  function resize() {
    const rect = $('#chart-stage').getBoundingClientRect();
    width = Math.max(rect.width, 220); height = Math.max(rect.height, 180);
    plot = { left: width < 500 ? 42 : 48, right: width - (width < 500 ? 65 : 96), top: 30, bottom: height - 40 };
    $('#line-chart').setAttribute('viewBox', `0 0 ${width} ${height}`);
    const clip = $('#clip-rect');
    for (const [key, value] of Object.entries({ x: plot.left - 5, y: plot.top - 5, width: plot.right - plot.left + 10, height: plot.bottom - plot.top + 10 })) clip.setAttribute(key, value);
    $('#grid').replaceChildren(); $('#axis').replaceChildren();
    for (const ratio of [2, 1.5, 1.25, 1, 0.8, 0.65, 0.5]) {
      const y = ratioY(ratio);
      svg('line', { x1: plot.left, x2: plot.right, y1: y, y2: y, class: ratio === 1 ? 'grid-line baseline' : 'grid-line' }, $('#grid'));
      svg('text', { x: plot.left - 12, y: y + 3, class: ratio === 1 ? 'axis-text open-tick' : 'axis-text', 'text-anchor': 'end' }, $('#axis')).textContent = `${ratio}×`;
    }
    for (let i = 0; i <= 4; i++) {
      const x = plot.left + (plot.right - plot.left) * i / 4;
      svg('line', { x1: x, x2: x, y1: plot.top, y2: plot.bottom, class: 'grid-line' }, $('#grid'));
    }
    svg('text', { x: plot.left + 9, y: ratioY(1) - 9, class: 'axis-text baseline-caption' }, $('#axis')).textContent = 'TODAY’S OPEN';
    svg('text', { x: plot.left, y: height - 13, class: 'axis-text' }, $('#axis')).textContent = width < 430 ? 'Independent trails' : 'Each line advances independently';
    svg('text', { x: plot.right, y: height - 13, class: 'axis-text', 'text-anchor': 'end' }, $('#axis')).textContent = 'Motion →';
    draw();
  }
  const ratioY = ratio => plot.top + ratioPosition(ratio) * (plot.bottom - plot.top);
  const progressX = progress => plot.left + progress / 100 * (plot.right - plot.left);

  function draw() {
    if (!plot || monitorOnly) return;
    const visible = [];
    const heads = lineHeadPositions(series.map(stock => stock.displayRatio), sharedProgress);
    for (const [index, stock] of series.entries()) {
      if (!stock.visible || !stock.history.length) continue;
      const head = heads[index];
      const start = stock.distance - head;
      const points = stock.history.filter(point => point.distance >= start - 2);
      const x = progressX(head);
      const y = ratioY(stock.displayRatio);
      const path = points.map((point, i) => `${i ? 'L' : 'M'}${progressX(point.distance - start).toFixed(2)},${ratioY(point.ratio).toFixed(2)}`).join(' ');
      stock.path.setAttribute('d', `${path} L${x.toFixed(2)},${y.toFixed(2)}`);
      stock.dot.setAttribute('cx', x); stock.dot.setAttribute('cy', y);
      stock.path.dataset.ratio = stock.displayRatio.toFixed(4);
      stock.path.dataset.speed = motionSpeed(stock.displayRatio).toFixed(4);
      stock.path.dataset.progress = stock.distance.toFixed(4);
      visible.push({ stock, x, y, labelY: y });
    }
    // Keep six endpoint labels readable when prices converge or cross.
    visible.sort((a, b) => a.y - b.y);
    const spacing = width < 500 ? 27 : 29;
    visible.forEach((point, i) => { point.labelY = Math.max(point.y, i ? visible[i - 1].labelY + spacing : plot.top); });
    for (let i = visible.length - 1; i >= 0; i--) {
      visible[i].labelY = Math.min(visible[i].labelY, i === visible.length - 1 ? plot.bottom - 9 : visible[i + 1].labelY - spacing);
    }
    for (const { stock, x, y, labelY } of visible) {
      const labelX = Math.min(x + 12, plot.right + 12);
      stock.label.setAttribute('x', labelX); stock.label.setAttribute('y', labelY - 2); stock.label.textContent = stock.symbol;
      stock.ratioLabel.setAttribute('x', labelX); stock.ratioLabel.setAttribute('y', labelY + 11); stock.ratioLabel.textContent = `${stock.ratio.toFixed(2)}×${stock.ratio < 0.5 ? ' ↓' : stock.ratio > 2 ? ' ↑' : ''}`;
      stock.leader.setAttribute('d', Math.abs(labelY - y) > 12 ? `M${x + 3},${y} L${labelX - 4},${labelY}` : '');
    }
  }

  function clearTrails() {
    sharedProgress = 0;
    for (const stock of series) {
      stock.distance = 0;
      stock.history = hasSnapshot ? [{ distance: 0, ratio: stock.displayRatio }] : [];
    }
    draw();
  }
  $('#reset').addEventListener('click', clearTrails);

  function applySnapshot(snapshot) {
    const newSession = sessionDate !== snapshot.sessionDate;
    if (snapshot.asOf < lastSample && !newSession) throw new Error('The feed returned an older snapshot.');
    sessionDate = snapshot.sessionDate;
    lastSample = snapshot.asOf;
    const now = performance.now();
    for (let i = 0; i < series.length; i++) {
      const stock = series[i];
      const quote = snapshot.quotes[i];
      stock.price = quote.price; stock.open = quote.open;
      stock.fromRatio = stock.displayRatio;
      stock.ratio = quote.price / quote.open;
      stock.transitionAt = now;
      if (!hasSnapshot || newSession || reducedMotion.matches) stock.displayRatio = stock.fromRatio = stock.ratio;
      stock.number.set(quote.price);
      const percent = (stock.ratio - 1) * 100;
      const change = stock.card.querySelector('.change');
      change.textContent = `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
      change.classList.toggle('negative', percent < 0);
      stock.card.querySelector('.multiple').textContent = `${stock.ratio.toFixed(2)}×`;
      stock.card.setAttribute('aria-label', `${stock.symbol}, $${quote.price.toFixed(2)}, ${percent >= 0 ? 'up' : 'down'} ${Math.abs(percent).toFixed(2)} percent from open.${monitorOnly ? '' : ' Toggle chart line.'}`);
    }
    hasSnapshot = true;
    if (newSession) clearTrails();
    $('#session-label').textContent = sessionDate;
    $('#updated-at').textContent = `${clock.format(lastSample)} ET`;
    $('#updated-at').dateTime = new Date(lastSample).toISOString();
    feedError = '';
    if (reducedMotion.matches && !monitorOnly) advance(1, now);
    updateStatus();
    document.body.dataset.ready = 'true';
  }

  function updateStatus() {
    const stale = !demo && hasSnapshot && Date.now() - lastSample > 10_000;
    const state = paused ? 'paused' : feedError ? 'error' : stale ? 'stale' : 'active';
    const text = paused ? `${demo ? 'Simulation' : 'Feed'} paused` : feedError ? 'Feed unavailable' : stale ? 'Delayed quotes' : demo ? 'Simulated feed' : hasSnapshot ? 'Connected quote feed' : 'Connecting to quote feed';
    $('#feed-status').dataset.state = state;
    if ($('#feed-label').textContent !== text) $('#feed-label').textContent = text;
    $('#chart-feed-label').textContent = text;
    const error = feedError ? `${feedError} ${hasSnapshot ? 'Showing the last received prices.' : 'Waiting for valid quotes.'} Retrying every second.` : stale ? `The feed timestamp is more than 10 seconds old. Showing quotes from ${clock.format(lastSample)} ET.` : '';
    $('#feed-error').hidden = !error;
    $('#feed-error').textContent = error;
    return state;
  }

  async function poll() {
    if (!active || paused || document.hidden || pending) return;
    pending = true;
    const requestGeneration = generation;
    let timeout;
    try {
      let snapshot;
      if (demo) snapshot = source.snapshot();
      else {
        controller = new AbortController();
        timeout = setTimeout(() => controller?.abort(), 5000);
        const response = await fetch(config.feed, { signal: controller.signal, cache: 'no-store', credentials: 'omit', headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`Quote feed returned HTTP ${response.status}.`);
        snapshot = validateSnapshot(await response.json(), series.map(s => s.symbol));
      }
      if (active && !paused && requestGeneration === generation) applySnapshot(snapshot);
    } catch (error) {
      if (requestGeneration === generation && active && !paused) {
        feedError = error.name === 'AbortError' ? 'Quote request timed out.' : error.message;
        updateStatus();
        document.body.dataset.ready = hasSnapshot ? 'true' : 'error';
      }
    } finally {
      clearTimeout(timeout);
      pending = false;
      controller = null;
    }
  }

  function advance(dt, now) {
    sharedProgress = Math.min(200, sharedProgress + motionSpeed(1) * dt);
    for (const stock of series) {
      const t = clamp((now - stock.transitionAt) / 620, 0, 1);
      stock.displayRatio = reducedMotion.matches ? stock.ratio : stock.fromRatio + (stock.ratio - stock.fromRatio) * (1 - (1 - t) ** 3);
      stock.distance += motionSpeed(stock.displayRatio) * dt;
      const previous = stock.history.at(-1);
      if (!previous || stock.distance - previous.distance > 0.55) stock.history.push({ distance: stock.distance, ratio: stock.displayRatio });
      while (stock.history.length > 2 && stock.history[1].distance < stock.distance - 102) stock.history.shift();
    }
    draw();
  }

  function frame(now) {
    const dt = Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;
    if (!paused && !document.hidden && hasSnapshot && !reducedMotion.matches && !['error', 'stale'].includes($('#feed-status').dataset.state)) advance(dt, now);
    if (active) animation = requestAnimationFrame(frame);
  }

  function cancelRequest() { generation++; controller?.abort(); }
  $('#pause').addEventListener('click', () => {
    paused = !paused;
    $('#pause').setAttribute('aria-pressed', String(paused));
    $('#pause').innerHTML = `${icon(paused ? 'play' : 'pause')}<span>${paused ? 'Resume' : 'Pause'}</span>`;
    if (paused) {
      cancelRequest();
      series.forEach(s => s.number.animations.forEach(a => a.pause()));
    } else {
      series.forEach(s => s.number.animations.forEach(a => a.play()));
      lastFrame = performance.now(); poll();
    }
    updateStatus();
  });

  if (!monitorOnly) {
    const observer = new ResizeObserver(resize);
    observer.observe($('#chart-stage'));
    resize();
  }

  function shareURL(file, view) {
    const url = new URL(file, location.href);
    if (new URLSearchParams(location.search).has('symbols')) url.searchParams.set('symbols', series.map(s => s.symbol).join(','));
    if (config.feed) url.searchParams.set('feed', config.feed);
    if (view === 'chart' || view === 'monitor') url.searchParams.set('view', view);
    return url.href;
  }
  function updateShare() {
    const view = $('input[name="embed-view"]:checked').value;
    $('#share-url').value = shareURL('index.html');
    const url = shareURL('embed.html', view).replaceAll('&', '&amp;').replaceAll('"', '&quot;');
    $('#share-code').value = `<iframe\n  src="${url}"\n  title="Dynamic lines — ${demo ? 'simulated' : 'live'} stock ${view === 'chart' ? 'comparison' : 'monitor'}"\n  width="1100" height="${view === 'chart' ? '420' : view === 'monitor' ? '240' : '760'}"\n  style="border:0;width:100%;max-width:1100px"\n  loading="lazy"\n></iframe>`;
  }
  document.querySelectorAll('[data-share]').forEach(button => button.addEventListener('click', () => { updateShare(); $('#copy-status').textContent = ''; $('#share-dialog').showModal(); }));
  $('#close-share').addEventListener('click', () => $('#share-dialog').close());
  document.querySelectorAll('input[name="embed-view"]').forEach(input => input.addEventListener('change', updateShare));
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    const field = document.getElementById(button.dataset.copy);
    try {
      await navigator.clipboard.writeText(field.value);
      $('#copy-status').textContent = 'Copied. Ready to share.';
    } catch {
      field.focus(); field.select();
      $('#copy-status').textContent = 'Press Cmd+C or Ctrl+C to copy the selected text.';
    }
  }));

  function start() {
    active = true;
    lastFrame = performance.now();
    poll();
    timer = setInterval(() => { updateStatus(); poll(); }, 1000);
    if (!monitorOnly) animation = requestAnimationFrame(frame);
  }
  function stop() {
    active = false;
    clearInterval(timer); cancelAnimationFrame(animation); cancelRequest();
    series.forEach(s => s.number.animations.forEach(a => a.cancel()));
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelRequest();
    else { lastFrame = performance.now(); updateStatus(); poll(); }
  });
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', event => { if (event.persisted) start(); });
  reducedMotion.addEventListener('change', () => {
    series.forEach(s => { s.displayRatio = s.ratio; });
    draw();
  });
  start();
}
