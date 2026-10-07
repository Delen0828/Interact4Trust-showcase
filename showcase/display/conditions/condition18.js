/**
 * Condition 18: Glitch Ensemble + Hover
 * Aggregated by default, hover reveals alternatives with millisecond-gated visibility.
 */
import Condition4 from './condition4.js';
import { GlitchVisibilityController } from './glitchVisibilityController.js';

export default class Condition18 extends Condition4 {
    constructor(svgId, processedData, config, phase = null) {
        super(svgId, processedData, config, phase);
        this.glitchController = new GlitchVisibilityController();
    }

    setAlternativesVisibility(targetGroup, isVisible) {
        this.interactionManager.setAlternativeLinesVisibility(targetGroup, isVisible);
    }

    addGlitchHoverInteraction(hoverZone, targetGroup, key) {
        hoverZone
            .on("mouseenter", () => {
                this.glitchController.start(key, (isVisible) => {
                    this.setAlternativesVisibility(targetGroup, isVisible);
                });
            })
            .on("mouseleave", () => {
                this.glitchController.stop(key);
                this.setAlternativesVisibility(targetGroup, false);
            });
    }

    setupInteractions() {
        const hoverZoneA = this.interactionManager.select('hover-zone-a');
        const hoverZoneB = this.interactionManager.select('hover-zone-b');

        this.addGlitchHoverInteraction(hoverZoneA, this.alternativesGroupA, 'A');
        this.addGlitchHoverInteraction(hoverZoneB, this.alternativesGroupB, 'B');
    }

    cleanup() {
        this.glitchController.cleanup();
        super.cleanup();
    }
}
