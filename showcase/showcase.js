import { ConditionFactory } from './display/conditionFactory.js';
import { study1Groups, study2Groups } from './display/conditions.js';
import { chartConfig, chartURL, iframeCode } from './chartConfig.js';

const config = chartConfig;
const factory = new ConditionFactory();
let activeStudy = location.hash === '#study2' ? 'study2' : 'study1';
let technique = 'ensemble_plot';
let initialized = false;
const status = document.getElementById('status');
const tabs = [...document.querySelectorAll('[role="tab"]')];

function heading(tag, term, id) {
    const element = document.createElement(tag);
    if (id) element.id = id;
    const italic = document.createElement('i');
    italic.textContent = term;
    element.append(italic);
    return element;
}
function label(text) {
    const element = document.createElement('p');
    element.className = 'variable-label';
    element.textContent = text;
    return element;
}
function card(condition, group, level) {
    const panel = document.createElement('section');
    panel.className = `condition-panel condition-${condition.number}`;
    const title = heading(level, condition.title, `title-${condition.number}`);
    title.className = 'condition-title';
    if (condition.qualifier) title.append(document.createTextNode(` · ${condition.qualifier}`));
    const container = document.createElement('div');
    container.className = 'chart-container';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [key, value] of Object.entries({ id: `chart-${condition.number}`, class: 'chart-svg',
        width: 400, height: 300, viewBox: '0 0 400 300', role: 'img',
        'aria-label': `${group}: ${condition.title}${condition.qualifier ? ', ' + condition.qualifier : ''}` })) svg.setAttribute(key, value);
    container.append(svg);
    const actions = document.createElement('div');
    actions.className = 'chart-actions';
    const link = document.createElement('a');
    link.textContent = 'Open chart ↗';
    link.target = '_blank';
    link.rel = 'noopener';
    link.dataset.chart = condition.number;
    link.setAttribute('aria-label', `Open ${group}: ${condition.title} chart`);
    const embed = document.createElement('button');
    embed.type = 'button';
    embed.textContent = 'Share / Embed';
    embed.setAttribute('aria-label', `Share ${group}: ${condition.title} chart`);
    embed.addEventListener('click', () => openShare(condition.number));
    actions.append(link, embed);
    panel.append(title, container, actions);
    return panel;
}
for (const group of study1Groups) {
    const section = document.createElement('section');
    section.className = 'uncertainty-group';
    section.append(label(group.reference ? 'Reference' : 'Uncertainty information'), heading('h3', group.term));
    if (!group.reference && group.cards[0].number !== 1) section.append(label('Perceived interaction quality (PIQ)'));
    const grid = document.createElement('div');
    grid.className = 'visualization-grid' + (group.cards.length === 1 ? ' single' : group.cards.length === 2 ? ' pair' : '');
    for (const condition of group.cards) grid.append(card(condition, group.term, 'h4'));
    section.append(grid);
    document.getElementById('study1-groups').append(section);
}
for (const group of study2Groups) {
    const section = document.createElement('section');
    section.className = 'affordance-group';
    section.append(label('Interaction affordance'), heading('h4', group.term), label('Data complexity'));
    const grid = document.createElement('div');
    grid.className = 'visualization-grid pair';
    for (const condition of group.cards) grid.append(card(condition, group.term, 'h5'));
    section.append(grid);
    document.getElementById('study2-groups').append(section);
}

function showError(error) {
    factory.cleanup();
    console.error('Failed to load showcase:', error);
    status.hidden = false;
    status.setAttribute('role', 'alert');
    status.textContent = `Unable to load the showcase: ${error.message}. Serve this folder over HTTP with its dependency files present.`;
    document.body.dataset.ready = 'error';
}
let redraw = Promise.resolve();
function updateChartLinks() {
    for (const link of document.querySelectorAll('[data-chart]')) {
        link.href = chartURL(Number(link.dataset.chart), technique);
    }
}
function openShare(number) {
    document.getElementById('share-url').value = chartURL(number, technique);
    document.getElementById('share-code').value = iframeCode(number, technique);
    document.getElementById('copy-status').textContent = '';
    document.getElementById('share-dialog').showModal();
}
document.getElementById('close-share').addEventListener('click', () => document.getElementById('share-dialog').close());
for (const button of document.querySelectorAll('[data-copy]')) {
    button.addEventListener('click', async () => {
        const input = document.getElementById(button.dataset.copy);
        try {
            await navigator.clipboard.writeText(input.value);
            document.getElementById('copy-status').textContent = 'Copied.';
        } catch {
            input.focus();
            input.select();
            document.getElementById('copy-status').textContent = 'Press Ctrl+C or Cmd+C to copy the selected text.';
        }
    });
}
updateChartLinks();
function render() {
    if (!initialized) return Promise.resolve();
    redraw = redraw.then(async () => {
        document.body.dataset.ready = 'loading';
        factory.processedData = factory.dataProcessor.reprocessWithNewDate(document.getElementById('dateSelect').value);
        const groups = activeStudy === 'study1' ? study1Groups : study2Groups;
        await factory.renderConditions(groups.flatMap(group => group.cards), technique);
        status.hidden = true;
        document.body.dataset.ready = 'true';
    }).catch(showError);
    return redraw;
}
function activateStudy(study, updateHash = true) {
    activeStudy = study;
    for (const tab of tabs) {
        const selected = tab.getAttribute('aria-controls') === study;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
    }
    if (updateHash) history.replaceState(null, '', '#' + study);
    return render();
}
for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('click', () => activateStudy(tab.getAttribute('aria-controls')));
    tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') next = 1 - index;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        tabs[next].focus();
        activateStudy(tabs[next].getAttribute('aria-controls'));
    });
}
for (const button of document.querySelectorAll('[data-technique]')) {
    button.addEventListener('click', () => {
        technique = button.dataset.technique;
        updateChartLinks();
        for (const option of document.querySelectorAll('[data-technique]')) option.setAttribute('aria-pressed', String(option === button));
        render();
    });
}
window.addEventListener('hashchange', () => activateStudy(location.hash === '#study2' ? 'study2' : 'study1', false));
activateStudy(activeStudy, false);

function updateOpacity(kind, value) {
    if (kind === 'alternative') {
        d3.selectAll('.prediction-line').each(function () {
            const line = d3.select(this);
            // Preserve zero opacity used by interactive conditions to hide lines.
            if (Number(getComputedStyle(this).opacity) > 0) line.style('opacity', value).attr('opacity', value);
        });
    } else {
        d3.selectAll('.confidence-bounds').each(function () {
            const bounds = d3.select(this);
            if (Number(getComputedStyle(this).opacity) > 0) {
                if (this.style.opacity) bounds.style('opacity', value);
                bounds.attr('opacity', value);
            }
        });
    }
}


try {
    const params = new URLSearchParams(location.search);
    const raw = await d3.json(params.get('data') || params.get('dataset') || './data/humidity.json');
    factory.initialize(config, raw.data, document.getElementById('dateSelect').value);
    initialized = true;
    await render();
    document.getElementById('dateSelect').addEventListener('change', render);
    for (const [kind, prefix] of [['alternative', 'alternative'], ['shade', 'shade']]) {
        document.getElementById(`${prefix}OpacitySlider`).addEventListener('input', event => {
            const value = Number(event.target.value);
            document.getElementById(`${prefix}OpacityValue`).textContent = value.toFixed(1);
            updateOpacity(kind, value);
        });
    }
} catch (error) { showError(error); }
window.addEventListener('pagehide', () => factory.cleanup());
window.addEventListener('pageshow', event => { if (event.persisted) render(); });
