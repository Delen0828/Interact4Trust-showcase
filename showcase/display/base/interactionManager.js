/**
 * Base interaction handling for chart visualizations
 * Provides utilities for hover, click, and transition management
 */
export class InteractionManager {
    constructor(svgId) {
        this.svgId = svgId;
        this.svg = d3.select(`#${svgId}`);
        this.timeouts = new Map(); // Track timeouts for cleanup
    }

    /**
     * Get current opacity values from control sliders
     */
    getOpacityValues() {
        const alternativeOpacity = Number(document.getElementById('alternativeOpacitySlider')?.value || 0.2);
        const shadeOpacity = Number(document.getElementById('shadeOpacitySlider')?.value || 0.2);
		return { alternativeOpacity, shadeOpacity };
    }

    /**
     * Whether a selection is (or contains) prediction lines.
     */
    hasPredictionLines(targetElement) {
        if (!targetElement || typeof targetElement.selectAll !== 'function') {
            return false;
        }

        if (typeof targetElement.classed === 'function' && targetElement.classed('prediction-line')) {
            return true;
        }

        const predictionLines = targetElement.selectAll('.prediction-line');
        return typeof predictionLines.empty === 'function' && !predictionLines.empty();
    }

    /**
     * Show/hide alternative line groups without multiplying opacity.
     * Group opacity controls visibility; line opacity controls perceived intensity.
     */
    setAlternativeLinesVisibility(targetElement, isVisible, duration = 0, explicitLineOpacity = null) {
        const { alternativeOpacity } = this.getOpacityValues();
        const lineOpacity = isVisible ? (explicitLineOpacity ?? alternativeOpacity) : 0;
        const groupOpacity = isVisible ? 1 : 0;

        const targetLines = (typeof targetElement.classed === 'function' && targetElement.classed('prediction-line'))
            ? targetElement
            : targetElement.selectAll('.prediction-line');

        if (duration > 0) {
            targetElement.transition()
                .duration(duration)
                .style('opacity', groupOpacity)
                .attr('opacity', groupOpacity);

            targetLines.transition()
                .duration(duration)
                .style('opacity', lineOpacity)
                .attr('opacity', lineOpacity);
            return;
        }

        targetElement.interrupt()
            .style('opacity', groupOpacity)
            .attr('opacity', groupOpacity);

        targetLines.interrupt()
            .style('opacity', lineOpacity)
            .attr('opacity', lineOpacity);
    }

    /**
     * Create hover zone for a line/area
     */
    createHoverZone(container, data, className, lineGenerator, strokeWidth = 15) {
        return container.append("path")
            .datum(data)
            .attr("class", className)
            .attr("fill", "none")
            .attr("stroke", "transparent")
            .attr("stroke-width", strokeWidth)
            .attr("d", lineGenerator)
            .style("cursor", "pointer");
    }

    /**
     * Create hover zone for an area (confidence bounds)
     */
    createAreaHoverZone(container, data, className, areaGenerator) {
        return container.append("path")
            .datum(data)
            .attr("class", className)
            .attr("fill", "transparent")
            .attr("stroke", "transparent")
            .attr("stroke-width", 5)
            .attr("d", areaGenerator)
            .style("cursor", "pointer");
    }

    /**
     * Standard hover interaction: show/hide on mouse enter/leave
     */
    addHoverInteraction(hoverZone, targetElement, options = {}) {
        const {
            showOpacity = null, // Will use slider value if null
            hideDuration = 200,
            showDuration = 200,
            useAlternativeOpacity = true
        } = options;

        hoverZone
            .on("mouseenter", () => {
                const opacity = showOpacity || (useAlternativeOpacity 
                    ? this.getOpacityValues().alternativeOpacity 
                    : this.getOpacityValues().shadeOpacity);

                if (useAlternativeOpacity && this.hasPredictionLines(targetElement)) {
                    this.setAlternativeLinesVisibility(targetElement, true, showDuration, opacity);
                    return;
                }

                targetElement.transition()
                    .duration(showDuration)
                    .style("opacity", opacity)
                    .attr("opacity", opacity);
            })
            .on("mouseleave", () => {
                if (useAlternativeOpacity && this.hasPredictionLines(targetElement)) {
                    this.setAlternativeLinesVisibility(targetElement, false, hideDuration);
                    return;
                }

                targetElement.transition()
                    .duration(hideDuration)
                    .style("opacity", 0)
                    .attr("opacity", 0);
            });
    }

