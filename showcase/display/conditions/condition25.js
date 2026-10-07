import { DetailInteractionConditionBase } from './detailInteractionConditionBase.js';

const ANIMATION_TIMING = Object.freeze({
    initialDelayMs: 2000,
    transitionMs: 450,
    visibleMs: 1200,
    hiddenMs: 900
});

/**
 * Condition 25: Animation Show One
 * No user input: uncertainty details animate one city at a time.
 */
export default class Condition25 extends DetailInteractionConditionBase {
    constructor(svgId, processedData, config, phase = null, conditionSpec = null) {
        super(svgId, processedData, config, phase, conditionSpec);
        this.timeoutId = null;
        this.isStopped = false;
    }

    render() {
        this.renderBaseChart();
        this.setAllCityDetailsVisibility(false, 0);
    }

    setupInteractions() {
        this.schedule(() => this.runCycle(), ANIMATION_TIMING.initialDelayMs);
    }

    schedule(callback, delayMs) {
        if (this.isStopped) return;
        this.timeoutId = window.setTimeout(() => {
            this.timeoutId = null;
            callback();
        }, delayMs);
    }

    runCycle() {
        if (this.isStopped) return;

        const firstCity = Math.random() < 0.5 ? 'A' : 'B';
        const secondCity = firstCity === 'A' ? 'B' : 'A';

        this.setAllCityDetailsVisibility(false, 0);
        this.setCityDetailVisibility(firstCity, true, ANIMATION_TIMING.transitionMs);
        this.setCityDetailVisibility(secondCity, false, ANIMATION_TIMING.transitionMs);

        this.schedule(() => {
            if (this.isStopped) return;

            this.setCityDetailVisibility(firstCity, false, ANIMATION_TIMING.transitionMs);
            this.setCityDetailVisibility(secondCity, true, ANIMATION_TIMING.transitionMs);

            this.schedule(() => {
                if (this.isStopped) return;

                this.setCityDetailVisibility(secondCity, false, ANIMATION_TIMING.transitionMs);
                this.schedule(() => this.runCycle(), ANIMATION_TIMING.hiddenMs);
            }, ANIMATION_TIMING.visibleMs);
        }, ANIMATION_TIMING.visibleMs);
    }

    cleanup() {
        this.isStopped = true;
        if (this.timeoutId !== null) {
            window.clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.setAllCityDetailsVisibility(false, 0);
        super.cleanup();
    }
}
