import { DetailInteractionConditionBase } from './detailInteractionConditionBase.js';

/**
 * Condition 21: Hover Show One
 * Hover over a city's aggregated line to reveal only that city's details.
 */
export default class Condition21 extends DetailInteractionConditionBase {
    render() {
        this.renderBaseChart();
    }

    setupInteractions() {
        const hoverZoneA = this.interactionManager.select('hover-zone-a');
        const hoverZoneB = this.interactionManager.select('hover-zone-b');

        hoverZoneA
            .on('mouseenter', () => this.setCityDetailVisibility('A', true))
            .on('mouseleave', () => this.setCityDetailVisibility('A', false));

        hoverZoneB
            .on('mouseenter', () => this.setCityDetailVisibility('B', true))
            .on('mouseleave', () => this.setCityDetailVisibility('B', false));
    }
}
