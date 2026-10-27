/**
 * Audio Playback and Viseme Synchronization Service.
 * Decodes Base64 WAV audio via Web Audio API, analyzes live RMS energy,
 * and synchronizes viseme cues precisely with audio playback for 3D digital human lip sync.
 */

export interface VisemeCue {
    viseme: string;
    time: number;
    intensity: number;
}

export class AvatarAudioService {
    private audioCtx: AudioContext | null = null;
    private currentSource: AudioBufferSourceNode | null = null;
    private analyser: AnalyserNode | null = null;
    private animFrameId: number | null = null;
    private isPlaying = false;

    private getAudioContext(): AudioContext | null {
        if (typeof window === "undefined") return null;
        if (!this.audioCtx) {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (!AudioCtx) return null;
            this.audioCtx = new AudioCtx();
        }
        if (this.audioCtx.state === "suspended") {
            this.audioCtx.resume().catch(() => {});
        }
        return this.audioCtx;
    }

    /**
     * Actively unlocks / resumes the AudioContext on user interaction (resolves AWS Amplify / HTTPS autoplay policy).
     */
    unlockAudioContext(): void {
        const ctx = this.getAudioContext();
        if (ctx && ctx.state === "suspended") {
            ctx.resume().catch(() => {});
        }
    }

    /**
     * Check if speech audio is currently playing.
     */
    isAudioPlaying(): boolean {
        return this.isPlaying;
    }

    /**
     * Play base64 WAV audio and dispatch time-synchronized visemes.
     */
    async playSpeechWithVisemes(
        audioBase64: string,
        visemes: VisemeCue[],
        onVisemeChange: (viseme: string, intensity: number) => void,
        onPlaybackEnded: () => void,
        onEnergyChange?: (energy: number) => void
    ): Promise<void> {
        this.stopPlayback();

        if (!audioBase64 || typeof window === "undefined") {
            onPlaybackEnded();
            return;
        }

        const ctx = this.getAudioContext();
        if (!ctx) {
            onPlaybackEnded();
            return;
        }

        if (ctx.state === "suspended") {
            try {
                await ctx.resume();
            } catch {}
        }

        // Convert Base64 string to ArrayBuffer
        const binaryStr = atob(audioBase64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }

        try {
            const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.3;

            source.connect(analyser);
            analyser.connect(ctx.destination);

            this.currentSource = source;
            this.analyser = analyser;
            this.isPlaying = true;

            const startTime = ctx.currentTime;
            const energyData = new Float32Array(analyser.fftSize);

            let lastViseme = "sil";
            let lastIntensity = 0;

            // High-frequency synchronization loop
            const checkVisemes = () => {
                if (!this.isPlaying) return;

                const elapsed = ctx.currentTime - startTime;

                if (elapsed >= audioBuffer.duration) {
                    this.stopPlayback();
                    onPlaybackEnded();
                    return;
                }

                // Live RMS audio energy calculation
                if (analyser && onEnergyChange) {
                    analyser.getFloatTimeDomainData(energyData);
                    let sumSquares = 0.0;
                    for (let i = 0; i < energyData.length; i++) {
                        sumSquares += energyData[i] * energyData[i];
                    }
                    const rms = Math.sqrt(sumSquares / energyData.length);
                    const normalizedEnergy = Math.min(1.0, rms * 5.0);
                    onEnergyChange(normalizedEnergy);
                }

                // Binary search / find current active viseme cue
                let activeCue: VisemeCue = { viseme: "sil", time: 0, intensity: 0 };
                for (let i = visemes.length - 1; i >= 0; i--) {
                    if (elapsed >= visemes[i].time) {
                        activeCue = visemes[i];
                        break;
                    }
                }

                if (activeCue.viseme !== lastViseme || Math.abs(activeCue.intensity - lastIntensity) > 0.05) {
                    lastViseme = activeCue.viseme;
                    lastIntensity = activeCue.intensity;
                    onVisemeChange(activeCue.viseme, activeCue.intensity);
                }

                this.animFrameId = requestAnimationFrame(checkVisemes);
            };

            source.onended = () => {
                if (this.isPlaying) {
                    this.stopPlayback();
                    onPlaybackEnded();
                }
            };

            source.start(0);
            this.animFrameId = requestAnimationFrame(checkVisemes);
        } catch (err) {
            console.error("Audio decode or playback error:", err);
            this.stopPlayback();
            onPlaybackEnded();
        }
    }

    /**
     * Immediately abort active speech playback and reset mouth.
     */
    stopPlayback(): void {
        this.isPlaying = false;
        if (this.animFrameId !== null) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        if (this.currentSource) {
            try {
                this.currentSource.stop();
                this.currentSource.disconnect();
            } catch {}
            this.currentSource = null;
        }
        this.analyser = null;
    }
}

export const avatarAudioService = new AvatarAudioService();
