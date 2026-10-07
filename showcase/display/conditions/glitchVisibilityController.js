const HIDDEN_MILLISECOND_BUCKETS = new Set([
    4, 8, 10, 15, 18, 20, 21, 25, 32, 37,
    39, 43, 46, 52, 65, 72, 73, 77, 78, 79,
    80, 83, 84, 85, 87, 88, 89, 90, 94, 95
]);

export class GlitchVisibilityController {
    constructor() {
        this.intervals = new Map();
        this.visibleState = new Map();
    }

    isVisibleNow() {
        const millisecondBucket = Math.floor(new Date().getMilliseconds() / 10);
        return !HIDDEN_MILLISECOND_BUCKETS.has(millisecondBucket);
    }

    applyVisibility(key, onVisibilityChange) {
        const isVisible = this.isVisibleNow();

        if (this.visibleState.get(key) === isVisible) {
            return;
        }

        this.visibleState.set(key, isVisible);
        onVisibilityChange(isVisible);
    }

    start(key, onVisibilityChange, intervalMs = 10) {
        this.stop(key);
        this.visibleState.delete(key);
        this.applyVisibility(key, onVisibilityChange);

        const intervalId = setInterval(() => {
            this.applyVisibility(key, onVisibilityChange);
        }, intervalMs);

        this.intervals.set(key, intervalId);
    }

    stop(key) {
        if (this.intervals.has(key)) {
            clearInterval(this.intervals.get(key));
            this.intervals.delete(key);
        }

        this.visibleState.delete(key);
    }

    cleanup() {
        this.intervals.forEach((intervalId) => clearInterval(intervalId));
        this.intervals.clear();
        this.visibleState.clear();
    }
}
