import { DetailInteractionConditionBase } from './detailInteractionConditionBase.js';

/**
 * Condition 22: Hover Show All
 * Hover over either aggregated line to reveal both cities' details.
 */
export default class Condition22 extends DetailInteractionConditionBase {
    constructor(svgId, processedData, config, phase = null, conditionSpec = null) {
        super(svgId, processedData, config, phase, conditionSpec);
        this.activeHoverCount = 0;
    }

    render() {
        this.renderBaseChart();
    }

    setupInteractions() {
        const onEnter = () => {
            this.activeHoverCount += 1;
            this.setAllCityDetailsVisibility(true);
        };

        const onLeave = () => {
            this.activeHoverCount = Math.max(0, this.activeHoverCount - 1);
            if (this.activeHoverCount === 0) {
                this.setAllCityDetailsVisibility(false);
            }
        };

        const hoverZoneA = this.interactionManager.select('hover-zone-a');
        const hoverZoneB = this.interactionManager.select('hover-zone-b');

        hoverZoneA
            .on('mouseenter', onEnter)
            .on('mouseleave', onLeave);

        hoverZoneB
            .on('mouseenter', onEnter)
            .on('mouseleave', onLeave);
    }
}
