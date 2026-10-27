import { DataProcessor } from './display/base/dataProcessor.js';
import { ChartRenderer } from './display/base/chartRenderer.js';
import { chartConfig } from './chartConfig.js';

// Illustrative theory curve, not measured participant ratings. The gain becomes
// negligible around nine models; keep the same scale throughout the interaction.
const trustRatings = [22, 34, 44, 52, 58, 63, 67, 69, 70, 70.4];
const points = trustRatings.map((trust, i) => ({ count: i + 1, trust }));
const slider = document.getElementById('model-count');
const status = document.getElementById('status');
const mfvElement = document.getElementById('mfv');
const trustElement = document.getElementById('trust');
let count = 2;
let renderers;

function chart(id) {
    const element = document.getElementById(id);
    const width = element.clientWidth;
    const height = element.clientHeight;
    const compact = width < 300;
    const config = {
        ...chartConfig, width, height,
        margin: {
            ...chartConfig.margin, bottom: 56, right: compact ? 24 : 20,
            left: compact ? (id === 'trust' ? 48 : 28) : chartConfig.margin.left
        }
    };
    d3.select(element).attr('viewBox', `0 0 ${width} ${height}`);
    const renderer = new ChartRenderer(id, config);
    renderer.clearAndSetup();
    return renderer;
}

function addAxes(renderer, xAxis, yAxis) {
    const xFormat = xAxis.tickFormat();
    renderer.g.append('g').attr('class', 'grid')
        .attr('transform', `translate(0,${renderer.height})`)
        .call(xAxis.tickSize(-renderer.height).tickFormat(''));
    renderer.g.append('g').attr('class', 'grid')
        .call(yAxis.tickSize(-renderer.width).tickFormat(''));
    renderer.g.append('g').attr('class', 'axis x-axis')
        .attr('transform', `translate(0,${renderer.height})`).call(xAxis.tickSize(6).tickFormat(xFormat));
    renderer.g.append('g').attr('class', 'axis y-axis').call(yAxis.tickSize(6).tickFormat(d3.format('d')));
}

// Use all ten existing scenarios rather than the gallery's five-scenario subset.
// Show only City A's history and its ten original prediction scenarios.
function ensemble(processed) {
    const { A } = processed.stockData;
    return [...d3.group(A.alternatives, d => d.scenario).values()]
        .map((rows, index) => ({ index, values: [A.historical.at(-1), ...rows] }));
}

function draw(processed, models) {
    const mfv = chart('mfv');
    mfv.createScales(processed.stockData, processed.globalYScale);
    mfv.xScale.domain([new Date('2025-05-01'), new Date('2025-06-30')]);
    const dateTicks = mfv.width < 260
        ? [new Date('2025-05-01'), new Date('2025-06-30')]
        : [new Date('2025-05-01'), new Date('2025-06-01'), new Date('2025-06-30')];
    addAxes(mfv, d3.axisBottom(mfv.xScale).tickValues(dateTicks).tickFormat(d3.utcFormat('%m/%d')),
        d3.axisLeft(mfv.yScale).tickValues([0, 25, 50, 75, 100]));
    const origin = processed.stockData.A.historical.at(-1);
    const boundary = mfv.xScale(origin.date);
    mfv.g.append('line').attr('class', 'forecast-boundary')
        .attr('x1', boundary).attr('x2', boundary).attr('y1', 0).attr('y2', mfv.height);
    mfv.g.append('path').datum(processed.stockData.A.historical)
        .attr('class', 'historical-line').attr('stroke', chartConfig.colors.stockA)
        .attr('d', mfv.createLineGenerator());
    const lines = mfv.g.append('g').selectAll('path').data(models).join('path')
        .attr('class', 'prediction-line').attr('data-model', d => d.index + 1)
        .attr('stroke', chartConfig.colors.stockA)
        .attr('d', d => mfv.createLineGenerator()(d.values));

    const trust = chart('trust');
    trust.xScale = d3.scaleLinear().domain([0, modelsCount + 0.5]).range([0, trust.width]);
    trust.yScale = d3.scaleLinear().domain([0, 100]).range([trust.height, 0]);
    const ticks = trust.width < 260 ? [1, 5, 10] : [1, 3, 5, 7, 9, 10];
    addAxes(trust, d3.axisBottom(trust.xScale).tickValues(ticks).tickFormat(d3.format('d')),
        d3.axisLeft(trust.yScale).tickValues([0, 25, 50, 75, 100]));
    trust.g.append('text').attr('class', 'axis-title')
        .attr('x', trust.width / 2).attr('y', trust.height + 40).text('Prediction models');
    trust.g.append('text').attr('class', 'axis-title').attr('transform', 'rotate(-90)')
        .attr('x', -trust.height / 2).attr('y', 13 - trust.margin.left).text('Trust');
    const guide = trust.g.append('line').attr('class', 'current-guide');
    const curve = trust.g.append('path').attr('class', 'trust-line');
    const dots = trust.g.append('g').selectAll('circle').data(points).join('circle')
        .attr('class', 'trust-point').attr('data-model', d => d.count)
        .attr('cx', d => trust.xScale(d.count)).attr('cy', d => trust.yScale(d.trust)).attr('r', 3.5);
    const halo = trust.g.append('circle').attr('class', 'current-halo').attr('r', 12);
    const head = trust.g.append('circle').attr('class', 'current-point').attr('r', 5);
    const currentLabel = trust.g.append('text').attr('class', 'current-label').text('Trust');
    const currentTick = trust.g.append('text').attr('class', 'current-tick').attr('y', trust.height + 20);
    const line = d3.line().x(d => trust.xScale(d.count)).y(d => trust.yScale(d.trust)).curve(d3.curveMonotoneX);

    renderers = { lines, trust, guide, curve, dots, halo, head, currentLabel, currentTick, ticks, line };
    update();
}

