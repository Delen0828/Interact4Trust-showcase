import { DetailInteractionConditionBase } from './detailInteractionConditionBase.js';

/**
 * Condition 24: Click Show All
 * A single checkbox toggles uncertainty details for both cities together.
 */
export default class Condition24 extends DetailInteractionConditionBase {
    constructor(svgId, processedData, config, phase = null, conditionSpec = null) {
        super(svgId, processedData, config, phase, conditionSpec);
        this.showAllCheckbox = null;
    }

    render() {
        this.renderBaseChart();
        this.renderControls();
    }

    renderControls() {
        const controls = this.createControlContainer();
        if (!controls) return;

        const control = this.createCheckboxControl(
            `exp3-show-all-${this.svgId}`,
            'Show all',
            '#4B5563',
            (checked) => this.setAllCityDetailsVisibility(checked)
        );
        control.checkbox.setAttribute('data-interaction', 'checkbox-show-all');
        controls.appendChild(control.wrapper);
        this.showAllCheckbox = control.checkbox;
    }

    setupInteractions() {
        // Checkbox interaction handler is attached during control creation.
    }
}
