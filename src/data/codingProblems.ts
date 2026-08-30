export type ProblemSource = "leetcode" | "hackerrank" | "codeforces" | "codechef";
export type ProblemIoMode = "function" | "stdio";

export interface CodingProblem {
    id: string;
    title: string;
    difficulty: "easy" | "medium" | "hard";
    domain: string;
    source: ProblemSource;
    sourceLabel: string;
    ioMode: ProblemIoMode;
    prompt: string;
    constraints?: string;
    starterCode: Record<string, string>;
    /** Snippets that assign `out` / `out` from a parsed test `t` (function-mode only). */
    invoke?: { javascript: string; python: string };
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
        source: "leetcode",
        sourceLabel: "LeetCode",
        ioMode: "function",
        prompt:
            "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. Assume exactly one solution.",
        starterCode: {
            javascript: `function twoSum(nums, target) {\n  // return [i, j]\n}\n`,
            python: `def two_sum(nums, target):\n    # return [i, j]\n    pass\n`,
        },
        invoke: {
            javascript: `const a = JSON.parse(t.input); out = JSON.stringify(twoSum(a.nums, a.target));`,
            python: `a = json.loads(t["input"]); out = json.dumps(two_sum(a["nums"], a["target"]))`,
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
        source: "leetcode",
        sourceLabel: "LeetCode",
        ioMode: "function",
        prompt: "Given two strings s and t, return true if t is an anagram of s, and false otherwise.",
        starterCode: {
            javascript: `function isAnagram(s, t) {\n  // return boolean\n}\n`,
            python: `def is_anagram(s, t):\n    # return bool\n    pass\n`,
        },
        invoke: {
            javascript: `const a = JSON.parse(t.input); out = String(isAnagram(a.s, a.t));`,
            python: `a = json.loads(t["input"]); out = str(is_anagram(a["s"], a["t"])).lower()`,
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
        source: "leetcode",
        sourceLabel: "LeetCode",
        ioMode: "function",
        prompt:
            "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement get and put in O(1) average time.",
        starterCode: {
            javascript: `class LRUCache {\n  constructor(capacity) {}\n  get(key) { return -1; }\n  put(key, value) {}\n}\n`,
            python: `class LRUCache:\n    def __init__(self, capacity: int):\n        pass\n    def get(self, key: int) -> int:\n        return -1\n    def put(self, key: int, value: int) -> None:\n        pass\n`,
        },
        invoke: {
            javascript: `
                  const a = JSON.parse(t.input);
                  const ops = a.ops; const args = a.args;
                  const res = [];
                  let cache = null;
                  for (let i = 0; i < ops.length; i++) {
                    const op = ops[i];
                    if (op === "LRUCache") { cache = new LRUCache(args[i][0]); res.push(null); }
                    else if (op === "put") { cache.put(args[i][0], args[i][1]); res.push(null); }
                    else if (op === "get") { res.push(cache.get(args[i][0])); }
                  }
                  out = JSON.stringify(res);
                `,
            python: `raise NotImplementedError("python LRU grader uses javascript path")`,
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
        source: "leetcode",
        sourceLabel: "LeetCode",
        ioMode: "function",
        prompt:
            "There are numCourses labeled 0 to numCourses-1. prerequisites[i] = [ai, bi] means you must take bi before ai. Return true if you can finish all courses.",
        starterCode: {
            javascript: `function canFinish(numCourses, prerequisites) {\n  // return boolean\n}\n`,
            python: `def can_finish(num_courses, prerequisites):\n    # return bool\n    pass\n`,
        },
        invoke: {
            javascript: `const a = JSON.parse(t.input); out = String(canFinish(a.numCourses, a.prerequisites));`,
            python: `a = json.loads(t["input"]); out = str(can_finish(a["numCourses"], a["prerequisites"])).lower()`,
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
        source: "leetcode",
        sourceLabel: "LeetCode",
        ioMode: "function",
        prompt:
            "Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.",
        starterCode: {
            javascript: `function wordBreak(s, wordDict) {\n  // return boolean\n}\n`,
            python: `def word_break(s, word_dict):\n    # return bool\n    pass\n`,
        },
        invoke: {
            javascript: `const a = JSON.parse(t.input); out = String(wordBreak(a.s, a.wordDict));`,
            python: `a = json.loads(t["input"]); out = str(word_break(a["s"], a["wordDict"])).lower()`,
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
    {
        id: "contains-duplicate",
        title: "Contains Duplicate",
        difficulty: "easy",
        domain: "backend",
        source: "leetcode",
        sourceLabel: "LeetCode",
        ioMode: "function",
        prompt: "Given an integer array nums, return true if any value appears at least twice, and false if every element is distinct.",
        starterCode: {
            javascript: `function containsDuplicate(nums) {\n  // return boolean\n}\n`,
            python: `def contains_duplicate(nums):\n    # return bool\n    pass\n`,
        },
        invoke: {
            javascript: `const a = JSON.parse(t.input); out = String(containsDuplicate(a.nums));`,
            python: `a = json.loads(t["input"]); out = str(contains_duplicate(a["nums"])).lower()`,
        },
        publicTests: [{ input: JSON.stringify({ nums: [1, 2, 3, 1] }), expected: "true" }],
        hiddenTests: [
            { input: JSON.stringify({ nums: [1, 2, 3, 4] }), expected: "false" },
            { input: JSON.stringify({ nums: [1, 1, 1, 3, 3, 4, 3, 2, 4, 2] }), expected: "true" },
        ],
        topics: ["arrays", "hash set"],
    },
    {
        id: "max-subarray",
        title: "Maximum Subarray",
        difficulty: "medium",
        domain: "backend",
        source: "leetcode",
        sourceLabel: "LeetCode",
        ioMode: "function",
        prompt: "Given an integer array nums, find the contiguous subarray with the largest sum and return that sum.",
        starterCode: {
            javascript: `function maxSubArray(nums) {\n  // return number\n}\n`,
            python: `def max_sub_array(nums):\n    # return int\n    pass\n`,
        },
        invoke: {
            javascript: `const a = JSON.parse(t.input); out = String(maxSubArray(a.nums));`,
            python: `a = json.loads(t["input"]); out = str(max_sub_array(a["nums"]))`,
        },
        publicTests: [{ input: JSON.stringify({ nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] }), expected: "6" }],
        hiddenTests: [
            { input: JSON.stringify({ nums: [1] }), expected: "1" },
            { input: JSON.stringify({ nums: [5, 4, -1, 7, 8] }), expected: "23" },
        ],
        topics: ["arrays", "kadane"],
    },
    {
        id: "simple-array-sum",
        title: "Simple Array Sum",
        difficulty: "easy",
        domain: "backend",
        source: "hackerrank",
        sourceLabel: "HackerRank",
        ioMode: "stdio",
        prompt:
            "Read n, then n integers on the next line. Print the sum of the array.\n\nInput format:\nFirst line: integer n\nSecond line: n space-separated integers\n\nOutput format:\nA single integer — the sum.",
        constraints: "1 ≤ n ≤ 1000; |ai| ≤ 1000",
        starterCode: {
            javascript: `const fs = require("fs");\nconst lines = fs.readFileSync(0, "utf8").trim().split("\\n");\nconst n = Number(lines[0]);\nconst arr = lines[1].split(/\\s+/).map(Number);\n// print the sum\n`,
            python: `n = int(input())\narr = list(map(int, input().split()))\n# print the sum\n`,
        },
        publicTests: [{ input: "6\n1 2 3 4 10 11", expected: "31" }],
        hiddenTests: [
            { input: "1\n5", expected: "5" },
            { input: "3\n-1 0 1", expected: "0" },
        ],
        topics: ["arrays", "implementation"],
    },
    {
        id: "sock-merchant",
        title: "Sales by Match",
        difficulty: "easy",
        domain: "backend",
        source: "hackerrank",
        sourceLabel: "HackerRank",
        ioMode: "stdio",
        prompt:
            "There is a pile of socks. Each sock has a color (integer). How many matching pairs can you sell?\n\nInput format:\nFirst line: n\nSecond line: n space-separated color ids\n\nOutput format:\nA single integer — the number of pairs.",
        constraints: "1 ≤ n ≤ 100; 1 ≤ color ≤ 100",
        starterCode: {
            javascript: `const fs = require("fs");\nconst lines = fs.readFileSync(0, "utf8").trim().split("\\n");\nconst n = Number(lines[0]);\nconst colors = lines[1].split(/\\s+/).map(Number);\n// print pair count\n`,
            python: `n = int(input())\ncolors = list(map(int, input().split()))\n# print pair count\n`,
        },
        publicTests: [{ input: "9\n10 20 20 10 10 30 50 10 20", expected: "3" }],
        hiddenTests: [
            { input: "1\n10", expected: "0" },
            { input: "4\n1 1 1 1", expected: "2" },
        ],
        topics: ["hash map", "counting"],
    },
    {
        id: "jumping-clouds",
        title: "Jumping on the Clouds",
        difficulty: "medium",
        domain: "backend",
        source: "hackerrank",
        sourceLabel: "HackerRank",
        ioMode: "stdio",
        prompt:
            "There are n clouds in a line. 0 is safe, 1 is thunder. You start at cloud 0 and must reach n-1. From i you may jump to i+1 or i+2 if that cloud is safe. Print the minimum number of jumps.\n\nInput format:\nFirst line: n\nSecond line: n space-separated 0/1 values\n\nOutput format:\nA single integer — minimum jumps.",
        constraints: "2 ≤ n ≤ 100; c[0] = c[n-1] = 0",
        starterCode: {
            javascript: `const fs = require("fs");\nconst lines = fs.readFileSync(0, "utf8").trim().split("\\n");\nconst n = Number(lines[0]);\nconst c = lines[1].split(/\\s+/).map(Number);\n// print min jumps\n`,
            python: `n = int(input())\nc = list(map(int, input().split()))\n# print min jumps\n`,
        },
        publicTests: [{ input: "7\n0 0 1 0 0 1 0", expected: "4" }],
        hiddenTests: [
            { input: "6\n0 0 0 0 1 0", expected: "3" },
            { input: "2\n0 0", expected: "1" },
        ],
        topics: ["greedy", "arrays"],
    },
    {
        id: "watermelon",
        title: "Watermelon",
        difficulty: "easy",
        domain: "backend",
        source: "codeforces",
        sourceLabel: "Codeforces",
        ioMode: "stdio",
        prompt:
            "Pete and Billy want to split a watermelon of weight w into two parts, each of positive even weight. Print YES if possible, otherwise NO.\n\nInput format:\nA single integer w\n\nOutput format:\nYES or NO",
        constraints: "1 ≤ w ≤ 100",
        starterCode: {
            javascript: `const fs = require("fs");\nconst w = Number(fs.readFileSync(0, "utf8").trim());\n// print YES or NO\n`,
            python: `w = int(input())\n# print YES or NO\n`,
        },
        publicTests: [{ input: "8", expected: "YES" }],
        hiddenTests: [
            { input: "2", expected: "NO" },
            { input: "3", expected: "NO" },
            { input: "12", expected: "YES" },
        ],
        topics: ["math", "implementation"],
    },
    {
        id: "next-round",
        title: "Next Round",
        difficulty: "easy",
        domain: "backend",
        source: "codeforces",
        sourceLabel: "Codeforces",
        ioMode: "stdio",
        prompt:
            "n contestants are ranked by score (non-increasing). Contestant i advances if their score is at least the k-th place score and strictly positive. Print how many advance.\n\nInput format:\nFirst line: n k\nSecond line: n space-separated scores (non-increasing)\n\nOutput format:\nA single integer.",
        constraints: "1 ≤ k ≤ n ≤ 50; 0 ≤ score ≤ 100",
        starterCode: {
            javascript: `const fs = require("fs");\nconst lines = fs.readFileSync(0, "utf8").trim().split("\\n");\nconst [n, k] = lines[0].split(/\\s+/).map(Number);\nconst scores = lines[1].split(/\\s+/).map(Number);\n// print how many advance\n`,
            python: `n, k = map(int, input().split())\nscores = list(map(int, input().split()))\n# print how many advance\n`,
        },
        publicTests: [{ input: "8 5\n10 9 8 7 7 7 5 5", expected: "6" }],
        hiddenTests: [
            { input: "4 2\n0 0 0 0", expected: "0" },
            { input: "5 1\n10 9 8 7 6", expected: "1" },
        ],
        topics: ["implementation"],
    },
    {
        id: "theatre-square",
        title: "Theatre Square",
        difficulty: "medium",
        domain: "backend",
        source: "codeforces",
        sourceLabel: "Codeforces",
        ioMode: "stdio",
        prompt:
            "A n×m theatre square must be paved with a×a flagstones. Stones may hang over the edge but must cover the whole square. Stones cannot be cut. Print the minimum number of stones.\n\nInput format:\nThree integers n m a\n\nOutput format:\nA single integer.",
        constraints: "1 ≤ n, m, a ≤ 10^9",
        starterCode: {
            javascript: `const fs = require("fs");\nconst [n, m, a] = fs.readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);\n// print stone count (use integer math)\n`,
            python: `n, m, a = map(int, input().split())\n# print stone count\n`,
        },
        publicTests: [{ input: "6 6 4", expected: "4" }],
        hiddenTests: [
            { input: "1 1 1", expected: "1" },
            { input: "15 15 4", expected: "16" },
        ],
        topics: ["math", "ceil"],
    },
    {
        id: "chef-and-operators",
        title: "Chef and Operators",
        difficulty: "easy",
        domain: "backend",
        source: "codechef",
        sourceLabel: "CodeChef",
        ioMode: "stdio",
        prompt:
            "Chef compares two integers A and B. For each test case print < if A is smaller, > if A is greater, or = if they are equal.\n\nInput format:\nFirst line: T\nNext T lines: A B\n\nOutput format:\nT lines, each <, >, or =",
        constraints: "1 ≤ T ≤ 100; 1 ≤ A, B ≤ 10^9",
        starterCode: {
            javascript: `const fs = require("fs");\nconst lines = fs.readFileSync(0, "utf8").trim().split("\\n");\nconst t = Number(lines[0]);\n// print one symbol per case\n`,
            python: `t = int(input())\n# print one symbol per case\n`,
        },
        publicTests: [{ input: "3\n10 20\n20 10\n10 10", expected: "<\n>\n=" }],
        hiddenTests: [
            { input: "1\n1 1", expected: "=" },
            { input: "2\n100 99\n5 8", expected: ">\n<" },
        ],
        topics: ["implementation"],
    },
    {
        id: "atm-withdraw",
        title: "ATM",
        difficulty: "easy",
        domain: "backend",
        source: "codechef",
        sourceLabel: "CodeChef",
        ioMode: "stdio",
        prompt:
            "Pooja wants to withdraw X dollars. There is a $0.50 fee. The account starts with Y. If X is a multiple of 5 and X + 0.50 ≤ Y, print the new balance with two decimals. Otherwise print the original Y with two decimals.\n\nInput format:\nX Y (integer and float)\n\nOutput format:\nBalance with two decimal places.",
        constraints: "0 < X ≤ 2000; 0 ≤ Y ≤ 2000",
        starterCode: {
            javascript: `const fs = require("fs");\nconst [xStr, yStr] = fs.readFileSync(0, "utf8").trim().split(/\\s+/);\nconst x = Number(xStr);\nconst y = Number(yStr);\n// print balance with 2 decimals\n`,
            python: `x, y = input().split()\nx = int(x)\ny = float(y)\n# print balance with 2 decimals\n`,
        },
        publicTests: [{ input: "30 120.00", expected: "89.50" }],
        hiddenTests: [
            { input: "42 120.00", expected: "120.00" },
            { input: "300 120.00", expected: "120.00" },
        ],
        topics: ["implementation", "floats"],
    },
    {
        id: "life-universe",
        title: "Life, the Universe, and Everything",
        difficulty: "easy",
        domain: "backend",
        source: "codechef",
        sourceLabel: "CodeChef",
        ioMode: "stdio",
        prompt:
            "Read integers, one per line, and print each of them until you read 42. Do not print 42 or anything after it.\n\nInput format:\nSeveral lines of integers\n\nOutput format:\nThe numbers before 42, each on its own line.",
        starterCode: {
            javascript: `const fs = require("fs");\nconst nums = fs.readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);\n// print until 42\n`,
            python: `# read integers until 42 (do not print 42)\n`,
        },
        publicTests: [{ input: "1\n2\n88\n42\n99", expected: "1\n2\n88" }],
        hiddenTests: [
            { input: "42\n1", expected: "" },
            { input: "7\n42", expected: "7" },
        ],
        topics: ["implementation"],
    },
];

const JAVA_STDIO_STARTER = `import java.util.*;
public class Main {
  public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    // Read stdin and print the answer
  }
}
`;

export function getProblemPublic(id: string) {
    const p = CODING_PROBLEMS.find((x) => x.id === id);
    if (!p) return null;
    const { hiddenTests, invoke, ...rest } = p;
    const starterCode = { ...rest.starterCode };
    if (rest.ioMode === "stdio" && !starterCode.java) {
        starterCode.java = JAVA_STDIO_STARTER;
    }
    if (rest.ioMode === "stdio" && !starterCode.cpp) {
        starterCode.cpp = `#include <bits/stdc++.h>
using namespace std;
int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  // Read stdin and print the answer
  return 0;
}
`;
    }
    return { ...rest, starterCode, hiddenTestCount: hiddenTests.length };
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

export function assessmentPool(): CodingProblem[] {
    return CODING_PROBLEMS.filter((p) => {
        if (p.ioMode === "stdio") return true;
        const py = p.invoke?.python || "";
        return Boolean(p.invoke?.javascript) && !py.includes("NotImplementedError");
    });
}