    /**
     * Transformation hover: fade out one element while fading in another
     */
    addTransformationHover(hoverZone, elementToHide, elementToShow, options = {}) {
        const {
            duration = 400,
            useShadeOpacity = true
        } = options;

        hoverZone
            .on("mouseenter", () => {
                const { alternativeOpacity, shadeOpacity } = this.getOpacityValues();
                
                // Fade out first element, fade in second element
                elementToHide.transition()
                    .duration(duration)
                    .attr("opacity", 0);

                if (this.hasPredictionLines(elementToShow)) {
                    this.setAlternativeLinesVisibility(elementToShow, true, duration, alternativeOpacity);
                } else {
                    elementToShow.transition()
                        .duration(duration)
                        .style("opacity", alternativeOpacity)
                        .attr("opacity", alternativeOpacity);
                }
            })
            .on("mouseleave", () => {
                const { shadeOpacity } = this.getOpacityValues();
                
                // Reverse: fade in first element, fade out second element
                elementToHide.transition()
                    .duration(duration)
                    .attr("opacity", shadeOpacity);

                if (this.hasPredictionLines(elementToShow)) {
                    this.setAlternativeLinesVisibility(elementToShow, false, duration);
                } else {
                    elementToShow.transition()
                        .duration(duration)
                        .style("opacity", 0)
                        .attr("opacity", 0);
                }
            });
    }

    /**
     * Buggy hover interaction: show wrong target on hover with swapped colors
     */
    addBuggyHover(hoverZoneA, hoverZoneB, targetA, targetB, options = {}) {
        const { duration = 200 } = options;
        const { alternativeOpacity } = this.getOpacityValues();

        // Store original colors
        const originalColorA = '#007bff'; // Blue for City A
        const originalColorB = '#fd7e14'; // Orange for City B
      
        hoverZoneA
            .on("mouseenter", () => {
                // Show B's data but with A's color (extra confusing!)
                if (this.hasPredictionLines(targetB)) {
                    this.setAlternativeLinesVisibility(targetB, true, duration, alternativeOpacity);
                } else {
                    targetB.transition()
                        .duration(duration)
                        .style("opacity", alternativeOpacity)
                        .attr("opacity", alternativeOpacity);
                }
                
                // Change all path elements within targetB to wrong color
                targetB.selectAll('path')
                    .transition()
                    .duration(duration)
                    .attr("stroke", originalColorA); // Wrong color!
            })
            .on("mouseleave", () => {
                // Hide and restore B's original color
                if (this.hasPredictionLines(targetB)) {
                    this.setAlternativeLinesVisibility(targetB, false, duration);
                } else {
                    targetB.transition()
                        .duration(duration)
                        .style("opacity", 0)
                        .attr("opacity", 0);
                }
                    
                targetB.selectAll('path')
                    .transition()
                    .duration(duration)
                    .attr("stroke", originalColorB); // Restore correct color
            });

        // Hover B shows A with swapped color (BUG!)
        hoverZoneB
            .on("mouseenter", () => {
                // Show A's data but with B's color (extra confusing!)
                if (this.hasPredictionLines(targetA)) {
                    this.setAlternativeLinesVisibility(targetA, true, duration, alternativeOpacity);
                } else {
                    targetA.transition()
                        .duration(duration)
                        .style("opacity", alternativeOpacity)
                        .attr("opacity", alternativeOpacity);
                }
                
                // Change all path elements within targetA to wrong color
                targetA.selectAll('path')
                    .transition()
                    .duration(duration)
                    .attr("stroke", originalColorB); // Wrong color!
            })
            .on("mouseleave", () => {
                // Hide and restore A's original color
                if (this.hasPredictionLines(targetA)) {
                    this.setAlternativeLinesVisibility(targetA, false, duration);
                } else {
                    targetA.transition()
                        .duration(duration)
                        .style("opacity", 0)
                        .attr("opacity", 0);
                }
                    
                targetA.selectAll('path')
                    .transition()
                    .duration(duration)
                    .attr("stroke", originalColorA); // Restore correct color
            });
    }

