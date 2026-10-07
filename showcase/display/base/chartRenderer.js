/**
 * Core D3 chart rendering utilities
 * Shared functionality for all visualization conditions
 */
export class ChartRenderer {
    constructor(svgId, config, phase = null) {
        this.svgId = svgId;
        this.config = config;
        this.phase = phase;
        this.svg = d3.select(`#${svgId}`);
        this.margin = config.margin;
        this.width = config.width - this.margin.left - this.margin.right;
        this.height = config.height - this.margin.top - this.margin.bottom;
        this.g = null;
        this.xScale = null;
        this.yScale = null;
    }

    /**
     * Clear existing content and setup SVG container
     */
    clearAndSetup() {
        this.svg.selectAll("*").remove();
        this.g = this.svg.append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);
        return this.g;
    }

    /**
     * Create time and linear scales for the chart
     */
    createScales(data, globalYScale) {
        // Collect all dates from data
        const allDates = [
            ...data.A.historical.map(d => d.date),
            ...data.B.historical.map(d => d.date),
            ...(data.realTimeAggregated?.A ? data.realTimeAggregated.A.map(d => d.date) : []),
            ...(data.realTimeAggregated?.B ? data.realTimeAggregated.B.map(d => d.date) : [])
        ];

        this.xScale = d3.scaleTime()
            .domain([d3.min(allDates), new Date('2025-06-30')])
            .range([0, this.width]);

        this.yScale = d3.scaleLinear()
            .domain(globalYScale)
            .range([this.height, 0]);

        return { xScale: this.xScale, yScale: this.yScale };
    }

    /**
     * Add grid lines to the chart
     */
    addGrid() {
        // Horizontal grid lines
        this.g.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0,${this.height})`)
            .call(d3.axisBottom(this.xScale)
                .tickSize(-this.height)
                .tickFormat("")
            );

        // Vertical grid lines
        this.g.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(this.yScale)
                .tickSize(-this.width)
                .tickFormat("")
            );
    }

    /**
     * Add X and Y axes to the chart
     */
    addAxes() {
        // X-axis
        this.g.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${this.height})`)
            .call(d3.axisBottom(this.xScale).tickFormat(d3.timeFormat("%m/%d")));

        // Y-axis
        this.g.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(this.yScale));

        // Add axis titles if configured
        if (this.config.showAxisTitles) {
            // X-axis title
            if (this.config.xAxisTitle) {
                this.g.append("text")
                    .attr("class", "axis-title")
                    .attr("transform", `translate(${this.width / 2}, ${this.height + 45})`)
                    .style("text-anchor", "middle")
                    .style("font-size", "12px")
                    .style("fill", "#666")
                    .text(this.config.xAxisTitle);
            }

            // Y-axis title
            if (this.config.yAxisTitle) {
                this.g.append("text")
                    .attr("class", "axis-title")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 0 - this.margin.left + 15)
                    .attr("x", 0 - (this.height / 2))
                    .style("text-anchor", "middle")
                    .style("font-size", "12px")
                    .style("fill", "#666")
                    .text(this.config.yAxisTitle);
            }
        }
    }

    /**
     * Add vertical reference line at prediction start (06/01)
     */
    addReferenceLine(phase = null) {
        // Use provided phase or fall back to stored phase
        const currentPhase = phase !== null ? phase : this.phase;
        
        const verticalLineDate = new Date('2025-06-01');
        const lineX = this.xScale(verticalLineDate);
        
        this.g.append("line")
            .attr("class", "vertical-reference-line")
            .attr("x1", lineX)
            .attr("x2", lineX)
            .attr("y1", 0)
            .attr("y2", this.height)
            .attr("stroke", "#999")
            .attr("stroke-width", 1)
            .attr("opacity", 0.8);
            
        // Add "Today" label on top of the vertical line
        this.g.append("text")
            .attr("class", "today-label")
            .attr("x", lineX)
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("font-weight", "500")
            .attr("fill", "#666")
            .text("Today");
            
        // Add phase-specific labels
        if (currentPhase === 1) {
            // Phase 1: Add "historical data" label on the left
            this.g.append("text")
                .attr("class", "phase-label")
                .attr("x", lineX - 20)
                .attr("y", this.height / 2 -100)
                .attr("text-anchor", "end")
                .attr("font-size", "12px")
                .attr("font-style", "italic")
                .attr("fill", "#666")
                .text("Historical Data");
        } else if (currentPhase === 2) {
            // Phase 2: Add "forecast data" label on the right
            this.g.append("text")
                .attr("class", "phase-label")
                .attr("x", lineX + 20)
                .attr("y", this.height / 2 -100)
                .attr("text-anchor", "start")
                .attr("font-size", "12px")
                .attr("font-style", "italic")
                .attr("fill", "#666")
                .text("Forecast Data");
        }
    }

    /**
     * Create D3 line generator
     */
    createLineGenerator() {
        return d3.line()
            .x(d => this.xScale(d.date))
            .y(d => this.yScale(d.price))
            .curve(d3.curveMonotoneX);
    }

    /**
     * Create D3 area generator for confidence bounds
     */
    createAreaGenerator() {
        return d3.area()
            .x(d => this.xScale(d.date))
            .y0(d => this.yScale(d.lower))
            .y1(d => this.yScale(d.upper))
            .curve(d3.curveMonotoneX);
    }

    /**
     * Render historical data lines for both stocks
     */
    renderHistoricalLines(data) {
        const line = this.createLineGenerator();

        // Stock A historical line
        this.g.append("path")
            .datum(data.A.historical)
            .attr("class", "historical-line")
            .attr("stroke", this.config.colors.stockA)
            .attr("d", line);

        // Stock B historical line
        this.g.append("path")
            .datum(data.B.historical)
            .attr("class", "historical-line")
            .attr("stroke", this.config.colors.stockB)
            .attr("d", line);
    }

    /**
     * Render aggregated prediction lines with dashed style after reference date
     */
    renderAggregatedLines(container, data, colors, realTimeAggregated) {
        const line = this.createLineGenerator();

        ['A', 'B'].forEach((stock, i) => {
            const color = i === 0 ? colors.stockA : colors.stockB;
            const lastHistorical = data[stock].historical[data[stock].historical.length - 1];
            
            if (realTimeAggregated[stock] && realTimeAggregated[stock].length > 0) {
                // Create continuous path through all real-time aggregated data points
                const fullAggregatedData = [lastHistorical, ...realTimeAggregated[stock]];
                
                container.append("path")
                    .datum(fullAggregatedData)
                    .attr("class", `aggregated-line real-time-aggregated stock-${stock.toLowerCase()}-line`)
                    .attr("stroke", color)
                    .attr("fill", "none")
                    .attr("stroke-width", 2)
                    .attr("stroke-dasharray", "5,5") // Dashed line for predictions
                    .attr("d", line);
                    
            }
        });
    }

    /**
     * Get SVG group container for adding elements
     */
    getContainer() {
        return this.g;
    }

    /**
     * Get scales for external use
     */
    getScales() {
        return {
            x: this.xScale,
            y: this.yScale
        };
    }

    /**
     * Setup basic chart structure (grid, axes, reference line, historical data)
     */
    setupBasicChart(data, globalYScale, phase = null) {
        this.clearAndSetup();
        this.createScales(data, globalYScale);
        this.addGrid();
        this.addAxes();
        this.addReferenceLine(phase);
        this.renderHistoricalLines(data);
        return this.g;
    }
}
