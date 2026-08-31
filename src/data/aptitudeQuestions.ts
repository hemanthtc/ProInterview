import type { InterviewPrepLogic } from "@/types/interviewPrep";

export type { CampusPathId, EvaluationInfo, PrepPath, InterviewPrepLogic } from "@/types/interviewPrep";

export interface AptitudeQuestion {
    id: number;
    question: string;
    codeSnippet?: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
}

export interface AptitudeCategory {
    category: string;
    questions: AptitudeQuestion[];
}

export const interviewPrepLogic: InterviewPrepLogic = {
    title: "Talk to Aptitude",
    paths: {
        onCampus: {
            label: "On-Campus",
            duration: "20-30 min aptitude test",
            difficulty: "Easy to Moderate",
            structure: ["Basic questions", "Focused aptitude, speed math, basic code"],
            finalStage: "Project-based questions",
            topics: {
                logicalReasoning: ["Data interpretation", "Coding-decoding", "Blood relations", "Seating arrangements"],
                technicalCoding: ["Output prediction", "Basic data structures"],
                codingPlatforms: ["LeetCode (Basic/Medium)", "HackerRank"],
                quantitativeAptitude: ["Time, Speed & Distance", "Permutations & Probability", "Profit, Loss & Interest"]
            },
            evaluation: {
                whatTheyJudge: "They know you lack experience. They want to see if you're easy to train, enthusiastic, and flexible enough to fit into any project team.",
                scoredOn: ["Communication", "Basic academic conceptual clarity", "Cultural adaptability"]
            }
        },
        offCampus: {
            label: "Off-Campus",
            duration: "3-5 separate rounds",
            roundTypes: ["Technical", "System Design", "Managerial", "HR"],
            difficulty: "High to Very Hard (high competition per seat)",
            structure: ["Targeted competency (prove experienced value)", "Domain depth, edge cases, system design"],
            topics: {
                domainAssessments: ["Algorithmic optimization (LeetCode Medium/High)", "System design & architecture", "Edge-case debugging", "DSA"],
                situationalJudgment: ["Conflict & prioritization", "Ownership & client management"]
            },
            evaluation: {
                whatTheyJudge: "Immediate competency. They're paying you to solve problems now — proof of execution, independent problem-solving, and deep domain expertise.",
                scoredOn: ["Structural thinking", "Architectural knowledge", "Conflict resolution", "Execution speed"]
            }
        }
    }
};

