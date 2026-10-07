import { ConditionFactory } from './display/conditionFactory.js';
import { chartConfig, describeCondition, techniques } from './chartConfig.js';

const factory = new ConditionFactory();
const status = document.getElementById('status');
let condition, technique;

async function render() {
    await factory.renderConditions([condition], technique);
    status.hidden = true;
    document.body.dataset.ready = 'true';
}
function showError(error) {
    factory.cleanup();
    console.error(error);
    status.hidden = false;
    status.setAttribute('role', 'alert');
    status.textContent = `Unable to load chart: ${error.message}`;
    document.body.dataset.ready = 'error';
}
try {
    const params = new URLSearchParams(location.search);
    if (!params.has('condition')) throw new Error('Specify a condition in the chart URL');
    condition = describeCondition(Number(params.get('condition')));
    technique = params.get('technique') || 'ensemble_plot';
    if (!techniques.includes(technique)) throw new Error('Unknown uncertainty technique');
    document.title = `${condition.group}: ${condition.title} · Interact4Trust`;
    d3.select('#chart').append('svg')
        .attr('id', `chart-${condition.number}`).attr('class', 'chart-svg')
        .attr('viewBox', '0 0 400 300').attr('width', 400).attr('height', 300)
        .attr('role', 'img').attr('aria-label', `${condition.group}: ${condition.title}`);
    const raw = await d3.json(params.get('data') || params.get('dataset') || './data/humidity.json');
    factory.initialize(chartConfig, raw.data);
    await render();
} catch (error) { showError(error); }
window.addEventListener('pagehide', () => factory.cleanup());
window.addEventListener('pageshow', event => { if (event.persisted && condition) render().catch(showError); });