function update() {
    const { lines, trust, guide, curve, dots, halo, head, currentLabel, currentTick, ticks, line } = renderers;
    const current = points[count - 1];
    const x = trust.xScale(count);
    const y = trust.yScale(current.trust);
    // Keep the plots and current marker in lockstep while dragging the slider.
    lines.attr('display', d => d.index < count ? null : 'none');
    dots.attr('display', d => d.count <= count ? null : 'none');
    curve.datum(points.slice(0, count)).attr('d', line);
    currentTick.attr('x', x).text(ticks.includes(count) ? '' : count);
    trust.g.selectAll('.x-axis .tick')
        .attr('visibility', value => value !== count && Math.abs(trust.xScale(value) - x) < 18 ? 'hidden' : null);
    for (const circle of [halo, head]) {
        circle.attr('cx', x).attr('cy', y);
    }
    currentLabel.attr('x', x).attr('y', y - 18);
    guide.attr('x1', x).attr('x2', x).attr('y1', y).attr('y2', trust.height);
    slider.value = count;
    slider.disabled = false;
    slider.style.setProperty('--progress', `${(count - 1) / (modelsCount - 1) * 100}%`);
    slider.setAttribute('aria-valuetext', `${count} prediction ${count === 1 ? 'model' : 'models'}`);
    mfvElement.setAttribute('aria-label', `Multi-model forecast with ${count} prediction ${count === 1 ? 'model' : 'models'}`);
    trustElement.setAttribute('aria-label', `Illustrative trust curve: ${count} prediction ${count === 1 ? 'model' : 'models'}, trust ${current.trust} out of 100; levels off around nine models`);
    status.textContent = `${count} prediction ${count === 1 ? 'model' : 'models'}. Illustrative trust: ${current.trust} out of 100.`;
    document.body.dataset.models = count;
}

const modelsCount = points.length;
slider.addEventListener('input', () => {
    if (!renderers) return;
    count = Math.max(1, Math.min(modelsCount, slider.valueAsNumber));
    update();
});

try {
    const raw = await d3.json('./data/humidity.json');
    const processor = new DataProcessor();
    processor.sampledScenarios = [...new Set(raw.data.filter(d => d.scenario).map(d => d.scenario))];
    const processed = processor.processData(raw.data);
    const models = ensemble(processed);
    const observer = new ResizeObserver(() => draw(processed, models));
    observer.observe(document.querySelector('.charts'));
    draw(processed, models);
    document.body.dataset.ready = 'true';
    window.addEventListener('pagehide', event => { if (!event.persisted) observer.disconnect(); });
} catch (error) {
    console.error('Unable to load MFV demo:', error);
    document.body.dataset.ready = 'error';
    status.setAttribute('role', 'alert');
    status.textContent = 'Unable to load forecast data. Serve the showcase folder over HTTP.';
}
