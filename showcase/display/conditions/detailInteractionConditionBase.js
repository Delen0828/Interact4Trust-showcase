import { ChartRenderer } from '../base/chartRenderer.js';
import { InteractionManager } from '../base/interactionManager.js';

const TECHNIQUE_TO_DETAIL = Object.freeze({
    ensemble_plot: { alternatives: true, confidenceBounds: false },
    confidence_interval: { alternatives: false, confidenceBounds: true },
    combined_plot: { alternatives: true, confidenceBounds: true }
});

export class DetailInteractionConditionBase {
    constructor(svgId, processedData, config, phase = null, conditionSpec = null) {
        this.svgId = svgId;
        this.data = processedData;
        this.config = config;
        this.phase = phase;
        this.conditionSpec = conditionSpec || {};

        this.chartRenderer = new ChartRenderer(svgId, config, phase);
        this.interactionManager = new InteractionManager(svgId);

        this.detailTargets = {
            A: { alternatives: null, confidenceBounds: null },
            B: { alternatives: null, confidenceBounds: null }
        };
        this.controlContainer = null;

        this.technique = this.resolveTechnique();
        this.detailConfig = TECHNIQUE_TO_DETAIL[this.technique];
    }

    resolveTechnique() {
        const technique = this.conditionSpec?.technique || null;
        if (technique && TECHNIQUE_TO_DETAIL[technique]) {
            return technique;
        }
        return 'ensemble_plot';
    }

    getCityLabels() {
        return {
            A: this.config?.labels?.stockA || 'City A',
            B: this.config?.labels?.stockB || 'City B'
        };
    }

    renderBaseChart() {
        const container = this.chartRenderer.setupBasicChart(
            {
                A: this.data.stockData.A,
                B: this.data.stockData.B,
                realTimeAggregated: this.data.realTimeAggregated
            },
            this.data.globalYScale, this.phase
        );

        const predictionGroup = container.append('g').attr('class', 'predictions');

        if (this.detailConfig.confidenceBounds) {
            this.renderConfidenceBounds(predictionGroup);
        }

        if (this.detailConfig.alternatives) {
            this.renderAlternativeLines(predictionGroup);
        }

        this.renderAggregatedLines(predictionGroup);
    }

    renderAggregatedLines(predictionGroup) {
        this.chartRenderer.renderAggregatedLines(
            predictionGroup,
            {
                A: this.data.stockData.A,
                B: this.data.stockData.B
            },
            this.config.colors,
            this.data.realTimeAggregated
        );

        const line = this.chartRenderer.createLineGenerator();
        ['A', 'B'].forEach((stock) => {
            const lastHistorical = this.data.stockData[stock].historical[
                this.data.stockData[stock].historical.length - 1
            ];

            if (!this.data.realTimeAggregated[stock] || this.data.realTimeAggregated[stock].length === 0) {
                return;
            }

            const fullAggregatedData = [lastHistorical, ...this.data.realTimeAggregated[stock]];
            this.interactionManager.createHoverZone(
                predictionGroup,
                fullAggregatedData,
                `hover-zone-${stock.toLowerCase()}`,
                line
            );
        });
    }

    renderAlternativeLines(predictionGroup) {
        const line = this.chartRenderer.createLineGenerator();

        ['A', 'B'].forEach((stock, stockIndex) => {
            const color = stockIndex === 0 ? this.config.colors.stockA : this.config.colors.stockB;
            const lastHistorical = this.data.stockData[stock].historical[
                this.data.stockData[stock].historical.length - 1
            ];

            const group = predictionGroup.append('g')
                .attr('class', `alternatives-group-${stock.toLowerCase()}`)
                .style('opacity', 0);

            const scenarios = {};
            this.data.stockData[stock].alternatives.forEach((point) => {
                if (!scenarios[point.scenario]) {
                    scenarios[point.scenario] = [];
                }
                scenarios[point.scenario].push(point);
            });

            Object.values(scenarios).forEach((scenarioData, scenarioIndex) => {
                if (scenarioData.length === 0) return;
                const fullScenarioData = [lastHistorical, ...scenarioData];
                group.append('path')
                    .datum(fullScenarioData)
                    .attr('class', `prediction-line alternative-line scenario-${scenarioIndex} stock-${stock.toLowerCase()}-line`)
                    .attr('fill', 'none')
                    .attr('stroke', color)
                    .attr('stroke-width', 1.5)
                    .attr('d', line);
            });

            this.detailTargets[stock].alternatives = group;
        });
    }

