import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { captureInterviewRoomScreenshot, preloadScreenCapture } from "@/utils/interviewScreenCapture";

describe("interviewScreenCapture", () => {
  const origWindow = globalThis.window;
  const origDocument = globalThis.document;

  beforeEach(() => {
    // Set up mock window and document on globalThis
    const mockCtx = {
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 100 }),
      createRadialGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
      roundRect: vi.fn(),
    };

    const mockCanvas = {
      width: 1280,
      height: 800,
      getContext: vi.fn().mockImplementation((type: string) => (type === "2d" ? mockCtx : null)),
      toDataURL: vi.fn().mockReturnValue("data:image/jpeg;base64,mockJpegDataString"),
    };

    const mockContainer = {
      getBoundingClientRect: vi.fn().mockReturnValue({ width: 1280, height: 800, top: 0, left: 0 }),
      innerText: "EchoWell Company clone: EchoWell Voice Coach HESITANT 52/100 89 wpm EchoWell - Scaling to 10M Concurrent Sessions",
      querySelectorAll: vi.fn().mockImplementation((selector: string) => {
        if (selector === "p") {
          return [{ textContent: "EchoWell - Scaling to 10M Concurrent Sessions: Design a real-time streaming pipeline." }];
        }
        if (selector === ".whitespace-pre-wrap") {
          return [
            { textContent: "I am facing an issue with the whiteboard.", closest: () => ({ className: "bg-indigo-600" }) },
            { textContent: "Please do not worry, engineering has received the diagnostic snapshot.", closest: () => null },
          ];
        }
        if (selector === "canvas") {
          return [{ width: 800, height: 600 }];
        }
        if (selector === "video") {
          return [];
        }
        return [];
      }),
      querySelector: vi.fn().mockReturnValue(null),
    };

    (globalThis as any).window = {
      innerWidth: 1280,
      innerHeight: 800,
      devicePixelRatio: 1,
      getComputedStyle: vi.fn().mockReturnValue({
        backgroundColor: "rgb(15, 15, 24)",
        color: "rgb(255, 255, 255)",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }),
    };

    (globalThis as any).document = {
      documentElement: {
        classList: {
          contains: vi.fn().mockReturnValue(false),
        },
      },
      getElementById: vi.fn().mockImplementation((id: string) => {
        if (id === "interview-room-container") return mockContainer;
        return null;
      }),
      createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === "canvas") return mockCanvas;
        if (tag === "script") {
          const s: any = { setAttribute: vi.fn(), src: "" };
          return s;
        }
        return {};
      }),
      querySelector: vi.fn().mockReturnValue(null),
      querySelectorAll: vi.fn().mockReturnValue([]),
      head: {
        appendChild: vi.fn().mockImplementation((s: any) => {
          setTimeout(() => {
            if (typeof s?.onerror === "function") s.onerror();
          }, 0);
        }),
      },
      body: mockContainer,
    };
  });

  afterEach(() => {
    (globalThis as any).window = origWindow;
    (globalThis as any).document = origDocument;
  });

  it("preloadScreenCapture runs safely without error", () => {
    expect(() => preloadScreenCapture()).not.toThrow();
  });

  it("captures a complete high-fidelity visual snapshot reconstructing the full room", async () => {
    const result = await captureInterviewRoomScreenshot({
      containerId: "interview-room-container",
      whiteboardFallbackDataUrl: "data:image/png;base64,mockWhiteboardPng",
    });

    expect(result).toBeTruthy();
    expect(result).toBe("data:image/jpeg;base64,mockJpegDataString");

    // Retrieve the canvas context mock to verify full room was drawn
    const createdCanvas = (globalThis.document as any).createElement("canvas");
    const ctx = createdCanvas.getContext("2d");

    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledWith(
      expect.stringContaining("Interview Room"),
      expect.any(Number),
      expect.any(Number)
    );
    expect(ctx.fillText).toHaveBeenCalledWith(
      expect.stringContaining("Transcript"),
      expect.any(Number),
      expect.any(Number)
    );
    expect(ctx.fillText).toHaveBeenCalledWith(
      expect.stringContaining("Architecture Whiteboard"),
      expect.any(Number),
      expect.any(Number)
    );
    expect(ctx.fillText).toHaveBeenCalledWith(
      expect.stringContaining("ARCHITECTURE / DIAGRAM CHALLENGE"),
      expect.any(Number),
      expect.any(Number)
    );
    expect(ctx.fillText).toHaveBeenCalledWith(
      expect.stringContaining("ROOM SNAPSHOT"),
      expect.any(Number),
      expect.any(Number)
    );
  });
});
