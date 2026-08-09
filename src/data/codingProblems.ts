export interface CodingProblem {
    id: string;
    title: string;
    difficulty: "easy" | "medium" | "hard";
    domain: string;
    prompt: string;
    starterCode: Record<string, string>;
    /** Hidden tests — never sent fully to client before submit */
    hiddenTests: { input: string; expected: string; explanation?: string }[];
    publicTests: { input: string; expected: string }[];
    topics: string[];
    nextId?: string;
}

export const CODING_PROBLEMS: CodingProblem[] = [
    {
        id: "two-sum",
        title: "Two Sum",
        difficulty: "easy",
        domain: "backend",
        prompt: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. Assume exactly one solution.",
        starterCode: {
            javascript: `function twoSum(nums, target) {\n  // return [i, j]\n}\n`,
            python: `def two_sum(nums, target):\n    # return [i, j]\n    pass\n`,
        },
        publicTests: [
            { input: JSON.stringify({ nums: [2, 7, 11, 15], target: 9 }), expected: JSON.stringify([0, 1]) },
        ],
        hiddenTests: [
            { input: JSON.stringify({ nums: [3, 2, 4], target: 6 }), expected: JSON.stringify([1, 2]) },
            { input: JSON.stringify({ nums: [3, 3], target: 6 }), expected: JSON.stringify([0, 1]) },
        ],
        topics: ["arrays", "hash map"],
        nextId: "valid-anagram",
    },
    {
        id: "valid-anagram",
        title: "Valid Anagram",
        difficulty: "easy",
        domain: "frontend",
        prompt: "Given two strings s and t, return true if t is an anagram of s, and false otherwise.",
        starterCode: {
            javascript: `function isAnagram(s, t) {\n  // return boolean\n}\n`,
            python: `def is_anagram(s, t):\n    # return bool\n    pass\n`,
        },
        publicTests: [{ input: JSON.stringify({ s: "anagram", t: "nagaram" }), expected: "true" }],
        hiddenTests: [
            { input: JSON.stringify({ s: "rat", t: "car" }), expected: "false" },
            { input: JSON.stringify({ s: "a", t: "ab" }), expected: "false" },
        ],
        topics: ["strings", "counting"],
        nextId: "lru-cache",
    },
    {
        id: "lru-cache",
        title: "LRU Cache",
        difficulty: "medium",
        domain: "backend",
        prompt: "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement get and put in O(1) average time.",
        starterCode: {
            javascript: `class LRUCache {\n  constructor(capacity) {}\n  get(key) { return -1; }\n  put(key, value) {}\n}\n`,
            python: `class LRUCache:\n    def __init__(self, capacity: int):\n        pass\n    def get(self, key: int) -> int:\n        return -1\n    def put(self, key: int, value: int) -> None:\n        pass\n`,
        },
        publicTests: [
            {
                input: JSON.stringify({
                    ops: ["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"],
                    args: [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]],
                }),
                expected: JSON.stringify([null, null, null, 1, null, -1, null, -1, 3, 4]),
            },
        ],
        hiddenTests: [
            {
                input: JSON.stringify({
                    ops: ["LRUCache", "put", "get"],
                    args: [[1], [2, 1], [2]],
                }),
                expected: JSON.stringify([null, null, 1]),
            },
        ],
        topics: ["design", "linked list", "hash map"],
        nextId: "course-schedule",
    },
    {
        id: "course-schedule",
        title: "Course Schedule",
        difficulty: "medium",
        domain: "backend",
        prompt: "There are numCourses labeled 0 to numCourses-1. prerequisites[i] = [ai, bi] means you must take bi before ai. Return true if you can finish all courses.",
        starterCode: {
            javascript: `function canFinish(numCourses, prerequisites) {\n  // return boolean\n}\n`,
            python: `def can_finish(num_courses, prerequisites):\n    # return bool\n    pass\n`,
        },
        publicTests: [
            { input: JSON.stringify({ numCourses: 2, prerequisites: [[1, 0]] }), expected: "true" },
        ],
        hiddenTests: [
            { input: JSON.stringify({ numCourses: 2, prerequisites: [[1, 0], [0, 1]] }), expected: "false" },
            { input: JSON.stringify({ numCourses: 1, prerequisites: [] }), expected: "true" },
        ],
        topics: ["graphs", "topo sort"],
        nextId: "word-break",
    },
    {
        id: "word-break",
        title: "Word Break",
        difficulty: "hard",
        domain: "ml",
        prompt: "Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.",
        starterCode: {
            javascript: `function wordBreak(s, wordDict) {\n  // return boolean\n}\n`,
            python: `def word_break(s, word_dict):\n    # return bool\n    pass\n`,
        },
        publicTests: [
            { input: JSON.stringify({ s: "leetcode", wordDict: ["leet", "code"] }), expected: "true" },
        ],
        hiddenTests: [
            { input: JSON.stringify({ s: "applepenapple", wordDict: ["apple", "pen"] }), expected: "true" },
            { input: JSON.stringify({ s: "catsandog", wordDict: ["cats", "dog", "sand", "and", "cat"] }), expected: "false" },
        ],
        topics: ["DP", "strings"],
    },
];

export function getProblemPublic(id: string) {
    const p = CODING_PROBLEMS.find((x) => x.id === id);
    if (!p) return null;
    const { hiddenTests, ...rest } = p;
    return { ...rest, hiddenTestCount: hiddenTests.length };
}

export function progressivePath(startId = "two-sum"): string[] {
    const path: string[] = [];
    let id: string | undefined = startId;
    const seen = new Set<string>();
    while (id && !seen.has(id)) {
        seen.add(id);
        path.push(id);
        id = CODING_PROBLEMS.find((p) => p.id === id)?.nextId;
    }
    return path;
}
