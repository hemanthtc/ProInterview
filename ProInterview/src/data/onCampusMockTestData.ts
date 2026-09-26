export interface MCQQuestion {
  id: number;
  category: string;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctAnswer: number; // 0-indexed index in the options array
  explanation: string;
}

export interface CodingQuestion {
  id: number;
  title: string;
  description: string;
  constraints: string[];
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  starterTemplates: Record<string, string>; // language -> code template
}

export const onCampusMCQs: MCQQuestion[] = [
  // --- Quantitative Aptitude (8 questions) ---
  {
    id: 1,
    category: "quantitative",
    question: "A, B and C can do a piece of work in 20, 30 and 60 days respectively. In how many days can A do the work if he is assisted by B and C on every third day?",
    options: ["12 days", "15 days", "16 days", "18 days"],
    correctAnswer: 1,
    explanation: "A's 1 day's work = 1/20. B's 1 day's work = 1/30. C's 1 day's work = 1/60. Work done by A in 2 days alone = 2 * (1/20) = 1/10. Work done by A, B and C on the 3rd day = 1/20 + 1/30 + 1/60 = (3+2+1)/60 = 6/60 = 1/10. Total work done in 3 days = 1/10 + 1/10 = 2/10 = 1/5. Since 1/5th of the work is done in 3 days, the whole work will be completed in 3 * 5 = 15 days."
  },
  {
    id: 2,
    category: "quantitative",
    question: "A man covers a certain distance at 60 km/hr and returns at 40 km/hr. What is his average speed for the entire journey?",
    options: ["48 km/hr", "50 km/hr", "45 km/hr", "52 km/hr"],
    correctAnswer: 0,
    explanation: "Average Speed = 2xy / (x + y) where x and y are the speeds. Average Speed = 2 * 60 * 40 / (60 + 40) = 4800 / 100 = 48 km/hr."
  },
  {
    id: 3,
    category: "quantitative",
    question: "A sum of money double itself in 8 years at simple interest. What is the annual rate of interest?",
    options: ["10%", "12.5%", "15%", "8%"],
    correctAnswer: 1,
    explanation: "Let Principal = P. Amount = 2P. Interest (I) = A - P = P. We know I = P * R * T / 100. So P = P * R * 8 / 100 => R * 8 = 100 => R = 12.5%."
  },
  {
    id: 4,
    category: "quantitative",
    question: "A bag contains 6 black and 8 white balls. One ball is drawn at random. What is the probability that the ball drawn is white?",
    options: ["3/7", "4/7", "1/8", "3/4"],
    correctAnswer: 1,
    explanation: "Total balls = 6 + 8 = 14. Number of white balls = 8. Probability = Number of favorable outcomes / Total outcomes = 8/14 = 4/7."
  },
  {
    id: 5,
    category: "quantitative",
    question: "In what ratio must a grocer mix tea at Rs. 60 per kg and Rs. 65 per kg so that by selling the mixture at Rs. 68.20 per kg he may gain 10%?",
    options: ["3:2", "3:4", "3:5", "4:5"],
    correctAnswer: 0,
    explanation: "Selling Price (SP) of mixture = Rs. 68.20. Gain = 10%. Cost Price (CP) of mixture = SP * 100 / (100 + Gain) = 68.20 * 100 / 110 = Rs. 62. By rule of alligation: (Cheaper tea CP: 60) and (Dearer tea CP: 65), Mean price CP: 62. Ratio = (Dearer CP - Mean Price) : (Mean Price - Cheaper CP) = (65 - 62) : (62 - 60) = 3:2."
  },
  {
    id: 6,
    category: "quantitative",
    question: "A sum of Rs. 12,500 amounts to Rs. 15,500 in 4 years at simple interest. What is the rate of interest?",
    options: ["5%", "6%", "7%", "8%"],
    correctAnswer: 1,
    explanation: "Simple Interest = 15500 - 12500 = Rs. 3000. Interest = Principal * Rate * Time / 100 => 3000 = 12500 * R * 4 / 100 => 3000 = 500 * R => R = 3000 / 500 = 6%."
  },
  {
    id: 7,
    category: "quantitative",
    question: "The difference between simple interest and compound interest on Rs. 1200 for one year at 10% per annum, reckoned half-yearly, is:",
    options: ["Rs. 2.50", "Rs. 3.00", "Rs. 3.75", "Rs. 4.00"],
    correctAnswer: 1,
    explanation: "For half-yearly, Rate = 10/2 = 5%, Time = 2 half-years. Compound Interest (CI) = 1200 * (1 + 5/100)^2 - 1200 = 1200 * (21/20)^2 - 1200 = 1200 * 441/400 - 1200 = 3 * 441 - 1200 = 1323 - 1200 = Rs. 123. Simple Interest (SI) for 1 year at 10% = 1200 * 10 * 1 / 100 = Rs. 120. Difference = 123 - 120 = Rs. 3."
  },
  {
    id: 8,
    category: "quantitative",
    question: "A train passes a station platform in 36 seconds and a man standing on the platform in 20 seconds. If the speed of the train is 54 km/hr, what is the length of the platform?",
    options: ["120 m", "240 m", "300 m", "360 m"],
    correctAnswer: 1,
    explanation: "Speed of train = 54 * (5/18) = 15 m/sec. Distance covered to cross the man (length of train) = Speed * Time = 15 * 20 = 300 m. Let length of platform be L. Distance covered to cross the platform = 300 + L. Speed = (300 + L) / 36 => 15 = (300 + L) / 36 => 540 = 300 + L => L = 240 m."
  },

  // --- Logical Reasoning (8 questions) ---
  {
    id: 9,
    category: "logical",
    question: "Find the missing number in the series: 3, 5, 9, 17, 33, ?",
    options: ["48", "56", "65", "68"],
    correctAnswer: 2,
    explanation: "The difference between consecutive numbers doubles each time: 5-3=2, 9-5=4, 17-9=8, 33-17=16. The next difference should be 16 * 2 = 32. Thus, the next number is 33 + 32 = 65."
  },
  {
    id: 10,
    category: "logical",
    question: "If 'TIGER' is coded as 'QDFHS', then how is 'FISH' coded in that language?",
    options: ["GERH", "GRHE", "EHRG", "EGHR"],
    correctAnswer: 1,
    explanation: "Compare TIGER and QDFHS: T->S (last), I->H (fourth), G->F (third), E->D (second), R->Q (first). In other words, each letter is replaced by its preceding letter and the entire word is reversed. For FISH: F->E, I->H, S->R, H->G. Reversing EHRG gives GRHE."
  },
  {
    id: 11,
    category: "logical",
    question: "Pointing to a man, a woman said, 'His mother is the only daughter of my mother.' How is the woman related to the man?",
    options: ["Sister", "Grandmother", "Mother", "Aunt"],
    correctAnswer: 2,
    explanation: "The only daughter of the woman's mother is the woman herself. Therefore, the man's mother is that woman, meaning the woman is the man's mother."
  },
  {
    id: 12,
    category: "logical",
    question: "Statements: All bags are pockets. All pockets are boxes. Conclusions: I. All bags are boxes. II. All boxes are bags. Which of the conclusions logically follow?",
    options: ["Only conclusion I follows", "Only conclusion II follows", "Both conclusions I and II follow", "Neither I nor II follows"],
    correctAnswer: 0,
    explanation: "All bags are pockets, and all pockets are boxes. Therefore, all bags are boxes (Conclusion I is correct). However, not all boxes are bags (Conclusion II is not necessarily true)."
  },
  {
    id: 13,
    category: "logical",
    question: "If A + B means A is the brother of B; A - B means A is the sister of B; and A * B means A is the father of B. Which of the following means that C is the son of M?",
    options: ["M - N * C + F", "F - C + N * M", "N + M - F * C", "M * C + N - F"],
    correctAnswer: 3,
    explanation: "In 'M * C + N - F': M * C means M is the father of C. C + N means C is the brother of N. Thus C is male and a child of M, which makes C the son of M."
  },
  {
    id: 14,
    category: "logical",
    question: "Five persons A, B, C, D, and E are standing in a line facing North. C is standing exactly in the middle. A is standing to the immediate left of C. D is standing to the immediate right of E. Who is standing at the extreme right?",
    options: ["B", "D", "A", "E"],
    correctAnswer: 1,
    explanation: "Five spots: 1, 2, 3, 4, 5. C is in the middle (3). A is to the immediate left of C, so A is at 2. The configuration is _ A C _ _. The remaining spots are 1, 4, 5. D is to the immediate right of E, meaning they are next to each other as E D. The only consecutive spots available are 4 and 5. Thus, E is at 4 and D is at 5. B must be at 1. The arrangement is B A C E D. D is at the extreme right."
  },
  {
    id: 15,
    category: "logical",
    question: "If January 1, 2040 was a Sunday, then what day of the week was January 1, 2041?",
    options: ["Monday", "Tuesday", "Wednesday", "Thursday"],
    correctAnswer: 1,
    explanation: "2040 is a leap year (divisible by 4). A leap year contains 366 days, which is 52 weeks and 2 odd days. Therefore, the day of the week on Jan 1, 2041 will be 2 days ahead of Sunday, which is Tuesday."
  },
  {
    id: 16,
    category: "logical",
    question: "Choose the word which is least like the other words in the group:",
    options: ["Geometry", "Algebra", "Calculus", "Thermodynamics"],
    explanation: "Geometry, Algebra, and Calculus are branches of Mathematics, whereas Thermodynamics is a branch of Physics.",
    correctAnswer: 3
  },

  // --- Technical Coding / CS Concepts (9 questions) ---
  {
    id: 17,
    category: "technical",
    question: "What is the time complexity of searching for an element in a Hash Table in the average case and worst case respectively?",
    options: ["O(1), O(log n)", "O(1), O(n)", "O(log n), O(n)", "O(n), O(n)"],
    correctAnswer: 1,
    explanation: "In a hash table, the average time complexity for searching is O(1) due to direct hash function mapping. However, in the worst case (e.g., when all keys collide into the same bucket), searching degrades to O(n) as it traverses a linked list or tree."
  },
  {
    id: 18,
    category: "technical",
    question: "What is the output of the following JavaScript code snippet?",
    codeSnippet: "const obj = { \n  a: 1,\n  b: function() { return this.a; },\n  c: () => this.a\n};\nconsole.log(obj.b(), obj.c());",
    options: ["1 1", "1 undefined", "undefined 1", "Error"],
    correctAnswer: 1,
    explanation: "In JavaScript, regular functions have their 'this' bound to the object calling the function (so obj.b() returns 1). Arrow functions do not bind their own 'this' and inherit it from the enclosing scope (which is the global object or window in this case, where window.a is undefined)."
  },
  {
    id: 19,
    category: "technical",
    question: "Which of the following schedules is guaranteed to be conflict serializable in DBMS?",
    options: ["Every view serializable schedule", "Schedules following Two-Phase Locking (2PL)", "Schedules following tree protocol without locks", "All of the above"],
    correctAnswer: 1,
    explanation: "The Two-Phase Locking (2PL) protocol guarantees that any schedule generated is conflict serializable. View serializability is a broader class, so not all view serializable schedules are conflict serializable."
  },
  {
    id: 20,
    category: "technical",
    question: "What will be the output of the following code snippet?",
    codeSnippet: "#include <stdio.h>\nint main() {\n    int a = 10, b = 20;\n    int *p1 = &a, *p2 = &b;\n    *p1 = *p2;\n    p1 = p2;\n    *p1 = 30;\n    printf(\"%d %d\", a, b);\n    return 0;\n}",
    options: ["20 30", "10 20", "30 30", "20 20"],
    correctAnswer: 0,
    explanation: "Initially, a = 10, b = 20. p1 points to a, p2 points to b. *p1 = *p2 changes the value of a to b's value (a becomes 20). Then, p1 = p2 makes p1 point to b. *p1 = 30 changes b's value to 30. Finally, printf prints a and b, which are 20 and 30 respectively."
  },
  {
    id: 21,
    category: "technical",
    question: "Which data structure is used internally by the operating system for holding ready-to-run processes in a CPU scheduling system?",
    options: ["Stack", "Queue", "Binary Search Tree", "Max-Heap"],
    correctAnswer: 1,
    explanation: "The operating system uses a Ready Queue (typically implemented as a FIFO Queue or Priority Queue) to manage and schedule ready-to-run processes."
  },
  {
    id: 22,
    category: "technical",
    question: "In standard computer networking, which layer of the OSI model is responsible for routing packets across multiple networks?",
    options: ["Transport Layer", "Network Layer", "Data Link Layer", "Physical Layer"],
    correctAnswer: 1,
    explanation: "The Network Layer is responsible for routing packets, logical addressing (IP addresses), and packet forwarding across network boundaries."
  },
  {
    id: 23,
    category: "technical",
    question: "What is the primary difference between a process and a thread?",
    options: ["Processes share memory by default; threads do not.", "Threads share memory within the same process; processes run in separate address spaces.", "A process can have only one thread.", "Threads run in kernel space, while processes run in user space."],
    correctAnswer: 1,
    explanation: "A process has its own independent address space, while threads of the same process share the process's memory space, descriptors, and variables, making context switching faster between threads."
  },
  {
    id: 24,
    category: "technical",
    question: "What is the output of the following Python expression?",
    codeSnippet: "def func(x, y=[]):\n    y.append(x)\n    return y\n\nprint(func(1), func(2))",
    options: ["[1] [2]", "[1, 2] [1, 2]", "[1] [1, 2]", "[1, 2] [2]"],
    correctAnswer: 1,
    explanation: "In Python, default arguments are evaluated once when the function is defined, not when it is called. The default list 'y' is shared across all calls that do not provide an argument. So func(1) appends 1 to y (y becomes [1]) and returns it. func(2) appends 2 to the same list y (y becomes [1, 2]) and returns it. Since print evaluates both, it prints both references pointing to the same list, which is [1, 2] [1, 2]."
  },
  {
    id: 25,
    category: "technical",
    question: "Which SQL clause is used to filter records after they have been aggregated using a GROUP BY clause?",
    options: ["WHERE", "HAVING", "ORDER BY", "FILTER"],
    correctAnswer: 1,
    explanation: "The HAVING clause was added to SQL because the WHERE keyword could not be used with aggregate functions. HAVING filters records after aggregation, whereas WHERE filters before aggregation."
  },
  {
    id: 26,
    category: "quantitative",
    question: "In a stream running at 2 km/hr, a motor boat goes 10 km upstream and back to the starting point in 55 minutes. What is the speed of the motor boat in still water?",
    options: ["20 km/hr", "22 km/hr", "24 km/hr", "26 km/hr"],
    correctAnswer: 1,
    explanation: "Let speed in still water be x. Speed upstream = x - 2. Speed downstream = x + 2. Time = Distance/Speed => 10/(x - 2) + 10/(x + 2) = 55/60 = 11/12. Solving: 10 * 2x / (x^2 - 4) = 11/12 => 240x = 11x^2 - 44 => 11x^2 - 240x - 44 = 0. Resolving quadratic gives x = 22 km/hr."
  },
  {
    id: 27,
    category: "quantitative",
    question: "A and B invest in a business in the ratio 3:2. If 5% of the total profit goes to charity and A's share of profit is Rs. 855, what is the total profit?",
    options: ["Rs. 1425", "Rs. 1500", "Rs. 1537", "Rs. 1575"],
    correctAnswer: 1,
    explanation: "Let total profit be P. Profit distributed = 0.95P. A's share = 3/5 * 0.95P = 0.57P. We know 0.57P = 855 => P = 855 / 0.57 = Rs. 1500."
  },
  {
    id: 28,
    category: "quantitative",
    question: "The ratio of the ages of a father and his son is 7:3. The product of their ages is 189. What is the sum of their ages?",
    options: ["30 years", "40 years", "45 years", "50 years"],
    correctAnswer: 0,
    explanation: "Let ages be 7x and 3x. Product = 21x^2 = 189 => x^2 = 9 => x = 3. Father's age = 21, Son's age = 9. Sum of their ages = 21 + 9 = 30 years."
  },
  {
    id: 29,
    category: "quantitative",
    question: "Find the value of log10(0.0001).",
    options: ["-3", "-4", "-5", "-2"],
    correctAnswer: 1,
    explanation: "0.0001 can be written as 10^-4. Therefore, log10(10^-4) = -4 * log10(10) = -4."
  },
  {
    id: 30,
    category: "logical",
    question: "Choose the pair that expresses a relationship similar to the given pair: LIGHT : BLIND",
    options: ["SPEECH : DUMB", "LANGUAGE : DEAF", "TONGUE : SOUND", "VOICE : VIBRATION"],
    correctAnswer: 0,
    explanation: "A blind person cannot perceive light; similarly, a dumb person cannot speak (perceive/generate speech)."
  },
  {
    id: 31,
    category: "logical",
    question: "If the 12th of a month is a Wednesday, what day of the same month will the 27th be?",
    options: ["Wednesday", "Thursday", "Friday", "Saturday"],
    correctAnswer: 1,
    explanation: "Number of days between 12th and 27th = 27 - 12 = 15 days. 15 days = 2 weeks and 1 odd day. Wednesday + 1 day = Thursday."
  },
  {
    id: 32,
    category: "logical",
    question: "Arrange the following words in a logical sequence: 1. Presentation, 2. Recommendation, 3. Arrival, 4. Discussion, 5. Introduction",
    options: ["3, 5, 1, 4, 2", "5, 3, 4, 1, 2", "3, 5, 4, 1, 2", "5, 3, 1, 2, 4"],
    correctAnswer: 0,
    explanation: "The logical sequence is: Arrival (3) -> Introduction (5) -> Presentation (1) -> Discussion (4) -> Recommendation (2)."
  },
  {
    id: 33,
    category: "technical",
    question: "Which of the following concepts refers to the capacity to reuse existing code in Object-Oriented Programming?",
    options: ["Polymorphism", "Encapsulation", "Inheritance", "Abstraction"],
    correctAnswer: 2,
    explanation: "Inheritance allows a new class (derived class) to inherit attributes and methods of an existing class (base class), supporting code reusability."
  },
  {
    id: 34,
    category: "technical",
    question: "What is the primary function of the Address Resolution Protocol (ARP) in a local network?",
    options: [
      "To map logical IP addresses to physical MAC addresses",
      "To route packets between different subnets",
      "To assign dynamic IP addresses to network hosts",
      "To encrypt data transmission across WAN connections"
    ],
    correctAnswer: 0,
    explanation: "ARP is used to translate IPv4 addresses (Network Layer) into MAC addresses (Data Link Layer) for devices on the same physical link."
  },
  {
    id: 35,
    category: "technical",
    question: "Which CPU scheduling algorithm can lead to starvation (indefinite blocking) of low-priority processes?",
    options: ["Round Robin", "First Come First Served", "Priority Scheduling", "Shortest Job First (non-preemptive)"],
    correctAnswer: 2,
    explanation: "In priority scheduling, higher priority processes keep executing, leaving lower priority processes waiting indefinitely (starvation). This can be resolved using aging."
  }
];

