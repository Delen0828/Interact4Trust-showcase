/**
 * Condition 20: Glitch PI → Ensemble
 * Hover transforms the PI plot into the ensemble plot with millisecond-gated visibility.
 */
import Condition6 from './condition6.js';
import { GlitchVisibilityController } from './glitchVisibilityController.js';

export default class Condition20 extends Condition6 {
    constructor(svgId, processedData, config, phase = null) {
        super(svgId, processedData, config, phase);
        this.glitchController = new GlitchVisibilityController();
    }

    setTransformationState(confidenceBounds, alternativesGroup, isVisible) {
        const { shadeOpacity } = this.interactionManager.getOpacityValues();

        confidenceBounds.interrupt().attr("opacity", isVisible ? 0 : shadeOpacity);
        this.interactionManager.setAlternativeLinesVisibility(alternativesGroup, isVisible);
    }

    addGlitchTransformationHover(hoverZone, confidenceBounds, alternativesGroup, key) {
        hoverZone
            .on("mouseenter", () => {
                this.glitchController.start(key, (isVisible) => {
                    this.setTransformationState(confidenceBounds, alternativesGroup, isVisible);
                });
            })
            .on("mouseleave", () => {
                this.glitchController.stop(key);
                this.setTransformationState(confidenceBounds, alternativesGroup, false);
            });
    }

    setupInteractions() {
        const hoverZoneA = this.interactionManager.select('hover-zone-a');
        const hoverZoneB = this.interactionManager.select('hover-zone-b');
        const confidenceBoundsA = this.interactionManager.select('confidence-bounds-a');
        const confidenceBoundsB = this.interactionManager.select('confidence-bounds-b');

        this.addGlitchTransformationHover(hoverZoneA, confidenceBoundsA, this.alternativesGroupA, 'A');
        this.addGlitchTransformationHover(hoverZoneB, confidenceBoundsB, this.alternativesGroupB, 'B');
    }

    cleanup() {
        this.glitchController.cleanup();
        super.cleanup();
    }
}
