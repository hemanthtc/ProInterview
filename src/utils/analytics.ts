export type AnalyticsEventName =
    | "signup"
    | "interview_finished"
    | "assessment_submitted"
    | "exam_created"
    | "job_tracked"
    | "aptitude_scored";

export interface AnalyticsEvent {
    name: AnalyticsEventName;
    at: number;
    identifier?: string;
    meta?: Record<string, string | number | boolean>;
}

const memory: AnalyticsEvent[] = [];

export function recordAnalyticsEvent(event: AnalyticsEvent): void {
    memory.push(event);
    if (memory.length > 500) memory.splice(0, memory.length - 500);
}

export function listAnalyticsEvents(): AnalyticsEvent[] {
    return [...memory].reverse();
}

export function analyticsFunnel(events: AnalyticsEvent[] = memory) {
    const count = (name: AnalyticsEventName) => events.filter((e) => e.name === name).length;
    return {
        signups: count("signup"),
        interviews: count("interview_finished"),
        assessments: count("assessment_submitted"),
        exams: count("exam_created"),
        jobs: count("job_tracked"),
        aptitude: count("aptitude_scored"),
    };
}