export const aptitudeQuestions: Record<string, AptitudeCategory> = {
    logicalReasoning: {
        category: "Logical Reasoning",
        questions: [
            {
                id: 1,
                question: "Pointing to a photograph of a boy, Suresh said, 'He is the son of the only son of my mother.' How is Suresh related to that boy?",
                options: ["Brother", "Uncle", "Father", "Cousin"],
                correctAnswer: 2,
                explanation: "Suresh's mother's only son is Suresh himself. Therefore, the boy in the photograph is Suresh's son, which makes Suresh the father."
            },
            {
                id: 2,
                question: "If in a certain language, 'COULD' is coded as 'BNTKC' and 'MARGIN' is coded as 'LZQFHM', how is 'MOULDING' coded in that code?",
                options: ["LNTKC HMF", "LNKTCHMF", "NITKHCMF", "LNTKCHMF"],
                correctAnswer: 3,
                explanation: "Each letter in the word is coded as the letter preceding it in the alphabet. M->L, O->N, U->T, L->K, D->C, I->H, N->M, G->F. Thus, MOULDING is coded as LNTKCHMF."
            },
            {
                id: 3,
                question: "Six friends A, B, C, D, E, and F are sitting in a circle facing the center. F is to the immediate left of A. B is facing E. C is between A and D. Who is facing D?",
                options: ["A", "F", "B", "E"],
                correctAnswer: 1,
                explanation: "Following the circular seating constraints, the positions relative to each other place F next to A, C between A and D, and B opposite E. Solving the circle places F directly opposite/facing D."
            }
        ]
    },
    quantitativeAptitude: {
        category: "Quantitative Aptitude",
        questions: [
            {
                id: 1,
                question: "A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?",
                options: ["120 meters", "150 meters", "180 meters", "324 meters"],
                correctAnswer: 1,
                explanation: "Speed = 60 * (5/18) m/sec = 50/3 m/sec. Distance = Speed * Time = (50/3) * 9 = 150 meters."
            },
            {
                id: 2,
                question: "A fruit seller had some apples. He sells 40% apples and still has 420 apples. Originally, he had:",
                options: ["588 apples", "600 apples", "672 apples", "700 apples"],
                correctAnswer: 3,
                explanation: "If he sells 40%, he has 60% left. 60% of X = 420 => X = (420 * 100) / 60 = 700 apples."
            },
            {
                id: 3,
                question: "What is the probability of getting a sum of 9 from two throws of a dice?",
                options: ["1/6", "1/8", "1/9", "1/12"],
                correctAnswer: 2,
                explanation: "Total outcomes = 36. Outcomes with sum 9: (3,6), (4,5), (5,4), (6,3) = 4 outcomes. Probability = 4/36 = 1/9."
            }
        ]
    },
    technicalCoding: {
        category: "Technical Coding",
        questions: [
            {
                id: 1,
                question: "What is the output of the following JavaScript code snippet?",
                codeSnippet: "console.log(typeof NaN);",
                options: ["'number'", "'NaN'", "'undefined'", "'object'"],
                correctAnswer: 0,
                explanation: "In JavaScript, NaN (Not-a-Number) is technically a numeric data type, so typeof NaN returns 'number'."
            },
            {
                id: 2,
                question: "What will be the output of the following code snippet?",
                codeSnippet: "let a = [1, 2, 3];\nlet b = a;\nb.push(4);\nconsole.log(a.length);",
                options: ["3", "4", "undefined", "Error"],
                correctAnswer: 1,
                explanation: "Arrays in JavaScript are reference types. 'b' points to the same array reference as 'a'. Modifying 'b' will modify the underlying array, so a.length is 4."
            },
            {
                id: 3,
                question: "Which data structure follows the Last-In-First-Out (LIFO) principle?",
                options: ["Queue", "Array", "Stack", "Binary Tree"],
                correctAnswer: 2,
                explanation: "A Stack adds items to the top and removes them from the top, operating on the Last-In-First-Out (LIFO) model."
            }
        ]
    },
    domainAssessments: {
        category: "Domain Assessments",
        questions: [
            {
                id: 1,
                question: "What is the worst-case time complexity of searching in a Balanced Binary Search Tree (like an AVL tree)?",
                options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
                correctAnswer: 1,
                explanation: "A balanced BST keeps its height restricted to log n, meaning search takes O(log n) time in the worst case."
            },
            {
                id: 2,
                question: "Which architectural pattern is best suited for horizontally scaling a stateful database with minimal write latency and high availability?",
                options: ["Single-Database Monolith", "Event sourcing with CQRS", "Microservices with distributed locks", "Shared-nothing cluster with sharding"],
                correctAnswer: 3,
                explanation: "A shared-nothing database cluster with sharding distributes the database state across distinct nodes, avoiding bottlenecks and supporting horizontal write scaling."
            }
        ]
    },
    situationalJudgment: {
        category: "Situational Judgment",
        questions: [
            {
                id: 1,
                question: "A client demands a sudden, out-of-scope feature changes right before the final release deadline. What is the best initial action?",
                options: [
                    "Reject the request immediately as it violates the project scope guidelines.",
                    "Implement the changes overnight without notifying the manager to impress the client.",
                    "Acknowledge the request, analyze the scope & timeline impact, and present options to the project manager and client.",
                    "Ask the client to contact the engineering team lead directly and ignore the message."
                ],
                correctAnswer: 2,
                explanation: "The professional response is to assess impact, consult stakeholders (manager/lead), and offer trade-offs, rather than committing blindly or refusing rudely."
            },
            {
                id: 2,
                question: "You notice a critical bug in a teammate's code during a peer review. They are sensitive about feedback. What is the most constructive approach?",
                options: [
                    "Fix the bug yourself quietly without telling them.",
                    "Point out the issue politely in private, explaining the edge case and offering to pair program to resolve it.",
                    "Post a public critical comment on the group channel highlighting the mistake so everyone is aware.",
                    "Ignore it since it is their task and they are responsible for production errors."
                ],
                correctAnswer: 1,
                explanation: "Providing polite, private feedback with technical explanations and offering support preserves relationships while ensuring software quality."
            }
        ]
    }
};