    /**
     * Bad UX: Hover on invisible alternative lines to reveal them individually
     */
    addBadHoverReveal(alternativeTarget) {
        const self = this; // Store reference to maintain scope
        
        // Make individual invisible hover zones for each alternative line
        alternativeTarget.selectAll('path').each(function(d, i) {
            const pathElement = d3.select(this);
            const pathData = pathElement.datum();
            
            // Create invisible hover zone for this specific line using the same path
            const hoverZone = alternativeTarget.append("path")
                .datum(pathData)
                .attr("class", `bad-hover-zone-${i}`)
                .attr("d", pathElement.attr("d"))
                .attr("fill", "none")
                .attr("stroke", "transparent")
                .attr("stroke-width", 20) // Even wider for easier hovering
                .style("cursor", "crosshair") // Different cursor to hint something is there
                .style("pointer-events", "stroke"); // Ensure hover works on stroke area
            
            // Hover to reveal individual line
            hoverZone
                .on("mouseenter", () => {
                    const { alternativeOpacity } = self.getOpacityValues();
                    pathElement
                        .attr("opacity", alternativeOpacity)
                        .style("opacity", alternativeOpacity);
                })
                .on("mouseleave", () => {
                    pathElement
                        .attr("opacity", 0)
                        .style("opacity", 0);
                });
        });
    }

    /**
     * Delayed hover interaction with timeout management
     */
    addDelayedHover(hoverZone, targetElement, delay = 3000, stock = 'A') {
        const timeoutKey = `${this.svgId}-${stock}`;
        
        hoverZone
            .on("mouseenter", () => {
                const { alternativeOpacity } = this.getOpacityValues();
                
                // Clear any existing timeout
                if (this.timeouts.has(timeoutKey)) {
                    clearTimeout(this.timeouts.get(timeoutKey));
                }
                
                // Set delay timeout
                const timeout = setTimeout(() => {
                    targetElement.transition()
                        .duration(200)
                        .style("opacity", alternativeOpacity);
                }, delay);
                
                this.timeouts.set(timeoutKey, timeout);
            })
            .on("mouseleave", () => {
                // Clear timeout if mouse leaves before delay completes
                if (this.timeouts.has(timeoutKey)) {
                    clearTimeout(this.timeouts.get(timeoutKey));
                    this.timeouts.delete(timeoutKey);
                }
                
                // Hide element immediately
                targetElement.transition()
                    .duration(200)
                    .style("opacity", 0);
            });
    }

    /**
     * Remove all event handlers from a selection
     */
    removeInteractions(selection) {
        selection
            .on("mouseenter", null)
            .on("mouseleave", null)
            .on("click", null);
    }

    /**
     * Cleanup all timeouts
     */
    cleanup() {
        this.timeouts.forEach(timeout => clearTimeout(timeout));
        this.timeouts.clear();
    }

    /**
     * Get selection by class name within this SVG
     */
    select(className) {
        return this.svg.select(`.${className}`);
    }

    /**
     * Get multiple selections by class name within this SVG
     */
    selectAll(className) {
        return this.svg.selectAll(`.${className}`);
    }
}
