/**
 * Condition 6: PI → Ensemble
 * PI plot transforms to ensemble plot on hover
 */
import { ChartRenderer } from '../base/chartRenderer.js';
import { InteractionManager } from '../base/interactionManager.js';

export default class Condition6 {
    constructor(svgId, processedData, config, phase = null) {
        this.svgId = svgId;
        this.data = processedData;
        this.config = config;
        this.phase = phase;
        this.chartRenderer = new ChartRenderer(svgId, config, phase);
        this.interactionManager = new InteractionManager(svgId);
        this.alternativesGroupA = null;
        this.alternativesGroupB = null;
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

        // Render confidence bounds first (visible initially for PI display)
        this.renderConfidenceBounds(predictionGroup);

        // Render alternative prediction lines (hidden initially)
        this.renderAlternativeLines(predictionGroup);

        // Render aggregated prediction lines with hover zones (with dashed style)
        this.renderAggregatedLines(predictionGroup);

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
                
                // Draw confidence bounds area (start visible for PI display)
                predictionGroup.append("path")
                    .datum(areaData)
                    .attr("class", `confidence-bounds confidence-bounds-${stock.toLowerCase()}`)
                    .attr("fill", color)
                    .attr("opacity", this.interactionManager.getOpacityValues().shadeOpacity)  // Start visible for PI display
                    .attr("d", area);
                    
            }
        });
    }

    renderAlternativeLines(predictionGroup) {
        const line = this.chartRenderer.createLineGenerator();
        
        // Create separate groups for each stock's alternatives (hidden initially)
        this.alternativesGroupA = predictionGroup.append("g")
            .attr("class", "alternatives-group-a")
            .style("opacity", 0);
            
        this.alternativesGroupB = predictionGroup.append("g")
            .attr("class", "alternatives-group-b")
            .style("opacity", 0);

        ['A', 'B'].forEach((stock, i) => {
            const color = i === 0 ? this.config.colors.stockA : this.config.colors.stockB;
            const lastHistorical = this.data.stockData[stock].historical[
                this.data.stockData[stock].historical.length - 1
            ];
            const currentAlternativesGroup = stock === 'A' ? this.alternativesGroupA : this.alternativesGroupB;
            
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
                        .attr("d", line);
                        
                }
            });
        });
    }

    renderAggregatedLines(predictionGroup) {
        // Use the base renderer for dashed aggregated lines
        this.chartRenderer.renderAggregatedLines(
            predictionGroup, 
            {
                A: this.data.stockData.A,
                B: this.data.stockData.B
            },
            this.config.colors,
            this.data.realTimeAggregated
        );
        
        // Add hover zones for interaction
        const line = this.chartRenderer.createLineGenerator();
        ['A', 'B'].forEach((stock, i) => {
            const lastHistorical = this.data.stockData[stock].historical[
                this.data.stockData[stock].historical.length - 1
            ];
            
            if (this.data.realTimeAggregated[stock] && this.data.realTimeAggregated[stock].length > 0) {
                const fullAggregatedData = [lastHistorical, ...this.data.realTimeAggregated[stock]];
                
                // Create hover zone for this aggregated line
                this.interactionManager.createHoverZone(
                    predictionGroup,
                    fullAggregatedData,
                    `hover-zone-${stock.toLowerCase()}`,
                    line
                );
            }
        });
    }

    setupInteractions() {
        // PI → Ensemble transformation
        // Stock A hover zone interactions
        const hoverZoneA = this.interactionManager.select('hover-zone-a');
        const confidenceBoundsA = this.interactionManager.select('confidence-bounds-a');
        this.interactionManager.addTransformationHover(
            hoverZoneA, 
            confidenceBoundsA,
            this.alternativesGroupA,
            { duration: 400, useShadeOpacity: true }
        );

        // Stock B hover zone interactions  
        const hoverZoneB = this.interactionManager.select('hover-zone-b');
        const confidenceBoundsB = this.interactionManager.select('confidence-bounds-b');
        this.interactionManager.addTransformationHover(
            hoverZoneB, 
            confidenceBoundsB,
            this.alternativesGroupB,
            { duration: 400, useShadeOpacity: true }
        );

    }

    cleanup() {
        this.interactionManager.cleanup();
    }
}
