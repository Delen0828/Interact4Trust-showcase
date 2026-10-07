import { DataProcessor } from './base/dataProcessor.js';

export class ConditionFactory {
    constructor() {
        this.dataProcessor = new DataProcessor();
        this.conditionInstances = new Map();
    }

    initialize(config, rawData, startDate = '05/01') {
        this.config = config;
        this.processedData = this.dataProcessor.processData(rawData, startDate);
    }

    async renderConditions(conditions, technique = 'ensemble_plot') {
        this.cleanup();
        // Fail visibly if any module cannot render; do not ship empty panels silently.
        for (const { number } of conditions) {
            const { default: Condition } = await import(`./conditions/condition${number}.js`);
            const instance = new Condition(`chart-${number}`, this.processedData,
                this.config, null, { technique });
            this.conditionInstances.set(number, instance);
            instance.render();
            instance.setupInteractions();
        }
    }

    cleanup() {
        for (const instance of this.conditionInstances.values()) instance.cleanup();
        d3.selectAll('.chart-svg *').interrupt();
        this.conditionInstances.clear();
    }
}
