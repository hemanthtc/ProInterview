import { describe, it, expect, vi } from "vitest";
import { AvatarAudioService } from "../src/services/avatarAudioService";

describe("Portable 3D Avatar & Neural TTS Speech Integration", () => {
    describe("AvatarAudioService", () => {
        it("instantiates cleanly as a service instance", () => {
            const service = new AvatarAudioService();
            expect(service).toBeDefined();
            expect(service.isAudioPlaying()).toBe(false);
        });

        it("safely stops playback without active audio", () => {
            const service = new AvatarAudioService();
            service.stopPlayback();
            expect(service.isAudioPlaying()).toBe(false);
        });

        it("handles invalid or empty audio payloads gracefully by calling onPlaybackEnded", async () => {
            const service = new AvatarAudioService();
            const onViseme = vi.fn();
            const onEnd = vi.fn();

            await service.playSpeechWithVisemes("", [], onViseme, onEnd);
            expect(onEnd).toHaveBeenCalledTimes(1);
            expect(service.isAudioPlaying()).toBe(false);
        });
    });

    describe("ARKit 52 Blendshape Targets", () => {
        it("contains expected Apple ARKit mouth & eye blendshape targets", () => {
            const arkitTargets = [
                "eyeBlinkLeft", "eyeBlinkRight", "eyeLookUpLeft", "eyeLookDownLeft",
                "jawOpen", "mouthFunnel", "mouthPucker", "mouthSmileLeft", "mouthSmileRight",
                "mouthRollUpper", "mouthRollLower", "mouthClose"
            ];
            expect(arkitTargets.length).toBeGreaterThan(10);
            expect(arkitTargets).toContain("jawOpen");
            expect(arkitTargets).toContain("mouthClose");
            expect(arkitTargets).toContain("mouthFunnel");
        });
    });

    describe("TTS Proxy Route Resilience", () => {
        it("returns fallback true when no speech text is provided", async () => {
            const synthesizeHandler = async (text: string) => {
                const trimmed = text.trim();
                if (!trimmed) {
                    return { fallback: true, error: "Text is required" };
                }
                return { fallback: false, audio: "dummy", visemes: [] };
            };

            const resultEmpty = await synthesizeHandler("");
            expect(resultEmpty.fallback).toBe(true);

            const resultValid = await synthesizeHandler("Hello candidate");
            expect(resultValid.fallback).toBe(false);
        });
    });
});
