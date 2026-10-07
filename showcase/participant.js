import { DataProcessor } from './display/base/dataProcessor.js';
import Condition21 from './display/conditions/condition21.js';

const predictionForm = document.getElementById('prediction-form');
const surveyForm = document.getElementById('survey-form');
let chart, interacted = false, sliderMoved = false;

function addRatings(container, name) {
    for (let value = 1; value <= 7; value++) {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio'; input.name = name; input.value = value; input.required = true;
        const text = document.createElement('span'); text.textContent = value;
        label.append(input, text); container.append(label);
    }
}
addRatings(document.getElementById('confidence-options'), 'confidence');
for (const container of document.querySelectorAll('[data-rating]')) addRatings(container, container.dataset.rating);

function markInteraction() {
    interacted = true;
    const status = document.getElementById('interaction-status');
    status.textContent = '✓ Chart explored. Complete the questions to continue.';
    status.classList.add('complete');
    document.body.dataset.interacted = 'true';
    document.getElementById('form-status').textContent = '';
}
function bindChartInteractions() {
    for (const stock of ['A', 'B']) {
        let pinned = false;
        const label = stock === 'A' ? 'Zorvani' : 'Kelthar';
        d3.select(`#participant-chart .hover-zone-${stock.toLowerCase()}`)
            .attr('tabindex', 0).attr('role', 'button')
            .attr('aria-label', `Explore ${label} forecast uncertainty`)
            .attr('aria-pressed', 'false')
            .on('mouseenter', () => { chart.setCityDetailVisibility(stock, true); markInteraction(); })
            .on('mouseleave', () => chart.setCityDetailVisibility(stock, pinned))
            .on('focus', () => { chart.setCityDetailVisibility(stock, true); markInteraction(); })
            .on('blur', () => chart.setCityDetailVisibility(stock, pinned))
            .on('click', function () { pinned = !pinned; chart.setCityDetailVisibility(stock, pinned); d3.select(this).attr('aria-pressed', String(pinned)); markInteraction(); })
            .on('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.dispatchEvent(new MouseEvent('click')); }
            });
    }
}
function showStep(next) {
    for (const name of ['prediction', 'survey', 'complete']) document.getElementById(`${name}-step`).hidden = name !== next;
    if (next !== 'prediction') document.getElementById(`${next}-title`).focus();
}
document.getElementById('probability').addEventListener('input', event => {
    sliderMoved = true;
    document.getElementById('probability-status').textContent = `${event.target.value}% probability that Zorvani will have higher humidity`;
    document.getElementById('form-status').textContent = '';
});
predictionForm.addEventListener('submit', event => {
    event.preventDefault();
    const status = document.getElementById('form-status');
    if (!interacted) { status.textContent = 'Explore a dashed forecast line before continuing.'; return; }
    if (!sliderMoved) { status.textContent = 'Move the probability slider before continuing.'; document.getElementById('probability').focus(); return; }
    showStep('survey');
});
document.getElementById('back').addEventListener('click', () => { showStep('prediction'); document.getElementById('continue').focus(); });
surveyForm.addEventListener('submit', event => {
    event.preventDefault();
    const predictions = new FormData(predictionForm), survey = new FormData(surveyForm);
    const rows = [
        ['Probability Zorvani is higher', `${predictions.get('probability')}%`],
        ['Estimated humidity · Zorvani', `${predictions.get('humidityA')}%`],
        ['Estimated humidity · Kelthar', `${predictions.get('humidityB')}%`],
        ['Prediction confidence', `${predictions.get('confidence')} / 7`],
        ['Travel preference', predictions.get('destination')],
        ['Trust in forecast', `${survey.get('trust')} / 7`],
        ['Ease of exploration', `${survey.get('ease')} / 7`],
        ['Usefulness of uncertainty', `${survey.get('usefulness')} / 7`]
    ];
    const summary = document.getElementById('response-summary'); summary.replaceChildren();
    for (const [label, value] of rows) {
        const dt = document.createElement('dt'), dd = document.createElement('dd');
        dt.textContent = label; dd.textContent = value; summary.append(dt, dd);
    }
    showStep('complete');
});
document.getElementById('restart').addEventListener('click', () => {
    predictionForm.reset(); surveyForm.reset(); interacted = false; sliderMoved = false;
    document.body.dataset.interacted = 'false';
    document.getElementById('interaction-status').textContent = '⚠ Interaction required: hover or click an interactive chart element to continue';
    document.getElementById('interaction-status').classList.remove('complete');
    const probabilityStatus = document.getElementById('probability-status');
    const warning = document.createElement('span'); warning.textContent = '⚠ You must move the slider to continue';
    probabilityStatus.replaceChildren('Please move the slider to indicate your prediction', document.createElement('br'), warning);
    document.getElementById('form-status').textContent = '';
    document.getElementById('response-summary').replaceChildren();
    if (chart) { chart.render(); chart.setupInteractions(); bindChartInteractions(); }
    showStep('prediction');
});

try {
    const raw = await d3.json('./data/humidity.json');
    const data = new DataProcessor().processData(raw.data);
    data.globalYScale = [0, 100];
    chart = new Condition21('participant-chart', data, {
        width: 760, height: 500,
        margin: { top: 30, right: 24, bottom: 62, left: 78 },
        colors: { stockA: '#a9224d', stockB: '#277965' },
        labels: { stockA: 'Zorvani', stockB: 'Kelthar' },
        showAxisTitles: true, xAxisTitle: 'Date', yAxisTitle: 'Humidity'
    }, 2, { technique: 'confidence_interval' });
    chart.render(); chart.setupInteractions(); bindChartInteractions();
    document.getElementById('chart-status').hidden = true;
    document.getElementById('continue').disabled = false;
    document.body.dataset.ready = 'true';
} catch (error) {
    console.error(error);
    document.getElementById('chart-status').textContent = `Unable to load forecast: ${error.message}`;
    document.getElementById('chart-status').setAttribute('role', 'alert');
    document.body.dataset.ready = 'error';
}
window.addEventListener('pagehide', () => chart?.cleanup());
window.addEventListener('pageshow', event => {
    if (event.persisted && chart) { chart.render(); chart.setupInteractions(); bindChartInteractions(); }
});
