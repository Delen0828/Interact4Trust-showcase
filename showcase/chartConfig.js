import { study1Groups, study2Groups } from './display/conditions.js';

export const chartConfig = {
    width: 400, height: 300,
    margin: { top: 20, right: 20, bottom: 40, left: 50 },
    colors: { historical: '#6c757d', stockA: '#007bff', stockB: '#fd7e14' }
};
export const techniques = ['confidence_interval', 'ensemble_plot', 'combined_plot'];

export function describeCondition(number) {
    for (const [study, groups] of [['study1', study1Groups], ['study2', study2Groups]]) {
        for (const group of groups) {
            const condition = group.cards.find(card => card.number === number);
            if (condition) return { ...condition, study, group: group.term };
        }
    }
    throw new Error('Unknown chart condition');
}

export function chartURL(number, technique = 'ensemble_plot') {
    const condition = describeCondition(number);
    const url = new URL('./chart.html', location.href);
    url.searchParams.set('condition', number);
    if (condition.study === 'study2') url.searchParams.set('technique', technique);
    const params = new URLSearchParams(location.search);
    for (const key of ['data', 'dataset']) {
        if (params.has(key)) url.searchParams.set(key, params.get(key));
    }
    return url.href;
}

export function iframeCode(number, technique) {
    const { title, group } = describeCondition(number);
    const url = chartURL(number, technique).replaceAll('&', '&amp;').replaceAll('"', '&quot;');
    const height = [23, 24].includes(number) ? 350 : 300;
    return `<iframe src="${url}" title="${group}: ${title}" width="400" height="${height}" style="border:0;max-width:100%" loading="lazy"></iframe>`;
}
