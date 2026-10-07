/**
 * Condition 9: Combined PI + Ensemble
 * Shows both confidence bounds and alternative prediction lines (static combination of conditions 2 and 3)
 */
import { ChartRenderer } from '../base/chartRenderer.js';
import { InteractionManager } from '../base/interactionManager.js';

export default class Condition9 {
    constructor(svgId, processedData, config, phase = null) {
        this.svgId = svgId;
        this.data = processedData;
        this.config = config;
        this.phase = phase;
        this.chartRenderer = new ChartRenderer(svgId, config, phase);
        this.interactionManager = new InteractionManager(svgId);
    }

    render() {
        // Setup basic chart structure
        const container = this.chartRenderer.setupBasicChart(
            {
                A: this.data.stockData.A,
                B: this.data.stockData.B,
                realTimeAggregated: this.data.realTimeAggregated
            },
            this.data.globalYScale
        );

        // Create prediction group
        const predictionGroup = container.append("g").attr("class", "predictions");

        // Render confidence bounds first (underneath other elements)
        this.renderConfidenceBounds(predictionGroup);

        // Render alternative prediction lines second
        this.renderAlternativeLines(predictionGroup);

        // Render aggregated prediction lines on top (with dashed style)
        this.chartRenderer.renderAggregatedLines(
            predictionGroup, 
            {
                A: this.data.stockData.A,
                B: this.data.stockData.B
            },
            this.config.colors,
            this.data.realTimeAggregated
        );

    }

    renderConfidenceBounds(predictionGroup) {
        const area = this.chartRenderer.createAreaGenerator();

        ['A', 'B'].forEach((stock, i) => {
            const color = i === 0 ? this.config.colors.stockA : this.config.colors.stockB;
            const lastHistorical = this.data.stockData[stock].historical[
                this.data.stockData[stock].historical.length - 1
            ];
            
            if (this.data.confidenceBounds[stock] && this.data.confidenceBounds[stock].length > 0) {
                // Create area data including connection from last historical point
                const areaData = [
                    { date: lastHistorical.date, lower: lastHistorical.price, upper: lastHistorical.price },
                    ...this.data.confidenceBounds[stock]
                ];
                
                // Draw confidence bounds area
                predictionGroup.append("path")
                    .datum(areaData)
                    .attr("class", `confidence-bounds confidence-bounds-${stock.toLowerCase()}`)
                    .attr("fill", color)
                    .attr("opacity", this.interactionManager.getOpacityValues().shadeOpacity)
                    .attr("d", area);
                    
            }
        });
    }

    renderAlternativeLines(predictionGroup) {
        const line = this.chartRenderer.createLineGenerator();
        
        // Create separate groups for each stock's alternatives
        const alternativesGroupA = predictionGroup.append("g")
            .attr("class", "alternatives-group-a")
            .style("opacity", 1);
            
        const alternativesGroupB = predictionGroup.append("g")
            .attr("class", "alternatives-group-b")
            .style("opacity", 1);

        ['A', 'B'].forEach((stock, i) => {
            const color = i === 0 ? this.config.colors.stockA : this.config.colors.stockB;
            const lastHistorical = this.data.stockData[stock].historical[
                this.data.stockData[stock].historical.length - 1
            ];
            const currentAlternativesGroup = stock === 'A' ? alternativesGroupA : alternativesGroupB;
            
            // Group alternatives by scenario
            const scenarios = {};
            this.data.stockData[stock].alternatives.forEach(alt => {
                if (!scenarios[alt.scenario]) {
                    scenarios[alt.scenario] = [];
                }
                scenarios[alt.scenario].push(alt);
            });
            
            
            // Create a line for each scenario
            Object.entries(scenarios).forEach(([scenarioName, scenarioData], scenarioIndex) => {
                if (scenarioData.length > 0) {
                    const fullScenarioData = [lastHistorical, ...scenarioData];
                    
                    currentAlternativesGroup.append("path")
                        .datum(fullScenarioData)
                        .attr("class", `prediction-line alternative-line scenario-${scenarioIndex} stock-${stock.toLowerCase()}-line`)
                        .attr("fill", "none")
                        .attr("stroke", color)
                        .attr("stroke-width", 1.5)
                        .attr("opacity", this.interactionManager.getOpacityValues().alternativeOpacity)  // Use dynamic opacity
                        .attr("d", line);
                        
                }
            });
        });
    }

    setupInteractions() {
        // No interactions for static combined PI + ensemble plot
    }

    cleanup() {
        this.interactionManager.cleanup();
    }
}
