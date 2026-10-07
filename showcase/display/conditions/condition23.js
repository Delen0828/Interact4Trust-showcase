import { DetailInteractionConditionBase } from './detailInteractionConditionBase.js';

/**
 * Condition 23: Click Show One
 * Two city checkboxes toggle uncertainty details city-by-city.
 */
export default class Condition23 extends DetailInteractionConditionBase {
    constructor(svgId, processedData, config, phase = null, conditionSpec = null) {
        super(svgId, processedData, config, phase, conditionSpec);
        this.cityCheckboxes = { A: null, B: null };
    }

    render() {
        this.renderBaseChart();
        this.renderControls();
    }

    renderControls() {
        const controls = this.createControlContainer();
        if (!controls) return;

        const labels = this.getCityLabels();
        const colorA = this.config?.colors?.stockA || '#0891B2';
        const colorB = this.config?.colors?.stockB || '#7C3AED';

        const controlA = this.createCheckboxControl(
            `exp3-city-a-${this.svgId}`,
            labels.A,
            colorA,
            (checked) => this.setCityDetailVisibility('A', checked)
        );
        controlA.checkbox.setAttribute('data-stock', 'A');
        controlA.checkbox.setAttribute('data-interaction', 'checkbox-city');
        controls.appendChild(controlA.wrapper);
        this.cityCheckboxes.A = controlA.checkbox;

        const controlB = this.createCheckboxControl(
            `exp3-city-b-${this.svgId}`,
            labels.B,
            colorB,
            (checked) => this.setCityDetailVisibility('B', checked)
        );
        controlB.checkbox.setAttribute('data-stock', 'B');
        controlB.checkbox.setAttribute('data-interaction', 'checkbox-city');
        controls.appendChild(controlB.wrapper);
        this.cityCheckboxes.B = controlB.checkbox;
    }

    setupInteractions() {
        // Checkbox interaction handlers are attached during control creation.
    }
}
