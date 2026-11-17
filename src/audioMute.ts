class AudioMuteController {
    private activePatterns: string[] = [];
    private timerId?: number;

    set(patterns: readonly string[], timeout: number) {
        this.activePatterns = [...patterns];
        if (this.timerId) {
            clearTimeout(this.timerId);
        }

        this.timerId = window.setTimeout(() => {
            this.activePatterns = [];
            this.timerId = undefined;
        }, timeout);
    }

    shouldMute(src: string) {
        if (!this.activePatterns.length) {
            return false;
        }

        return this.activePatterns.some(pattern => src.includes(pattern));
    }
}

export const audioMute = new AudioMuteController();
