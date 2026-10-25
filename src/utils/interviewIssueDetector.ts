export interface DetectedIssue {
    isIssue: boolean;
    tool: "whiteboard" | "code_editor" | "camera" | "audio" | "general_ui";
    summary: string;
}

/**
 * Detects whether a candidate's utterance or message represents a technical/interface issue
 * during an interview session (e.g. "I am facing an issue", "not working", "stuck", "cannot draw").
 *
 * @param text The candidate's utterance or sent message
 * @param currentContext The currently active workspace interaction mode ("draw" | "code" | "chat")
 */
export function detectInterfaceIssue(
    text: string,
    currentContext?: "draw" | "code" | "chat"
): DetectedIssue {
    if (!text || typeof text !== "string") {
        return { isIssue: false, tool: "general_ui", summary: "" };
    }

    const lower = text.toLowerCase().trim();

    // Comprehensive list of problem indicator keywords and natural phrases
    const problemKeywords = [
        // Facing issue / problem
        "facing an issue", "facing issue", "facing some issue", "having an issue", "having issue",
        "have an issue", "have issue", "there is an issue", "there's an issue", "there is some issue",
        "facing a problem", "facing problem", "having a problem", "having problem", "have a problem",
        "there is a problem", "there's a problem", "facing some problem", "technical issue", "system issue",
        "platform issue", "facing some error", "facing error", "there is an error", "having trouble",
        "having some trouble", "trouble with this", "trouble with the", "trouble with",
        // Not working / failure
        "not working", "not working properly", "is not working", "isn't working", "isnt working",
        "does not work", "doesn't work", "doesnt work", "failed to load", "fails to load",
        "not responding", "unresponsive", "cannot proceed", "can't proceed", "unable to proceed",
        "cannot continue", "can't continue", "unable to continue", "not able to proceed",
        "something is wrong", "something went wrong", "stuck", "frozen", "freezing", "glitch", "glitched",
        "glitching", "broken", "it broke", "page broke", "screen is blank", "screen is black",
        "screen is frozen", "screen is stuck", "can't see", "cannot see", "not visible", "not appearing",
        "not showing", "cannot click", "can't click", "buttons not working", "not accessible",
        // Whiteboard / drawing specific
        "cannot draw", "can't draw", "unable to draw", "drawing not working", "issue in whiteboard",
        "whiteboard issue", "board issue", "whiteboard is not", "board not", "canvas not",
        // Code specific
        "cannot write code", "cant write code", "code editor not working", "editor not working",
        "unable to write code", "unable to type", "code not running", "cannot run code",
        // Audio / video specific
        "camera not working", "camera issue", "mic not working", "microphone not working",
        "can't hear", "cannot hear", "no sound", "voice not coming",
        // Report intention
        "report an issue", "report issue", "reporting an issue", "reporting issue",
        "report a bug", "report a problem", "report problem", "i want to report", "please report"
    ];

    const hasProblemKeyword = problemKeywords.some((keyword) => lower.includes(keyword));
    if (!hasProblemKeyword) {
        return { isIssue: false, tool: "general_ui", summary: "" };
    }

    // 1. Tool-specific check by keywords in the text
    if (
        lower.includes("whiteboard") ||
        lower.includes("board") ||
        lower.includes("draw") ||
        lower.includes("diagram") ||
        lower.includes("canvas") ||
        lower.includes("shape")
    ) {
        return {
            isIssue: true,
            tool: "whiteboard",
            summary: "Whiteboard drawing or canvas access issue",
        };
    }

    if (
        lower.includes("code") ||
        lower.includes("editor") ||
        lower.includes("run code") ||
        lower.includes("syntax") ||
        lower.includes("programming")
    ) {
        return {
            isIssue: true,
            tool: "code_editor",
            summary: "Code editor input or execution issue",
        };
    }

    if (lower.includes("camera") || lower.includes("video") || lower.includes("webcam")) {
        return {
            isIssue: true,
            tool: "camera",
            summary: "Camera video stream or proctoring issue",
        };
    }

    if (
        lower.includes("mic") ||
        lower.includes("microphone") ||
        lower.includes("audio") ||
        lower.includes("sound") ||
        lower.includes("hear") ||
        lower.includes("voice")
    ) {
        return {
            isIssue: true,
            tool: "audio",
            summary: "Audio/speech recognition or voice coach issue",
        };
    }

    // 2. Context-aware fallback: if candidate says "I am facing an issue" without naming a tool,
    // infer tool from the candidate's currently active workspace mode!
    if (currentContext === "draw") {
        return {
            isIssue: true,
            tool: "whiteboard",
            summary: "Active whiteboard challenge interface issue",
        };
    }

    if (currentContext === "code") {
        return {
            isIssue: true,
            tool: "code_editor",
            summary: "Active code editor challenge interface issue",
        };
    }

    return {
        isIssue: true,
        tool: "general_ui",
        summary: "General interview room interface issue",
    };
}