    renderConfidenceBounds(predictionGroup) {
        const area = this.chartRenderer.createAreaGenerator();

        ['A', 'B'].forEach((stock, stockIndex) => {
            const color = stockIndex === 0 ? this.config.colors.stockA : this.config.colors.stockB;
            const lastHistorical = this.data.stockData[stock].historical[
                this.data.stockData[stock].historical.length - 1
            ];

            if (!this.data.confidenceBounds[stock] || this.data.confidenceBounds[stock].length === 0) {
                return;
            }

            const areaData = [
                { date: lastHistorical.date, lower: lastHistorical.price, upper: lastHistorical.price },
                ...this.data.confidenceBounds[stock]
            ];

            const path = predictionGroup.append('path')
                .datum(areaData)
                .attr('class', `confidence-bounds confidence-bounds-${stock.toLowerCase()}`)
                .attr('fill', color)
                .attr('opacity', 0)
                .attr('d', area);

            this.detailTargets[stock].confidenceBounds = path;
        });
    }

    setCityDetailVisibility(stock, isVisible, duration = 200) {
        const cityTarget = this.detailTargets[stock];
        if (!cityTarget) return;

        const { alternativeOpacity, shadeOpacity } = this.interactionManager.getOpacityValues();

        if (cityTarget.alternatives) {
            this.interactionManager.setAlternativeLinesVisibility(
                cityTarget.alternatives, isVisible, duration, alternativeOpacity
            );
        }

        if (cityTarget.confidenceBounds) {
            cityTarget.confidenceBounds
                .transition()
                .duration(duration)
                .attr('opacity', isVisible ? shadeOpacity : 0);
        }
    }

    setAllCityDetailsVisibility(isVisible, duration = 200) {
        this.setCityDetailVisibility('A', isVisible, duration);
        this.setCityDetailVisibility('B', isVisible, duration);
    }

    createControlContainer() {
        const chartContainer = document.querySelector(`#${this.svgId}`)?.parentElement;
        if (!chartContainer) return null;

        const controls = document.createElement('div');
        controls.className = 'exp3-detail-controls';
        controls.setAttribute('data-interaction', 'checkbox-controls');
        controls.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            width: 100%;
            margin: 12px auto 0;
            padding: 8px 10px;
            background: #f8f9fa;
            border-top: 1px solid #e5e7eb;
            border-radius: 6px;
            box-sizing: border-box;
            flex-wrap: wrap;
        `;

        chartContainer.appendChild(controls);
        this.controlContainer = controls;
        return controls;
    }

    createCheckboxControl(id, label, color, onChange) {
        const wrapper = document.createElement('label');
        wrapper.className = 'exp3-checkbox-wrapper';
        wrapper.setAttribute('data-interaction', 'checkbox-wrapper');
        wrapper.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            font-size: 12px;
            color: #374151;
            padding: 4px 8px;
            border: 1px solid #d1d5db;
            border-radius: 16px;
            background: #ffffff;
        `;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.className = 'exp3-detail-checkbox';
        checkbox.setAttribute('data-interaction', 'checkbox-input');
        checkbox.style.cssText = `
            margin: 0;
            width: 14px;
            height: 14px;
            cursor: pointer;
        `;

        const swatch = document.createElement('span');
        swatch.style.cssText = `
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
            background: ${color};
        `;

        const labelText = document.createElement('span');
        labelText.textContent = label;
        if (label === 'Show all') labelText.style.fontStyle = 'italic';

        checkbox.addEventListener('change', () => {
            onChange(Boolean(checkbox.checked));
        });

        wrapper.appendChild(checkbox);
        wrapper.appendChild(swatch);
        wrapper.appendChild(labelText);

        return { wrapper, checkbox };
    }

    cleanup() {
        this.interactionManager.cleanup();
        if (this.controlContainer && this.controlContainer.parentElement) {
            this.controlContainer.parentElement.removeChild(this.controlContainer);
        }
    }
}
