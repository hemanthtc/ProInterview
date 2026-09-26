export type CampusPathId = "onCampus" | "offCampus";

export interface EvaluationInfo {
    whatTheyJudge: string;
    scoredOn: string[];
}

export interface PrepPath {
    label: string;
    duration: string;
    difficulty: string;
    structure: string[];
    finalStage?: string;
    roundTypes?: string[];
    topics: Record<string, string[]>;
    evaluation: EvaluationInfo;
}

export interface InterviewPrepLogic {
    title: string;
    paths: Record<CampusPathId, PrepPath>;
}
