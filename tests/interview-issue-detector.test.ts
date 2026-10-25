import { describe, it, expect } from "vitest";
import { detectInterfaceIssue } from "@/utils/interviewIssueDetector";

describe("interviewIssueDetector", () => {
  it("detects natural issue phrases like 'I am facing an issue' without explicit tool name", () => {
    const naturalPhrases = [
      "I am facing an issue",
      "I'm facing an issue",
      "I have an issue here",
      "there is an issue",
      "facing a problem with this",
      "having trouble proceeding",
      "it is not working properly",
      "something went wrong with the interface",
      "screen is stuck and frozen",
    ];

    for (const text of naturalPhrases) {
      const issue = detectInterfaceIssue(text);
      expect(issue.isIssue).toBe(true);
      expect(issue.summary).toBeTruthy();
    }
  });

  it("infers active workspace tool when candidate reports issue without naming the tool", () => {
    // When candidate is drawing on the whiteboard
    const drawIssue = detectInterfaceIssue("I am facing an issue", "draw");
    expect(drawIssue.isIssue).toBe(true);
    expect(drawIssue.tool).toBe("whiteboard");

    // When candidate is in the code editor
    const codeIssue = detectInterfaceIssue("it is not working properly", "code");
    expect(codeIssue.isIssue).toBe(true);
    expect(codeIssue.tool).toBe("code_editor");

    // When candidate is in general chat
    const chatIssue = detectInterfaceIssue("I have a problem", "chat");
    expect(chatIssue.isIssue).toBe(true);
    expect(chatIssue.tool).toBe("general_ui");
  });

  it("detects whiteboard issues accurately", () => {
    const utterances = [
      "I am facing an issue in the whiteboard",
      "The drawing board is not working, I can't draw shapes",
      "whiteboard is stuck and unresponsive",
      "my canvas is frozen and not loading",
      "shapes are not showing up on the canvas",
    ];

    for (const text of utterances) {
      const issue = detectInterfaceIssue(text);
      expect(issue.isIssue).toBe(true);
      expect(issue.tool).toBe("whiteboard");
      expect(issue.summary).toBeTruthy();
    }
  });

  it("detects code editor issues accurately", () => {
    const utterances = [
      "The code editor is not working",
      "cant write code editor is stuck",
      "code editor not working properly",
      "editor not working and frozen",
    ];

    for (const text of utterances) {
      const issue = detectInterfaceIssue(text);
      expect(issue.isIssue).toBe(true);
      expect(issue.tool).toBe("code_editor");
      expect(issue.summary).toBeTruthy();
    }
  });

  it("detects microphone/audio issues", () => {
    const utterances = [
      "My mic not working right now",
      "microphone not working during this call",
      "I cannot hear your voice",
    ];

    for (const text of utterances) {
      const issue = detectInterfaceIssue(text);
      expect(issue.isIssue).toBe(true);
      expect(issue.tool).toBe("audio");
      expect(issue.summary).toBeTruthy();
    }
  });

  it("detects camera/video issues", () => {
    const utterances = [
      "My camera not working",
      "webcam is stuck and video failed to load",
      "camera issue on this page",
    ];

    for (const text of utterances) {
      const issue = detectInterfaceIssue(text);
      expect(issue.isIssue).toBe(true);
      expect(issue.tool).toBe("camera");
      expect(issue.summary).toBeTruthy();
    }
  });

  it("detects general UI glitches", () => {
    const utterances = [
      "The interface is broken and glitched",
      "Buttons not working and unresponsive",
      "The screen is stuck and not responding",
    ];

    for (const text of utterances) {
      const issue = detectInterfaceIssue(text);
      expect(issue.isIssue).toBe(true);
      expect(issue.tool).toBe("general_ui");
      expect(issue.summary).toBeTruthy();
    }
  });

  it("does not false-positive on standard interview answers", () => {
    const utterances = [
      "In a whiteboard design for URL shortener, we would use a Redis cache.",
      "The code runs in O(N log N) time complexity using merge sort.",
      "I would design the system with microservices communicating via Kafka.",
      "Let's write a function that takes an array of integers.",
      "My approach to this problem is using dynamic programming with memoization.",
      "Hello, good morning! I am ready for the interview.",
    ];

    for (const text of utterances) {
      const issue = detectInterfaceIssue(text);
      expect(issue.isIssue).toBe(false);
    }
  });
});
