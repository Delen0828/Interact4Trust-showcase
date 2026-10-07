/**
 * Condition 19: Glitch PI Plot + Hover
 * PI confidence bounds are revealed on hover with millisecond-gated visibility.
 */
import Condition5 from './condition5.js';
import { GlitchVisibilityController } from './glitchVisibilityController.js';

export default class Condition19 extends Condition5 {
    constructor(svgId, processedData, config, phase = null) {
        super(svgId, processedData, config, phase);
        this.glitchController = new GlitchVisibilityController();
    }

    setBoundsVisibility(confidenceBounds, isVisible) {
        const { shadeOpacity } = this.interactionManager.getOpacityValues();
        confidenceBounds.interrupt().attr("opacity", isVisible ? shadeOpacity : 0);
    }

    addGlitchHoverInteraction(hoverZone, confidenceBounds, key) {
        hoverZone
            .on("mouseenter", () => {
                this.glitchController.start(key, (isVisible) => {
                    this.setBoundsVisibility(confidenceBounds, isVisible);
                });
            })
            .on("mouseleave", () => {
                this.glitchController.stop(key);
                this.setBoundsVisibility(confidenceBounds, false);
            });
    }

    setupInteractions() {
        const hoverZoneA = this.interactionManager.select('hover-zone-a');
        const hoverZoneB = this.interactionManager.select('hover-zone-b');
        const confidenceBoundsA = this.interactionManager.select('confidence-bounds-a');
        const confidenceBoundsB = this.interactionManager.select('confidence-bounds-b');

        this.addGlitchHoverInteraction(hoverZoneA, confidenceBoundsA, 'A');
        this.addGlitchHoverInteraction(hoverZoneB, confidenceBoundsB, 'B');
    }

    cleanup() {
        this.glitchController.cleanup();
        super.cleanup();
    }
}