export const onCampusCodingQuestions: CodingQuestion[] = [
  {
    id: 1,
    title: "Reverse Words in a String",
    description: "Given an input string `s`, reverse the order of the words.\n\nA **word** is defined as a sequence of non-space characters. The words in `s` will be separated by at least one space.\n\nReturn *a string of the words in reverse order concatenated by a single space.* Note that `s` may contain leading or trailing spaces or multiple spaces between two words. The returned string should only have a single space separating the words. Do not include any extra spaces.",
    constraints: [
      "1 <= s.length <= 10^4",
      "s contains English letters (upper-case and lower-case), digits, and spaces ' '.",
      "There is at least one word in s."
    ],
    examples: [
      {
        input: 's = "the sky is blue"',
        output: '"blue is sky the"'
      },
      {
        input: 's = "  hello world  "',
        output: '"world hello"',
        explanation: "Your reversed string should not contain leading or trailing spaces."
      },
      {
        input: 's = "a good   example"',
        output: '"example good a"',
        explanation: "You need to reduce multiple spaces between two words to a single space in the reversed string."
      }
    ],
    starterTemplates: {
      javascript: `function reverseWords(s) {\n    // Write your code here\n    \n}`,
      python: `class Solution:\n    def reverseWords(self, s: str) -> str:\n        # Write your code here\n        pass`,
      cpp: `#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    string reverseWords(string s) {\n        // Write your code here\n        \n    }\n};`,
      java: `public class Solution {\n    public String reverseWords(String s) {\n        // Write your code here\n        return "";\n    }\n}`
    }
  },
  {
    id: 2,
    title: "Valid Parentheses",
    description: "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
    constraints: [
      "1 <= s.length <= 10^4",
      "s consists of parentheses only: '()[]{}'."
    ],
    examples: [
      {
        input: 's = "()"',
        output: "true"
      },
      {
        input: 's = "()[]{}"',
        output: "true"
      },
      {
        input: 's = "(]"',
        output: "false"
      },
      {
        input: 's = "([])"',
        output: "true"
      }
    ],
    starterTemplates: {
      javascript: `function isValid(s) {\n    // Write your code here\n    \n}`,
      python: `class Solution:\n    def isValid(self, s: str) -> bool:\n        # Write your code here\n        pass`,
      cpp: `#include <string>\n#include <stack>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isValid(string s) {\n        // Write your code here\n        \n    }\n};`,
      java: `import java.util.Stack;\n\npublic class Solution {\n    public boolean isValid(String s) {\n        // Write your code here\n        return false;\n    }\n}`
    }
  },
  {
    id: 3,
    title: "Two Sum",
    description: "Given an array of integers `nums` and an integer `target`, return *indices of the two numbers such that they add up to `target`*.\n\nYou may assume that each input would have ***exactly* one solution**, and you may not use the *same* element twice.\n\nYou can return the answer in any order.",
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists."
    ],
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]"
      },
      {
        input: "nums = [3,3], target = 6",
        output: "[0,1]"
      }
    ],
    starterTemplates: {
      javascript: `function twoSum(nums, target) {\n    // Write your code here\n    \n}`,
      python: `from typing import List\n\nclass Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        # Write your code here\n        pass`,
      cpp: `#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your code here\n        \n    }\n};`,
      java: `import java.util.HashMap;\n\npublic class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your code here\n        return new int[0];\n    }\n}`
    }
  },
  {
    id: 4,
    title: "Merge Intervals",
    description: "Given an array of `intervals` where `intervals[i] = [starti, endi]`, merge all overlapping intervals, and return *an array of the non-overlapping intervals that cover all the intervals in the input*.",
    constraints: [
      "1 <= intervals.length <= 10^4",
      "intervals[i].length == 2",
      "0 <= starti <= endi <= 10^4"
    ],
    examples: [
      {
        input: "intervals = [[1,3],[2,6],[8,10],[15,18]]",
        output: "[[1,6],[8,10],[15,18]]",
        explanation: "Since intervals [1,3] and [2,6] overlap, merge them into [1,6]."
      },
      {
        input: "intervals = [[1,4],[4,5]]",
        output: "[[1,5]]",
        explanation: "Intervals [1,4] and [4,5] are considered overlapping."
      }
    ],
    starterTemplates: {
      javascript: `function merge(intervals) {\n    // Write your code here\n    return [];\n}`,
      python: `from typing import List\n\nclass Solution:\n    def merge(self, intervals: List[List[int]]) -> List[List[int]]:\n        # Write your code here\n        pass`,
      cpp: `#include <vector>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<vector<int>> merge(vector<vector<int>>& intervals) {\n        // Write your code here\n        return {};\n    }\n};`,
      java: `import java.util.Arrays;\n\nclass Solution {\n    public int[][] merge(int[][] intervals) {\n        // Write your code here\n        return new int[0][0];\n    }\n}`
    }
  },
  {
    id: 5,
    title: "String Compression",
    description: "Given an array of characters `chars`, compress it using the following algorithm:\n\nBegin with an empty string `s`. For each group of consecutive repeating characters in `chars`:\n- If the group's length is 1, append the character to `s`.\n- Otherwise, append the character followed by the group's length.\n\nThe compressed string `s` should not be returned separately, but instead, be stored in the input character array `chars`. Note that group lengths that are 10 or longer will be split into multiple characters in `chars`.\n\nAfter you are done modifying the input array, return *the new length of the array*.",
    constraints: [
      "1 <= chars.length <= 2000",
      "chars[i] is a lowercase English letter, uppercase English letter, digit, or symbol."
    ],
    examples: [
      {
        input: 'chars = ["a","a","b","b","c","c","c"]',
        output: "6",
        explanation: 'The first 6 characters of the input array should be: ["a","2","b","2","c","3"]'
      },
      {
        input: 'chars = ["a"]',
        output: "1",
        explanation: 'The groups are just ["a"], which remains uncompressed since it\'s length 1.'
      },
      {
        input: 'chars = ["a","b","b","b","b","b","b","b","b","b","b","b","b"]',
        output: "4",
        explanation: 'The first 4 characters of the input array should be: ["a","b","1","2"].'
      }
    ],
    starterTemplates: {
      javascript: `function compress(chars) {\n    // Write your code here\n    return 0;\n}`,
      python: `from typing import List\n\nclass Solution:\n    def compress(self, chars: List[str]) -> int:\n        # Write your code here\n        return 0`,
      cpp: `#include <vector>\n#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    int compress(vector<char>& chars) {\n        // Write your code here\n        return 0;\n    }\n};`,
      java: `class Solution {\n    public int compress(char[] chars) {\n        // Write your code here\n        return 0;\n    }\n}`
    }
  }
];
