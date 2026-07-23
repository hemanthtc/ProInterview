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

export const offCampusMCQs: MCQQuestion[] = [
  // --- Domain Assessments (15 questions) ---
  {
    id: 1,
    category: "domain",
    question: "What is the worst-case time complexity of searching for a key in a balanced Red-Black Tree containing N elements?",
    options: ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
    correctAnswer: 1,
    explanation: "A Red-Black Tree is a self-balancing binary search tree. In both average and worst cases, operations such as search, insertion, and deletion run in O(log N) time, where N is the total number of elements in the tree."
  },
  {
    id: 2,
    category: "domain",
    question: "Which of the following algorithms is best suited for finding the shortest paths between all pairs of vertices in a weighted graph containing negative edge weights but no negative cycles?",
    options: ["Dijkstra's Algorithm", "Bellman-Ford Algorithm", "Floyd-Warshall Algorithm", "Kruskal's Algorithm"],
    correctAnswer: 2,
    explanation: "The Floyd-Warshall algorithm is a dynamic programming algorithm that finds all-pairs shortest paths in O(V^3) time. It correctly handles graphs with negative edge weights as long as there are no negative cycles. Dijkstra's cannot handle negative edge weights, Kruskal's is for Minimum Spanning Trees, and Bellman-Ford is for single-source shortest paths."
  },
  {
    id: 3,
    category: "domain",
    question: "Under the CAP Theorem, when a network partition (P) occurs, what trade-off must a distributed database make?",
    options: [
      "Between Consistency (C) and Availability (A)",
      "Between Availability (A) and Partition Tolerance (P)",
      "Between Consistency (C) and Latency (L)",
      "No trade-off is required; all three properties can still be maintained"
    ],
    correctAnswer: 0,
    explanation: "The CAP Theorem states that in the event of a network partition (P), a distributed system must choose either Consistency (C) (refusing requests to avoid stale data) or Availability (A) (processing requests but returning potentially inconsistent data). It cannot maintain both simultaneously."
  },
  {
    id: 4,
    category: "domain",
    question: "In a Relational Database, which transaction isolation level prevents dirty reads but still allows non-repeatable reads and phantom reads to occur?",
    options: ["Read Uncommitted", "Read Committed", "Repeatable Read", "Serializable"],
    correctAnswer: 1,
    explanation: "The 'Read Committed' isolation level ensures that a query can only read data that has been committed. This prevents dirty reads. However, since other transactions can modify and commit data during the current transaction, subsequent reads might yield different results (non-repeatable reads) or show newly inserted rows (phantom reads)."
  },
  {
    id: 5,
    category: "domain",
    question: "Why do high-performance database storage engines (like InnoDB or RocksDB) write transaction updates to a Write-Ahead Log (WAL) before updating the main database tables on disk?",
    options: [
      "To verify the index structures are syntactically correct",
      "To ensure transaction Durability (D in ACID) efficiently via sequential disk writes",
      "To automatically compress tablespace files in the background",
      "To prevent unauthorized client connections from corrupting data"
    ],
    correctAnswer: 1,
    explanation: "Writing to a Write-Ahead Log (WAL) is done using fast sequential disk writes. Once written to the WAL, the transaction is durable even if the system crashes before the modified database tables (random disk writes) are flushed to disk. This significantly improves write throughput while guaranteeing Durability."
  },
  {
    id: 6,
    category: "domain",
    question: "When designing a large-scale database cluster, what is the primary benefit of using Consistent Hashing for data sharding over simple modulo hashing (hash(key) % N)?",
    options: [
      "Modulo hashing is slow to compute compared to consistent hashing",
      "Consistent hashing eliminates hashing collisions entirely",
      "It minimizes the amount of data that needs to be remapped/moved when database nodes are added or removed from the cluster",
      "Consistent hashing automatically replicates data to multiple geographical regions"
    ],
    correctAnswer: 2,
    explanation: "With simple modulo hashing, adding or removing a database node changes N, causing almost all keys to map to different nodes, which requires massive data migration. Consistent hashing distributes keys along a hash ring, ensuring that when a node is added or removed, only a small fraction of keys (roughly 1/N) need to be reallocated."
  },
  {
    id: 7,
    category: "domain",
    question: "In caching strategies, what characterizes the behavior of a 'Cache-Aside' (Lazy Loading) cache on a data write operation?",
    options: [
      "The application writes directly to the cache, which asynchronously updates the database",
      "The application writes directly to the database, and the cache entry is either invalidated (removed) or updated",
      "The application writes to the cache, which synchronously updates the database before returning",
      "The cache automatically intercepts write calls and delays them until low-traffic periods"
    ],
    correctAnswer: 1,
    explanation: "In a Cache-Aside pattern, the database is the primary authority. During write operations, the application updates the database directly and invalidates the corresponding cache entry. On next read, a cache miss occurs, and the application loads the updated data from the database into the cache."
  },
  {
    id: 8,
    category: "domain",
    question: "What is the primary operational difference between a Token Bucket and a Leaky Bucket rate limiting algorithm?",
    options: [
      "A Token Bucket does not restrict peak traffic rate, whereas Leaky Bucket completely blocks bursts",
      "A Token Bucket allows bursty traffic up to the bucket's capacity, whereas a Leaky Bucket smoothens out traffic by releasing requests at a constant rate",
      "Leaky Bucket requires memory storage for request tokens, while Token Bucket is stateless",
      "Token Bucket only operates on client IP addresses, whereas Leaky Bucket filters traffic content"
    ],
    correctAnswer: 1,
    explanation: "A Token Bucket accumulates tokens and allows bursts of requests as long as there are tokens available. A Leaky Bucket processes requests through a queue at a fixed, constant egress rate, smoothing out bursty traffic into a steady stream. Requests exceeding queue capacity are dropped."
  },
  {
    id: 9,
    category: "domain",
    question: "Which of the following statements about the JavaScript Event Loop is correct regarding microtasks (e.g., Promise.then callbacks) and macrotasks (e.g., setTimeout callbacks)?",
    options: [
      "Macrotasks are executed with higher priority than microtasks",
      "Microtasks are executed in parallel using Web Worker threads",
      "The microtask queue is fully cleared before processing the next macrotask in the queue",
      "Microtasks and macrotasks are processed in alternating order one-by-one"
    ],
    correctAnswer: 2,
    explanation: "In the JavaScript Event Loop, after executing the current script or macrotask, the entire microtask queue is flushed (executed until empty), even if new microtasks are queued during execution. Only when the microtask queue is empty does the Event Loop proceed to render layout updates or execute the next macrotask."
  },
  {
    id: 10,
    category: "domain",
    question: "What sequence of packets is transmitted between a client and server during the establishment of a TCP connection?",
    options: [
      "SYN -> ACK -> SYN-ACK",
      "SYN -> SYN-ACK -> ACK",
      "SYN -> DATA -> ACK",
      "SYN-ACK -> SYN -> ACK"
    ],
    correctAnswer: 1,
    explanation: "A TCP connection is established using a three-way handshake: 1. The client sends a SYN (Synchronize) packet. 2. The server responds with a SYN-ACK (Synchronize-Acknowledge) packet. 3. The client replies with an ACK (Acknowledge) packet to complete connection initialization."
  },
  {
    id: 11,
    category: "domain",
    question: "What is the time complexity of pushing an element into a binary min-heap containing N elements?",
    options: ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
    correctAnswer: 1,
    explanation: "To push a value into a binary min-heap, the element is added at the end of the heap and bubble-up (up-heapify) is performed. In the worst case, the element moves from the bottom to the root, which is proportional to the tree height, yielding O(log N) complexity."
  },
  {
    id: 12,
    category: "domain",
    question: "Under heavy write traffic, what is the best strategy to improve write availability and minimize write latency on a distributed database?",
    options: [
      "Increase transaction isolation level to Serializable",
      "Use vertical scaling for slave replica instances",
      "Implement database sharding and route writes to master shards using Consistent Hashing",
      "Disable the Write-Ahead Log (WAL) completely across all shards"
    ],
    correctAnswer: 2,
    explanation: "Database sharding splits write traffic across multiple independent master shards, scaling the write throughput horizontally. Modulo or consistent hashing routes keys directly to their responsible master shard, minimizing write lock contention and write latency."
  },
  {
    id: 13,
    category: "domain",
    question: "What problem does the Virtual Memory Page Replacement Algorithm 'Least Recently Used (LRU)' attempt to solve?",
    options: [
      "Deciding which virtual memory page should be mapped to the GPU memory space",
      "Selecting which memory page to evict from physical memory (RAM) when page faults occur and memory is full",
      "Preventing cache pollution by speculative branch prediction units in the CPU",
      "Translating virtual addresses to physical RAM addresses in O(1) time"
    ],
    correctAnswer: 1,
    explanation: "When physical RAM is full and a process requests a page not currently in RAM (page fault), the OS must select a page to swap out to disk. LRU evicts the page that has not been referenced for the longest period of time, based on the assumption that pages used recently are more likely to be used again soon."
  },
  {
    id: 14,
    category: "domain",
    question: "In database design, what indexing type is most effective for speed-matching exact queries (e.g., SELECT * FROM users WHERE id = 105) but ineffective for range queries (e.g., WHERE age BETWEEN 20 AND 30)?",
    options: ["B+ Tree Index", "Hash Index", "Bitmap Index", "Inverted Index"],
    correctAnswer: 1,
    explanation: "A Hash Index uses a hash function to map keys to bucket addresses, providing O(1) average lookup times for exact matches. However, because hash values are unordered, range queries cannot use the index, and a full table scan is required. B+ Trees maintain keys in sorted order, which makes them highly effective for range queries."
  },
  {
    id: 15,
    category: "domain",
    question: "What is the primary difference between processes and threads regarding memory layout?",
    options: [
      "Threads have separate address spaces, whereas processes share memory directly",
      "Processes have separate virtual address spaces, while threads of the same process share code, global variables, and heap memory, maintaining only separate stack space and registers",
      "Processes are managed by hardware, while threads are always managed by software interpreters",
      "Threads share the same call stack and registers, whereas processes have separate stacks"
    ],
    correctAnswer: 1,
    explanation: "A process is an isolated execution environment with its own private virtual memory space. Threads are sub-units of a process that share the parent process's memory (heap, code, static data). Each thread maintains its own private registers and call stack to track function execution execution."
  },

  // --- Situational Judgment (10 questions) ---
  {
    id: 16,
    category: "situational",
    question: "A client reports a critical, system-blocking defect on production just as you are wrapping up your work before leaving for a pre-approved week-long vacation. Your teammates are occupied with their tasks. What is the most responsible action?",
    options: [
      "Postpone your vacation immediately, fix the issue, and release a hotfix before leaving",
      "Ignore the report, as your vacation is pre-approved and you are off-duty once you leave",
      "Document the defect, share reproduction steps and context on the team channel, notify the product manager/lead, and hand it off cleanly to a teammate before departing",
      "Send a quick fix attempt without testing it first to save time, then log off immediately"
    ],
    correctAnswer: 2,
    explanation: "While vacations are pre-approved, leaving a critical defect without communication is irresponsible. The professional approach is to document the context, notify the lead/PM, and arrange a clean handoff so a teammate can address it safely, avoiding untested code changes."
  },
  {
    id: 17,
    category: "situational",
    question: "During a technical design review, a junior engineer proposes an alternative architecture for a new feature. You strongly disagree with their proposal and believe it has scaling limitations. How should you address this?",
    options: [
      "Interrupt them and state that the proposal is invalid and will not work under production load",
      "Listen to their proposal, ask open-ended questions about how they plan to handle specific load/scaling edge cases, and present objective data comparing both approaches",
      "Tell the junior engineer that design decisions are the sole responsibility of senior staff",
      "Approve the junior's plan anyway to build their confidence, even if it leads to later outages"
    ],
    correctAnswer: 1,
    explanation: "Architectural arguments should be settled objectively rather than by authority. Listening fully, asking constructive questions about scaling bottlenecks, and presenting comparative metrics allows the team to align on the best technical solution while mentoring junior engineers."
  },
  {
    id: 18,
    category: "situational",
    question: "You deploy a new service optimization. Shortly after, the monitoring dashboards show a major latency regression on a related database node. What is your immediate priority?",
    options: [
      "Search the code history to identify which developer wrote the database code originally",
      "Roll back the deployment immediately to restore service health, then investigate the root cause in the staging/test environment",
      "Keep the deployment active and start refactoring database indices live in the production console",
      "Declare that database latency is the database administrator's problem and ignore it"
    ],
    correctAnswer: 1,
    explanation: "During production incidents, the primary goal is minimizing customer impact (Mean Time to Resolution). Reverting/rolling back the suspect deployment is the fastest way to restore stability. Once production is stable, you can debug the latency regression safely in dev."
  },
  {
    id: 19,
    category: "situational",
    question: "A product manager requests that the engineering team skip automated testing (unit and integration tests) for the current sprint to meet a critical marketing release date. How should the engineering lead respond?",
    options: [
      "Agree immediately to show agility and flexibility to the business stakeholders",
      "Refuse flatly and refuse to communicate with the product manager until they respect engineering rules",
      "Explain the risks (increased technical debt, potential production bugs, longer test/manual cycles later) and collaborate on scope reduction to meet the date safely",
      "Pretend to write tests but check in dummy mocks to pass CI checks"
    ],
    correctAnswer: 2,
    explanation: "Completely skipping tests introduces severe quality risks. The professional response is to explain these risks objectively and suggest reducing scope (features) or adjusting the timeline, ensuring that what gets released is stable and maintainable."
  },
  {
    id: 20,
    category: "situational",
    question: "You commit a hotfix to resolve an outage during off-hours, but it inadvertently triggers a secondary service failure. You are exhausted and have been coding for 6 hours. What is the best action?",
    options: [
      "Keep writing fixes until the issue is solved, even if you are exhausted and prone to errors",
      "Notify the on-call team or engineering lead immediately, outline what was changed, and ask for backup or a second pair of eyes to verify the next rollback/fix",
      "Shut down your laptop and go to sleep, assuming someone else will notice the secondary issue",
      "Delete the commit logs to hide that you made the change"
    ],
    correctAnswer: 1,
    explanation: "Exhaustion leads to mistakes, especially under pressure. Communicating clearly, admitting the secondary issue, and asking for support/reviews from team members ensures production safety and prevents further escalations."
  },
  {
    id: 21,
    category: "situational",
    question: "Two senior developers on your team are engaged in a heated argument over whether to use tabs or spaces, causing pull requests to block. How should this be resolved?",
    options: [
      "Support the developer with the higher seniority or tenure on the team",
      "Suggest that the team establish a project-wide formatting standard using linting tools (like Prettier/ESLint) and enforce it automatically in CI/CD pipeline",
      "Let the developers continue arguing until they reach a verbal agreement",
      "Allow each developer to format files in their own style, even if it mixes formats in the same file"
    ],
    correctAnswer: 1,
    explanation: "Style arguments waste developer time. Establishing an automated formatting tool (Prettier/ESLint) removes subjective debates, enforces consistency across the codebase, and prevents blockages during peer review."
  },
  {
    id: 22,
    category: "situational",
    question: "You notice a team member is repeatedly missing standups and falling behind on their sprint commitments, affecting overall velocity. What is the most constructive first step?",
    options: [
      "Report their poor performance directly to the engineering manager during your next 1-on-1",
      "Complain about their performance publicly during the next sprint retrospective",
      "Reach out to the team member privately, ask if they are facing any technical blocks or personal challenges, and offer assistance",
      "Absorb their tasks quietly without saying anything to avoid conflict"
    ],
    correctAnswer: 2,
    explanation: "A supportive team culture prioritizes empathy. Reaching out privately allows you to understand if they are facing burnout, personal problems, or complex blockers, enabling the team to help them recover rather than escalating immediately."
  },
  {
    id: 23,
    category: "situational",
    question: "You discover that a private API credential/security key has been accidentally committed and pushed to the public git repository history. What is the correct remediation sequence?",
    options: [
      "Delete the file containing the key and make a new commit pushing it to the repository",
      "Revoke (rotate) the API key immediately at the provider, clean the git history using tools like BFG Repo-Cleaner or git-filter-repo, and push the clean history",
      "Ignore it, as the repository is not highly publicized and the keys are likely safe",
      "Ask the developer who committed it to delete their local repository copy"
    ],
    correctAnswer: 1,
    explanation: "Once a secret is pushed, it is compromised. Simply deleting it in a new commit leaves it in the git commit history. The key must be rotated/revoked immediately to prevent exploit, and git history must be purged of the secret block before force pushing."
  },
  {
    id: 24,
    category: "situational",
    question: "A peer reviewer leaves a comment on your pull request indicating that your logic loop is inefficient. You believe your implementation is optimal and correct. How should you respond?",
    options: [
      "Mark the comment as resolved and merge the pull request immediately",
      "Respond defensively, indicating that your code works and they should focus on their own code",
      "Analyze their suggestion objectively, provide a concise explanation (or benchmark data) explaining your design choice, and remain open to alternative solutions",
      "Rewrite the entire pull request using their logic, even if you know it is incorrect"
    ],
    correctAnswer: 2,
    explanation: "Code reviews are collaboration opportunities. Professional dialogue should be objective, technical, and respectful. Explaining the reasoning or sharing benchmark metrics helps align both developers without defensiveness."
  },
  {
    id: 25,
    category: "situational",
    question: "A business client requests a complex feature that directly conflicts with the core design of your SaaS service. Implementing it as requested would make future updates difficult for other clients. What should you do?",
    options: [
      "Build the feature exactly as requested by the client, regardless of code quality",
      "Decline the client's request flatly and refuse any further calls with them",
      "Work with the product manager to understand the client's underlying business need, and propose a generic, clean extension/API that solves their problem without violating architecture patterns",
      "Implement the feature as a secret block of code that is enabled only for that client"
    ],
    correctAnswer: 2,
    explanation: "Custom, anti-pattern updates cause major technical debt. Understanding the core need allows engineering to design a clean, extensible solution that satisfies the customer while preserving system integrity for all other users."
  },
  {
    id: 26,
    category: "domain",
    question: "In caching strategies, what characterizes the behavior of a 'Write-Back' (Write-Behind) cache on a data write operation?",
    options: [
      "The application writes directly to the cache, which immediately and synchronously writes to the database",
      "The application writes to the cache, and the cache asynchronously updates the database at a later time",
      "The application writes directly to the database, and the cache is updated synchronously",
      "The cache is bypassed, and data is written directly to physical disk sectors"
    ],
    correctAnswer: 1,
    explanation: "Write-Back cache writes updates to the cache memory first and acknowledges the write immediately. The data is written back to the database asynchronously, offering high write performance but with a risk of data loss in power failure before writing to DB."
  },
  {
    id: 27,
    category: "domain",
    question: "Which graph algorithm or traversal strategy uses a Stack data structure (or recursion) to explore nodes as deep as possible before backtracking?",
    options: ["Breadth-First Search (BFS)", "Depth-First Search (DFS)", "Dijkstra's Algorithm", "Kruskal's Algorithm"],
    correctAnswer: 1,
    explanation: "Depth-First Search (DFS) uses a stack structure (either the system call stack via recursion or an explicit stack object) to traverse along branches to their deepest nodes before backtracking."
  },
  {
    id: 28,
    category: "domain",
    question: "What is the primary function of the Domain Name System (DNS)?",
    options: [
      "To translate human-readable domain names into machine-readable IP addresses",
      "To allocate dynamic IP addresses to home network routers",
      "To encrypt browser traffic using public key certificates",
      "To manage session cache states on web servers"
    ],
    correctAnswer: 0,
    explanation: "DNS acts as the address book of the Internet, translating user-friendly domain names (e.g. google.com) into numerical IP addresses needed to locate servers."
  },
  {
    id: 29,
    category: "domain",
    question: "In database design, what is the main advantage of a Clustered Index over a Non-Clustered Index?",
    options: [
      "A table can have multiple clustered indices but only one non-clustered index",
      "A clustered index physically orders the rows of data in the table based on the index key",
      "A clustered index does not consume storage space on the disk",
      "A clustered index only stores keys but cannot retrieve column data"
    ],
    correctAnswer: 1,
    explanation: "A clustered index defines the physical order of data rows in a table. Because the rows are stored sequentially matching the index key, lookups on range scans are highly optimized. Hence, a table can have only one clustered index."
  },
  {
    id: 30,
    category: "domain",
    question: "Which HTTP security response header is designed to defend against clickjacking attacks by controlling whether a page can be loaded inside an <iframe>?",
    options: ["Strict-Transport-Security", "Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options"],
    correctAnswer: 2,
    explanation: "The X-Frame-Options header can be set to DENY or SAMEORIGIN to prevent the browser from loading pages in iframes on external sites, preventing attackers from overlaying transparent clickjacking components."
  },
  {
    id: 31,
    category: "situational",
    question: "A major service deployment breaks backward compatibility with old client APIs. The product manager wants you to ignore complaints since they represent a small client base. What should you do?",
    options: [
      "Follow instructions and ignore incoming complaints to maintain velocity",
      "Advocate for the clients, document the compatibility issues, and work out a reasonable migration window/workaround timeline with product stakeholders",
      "Submit a rollback commit secretly without asking for approval",
      "Contact the affected clients directly and tell them to blame the product manager"
    ],
    correctAnswer: 1,
    explanation: "Ignoring client breaking updates creates poor trust and future liability. The engineering approach is to advocate for smooth operations, explain risks, outline workarounds, and align on an explicit migration window."
  },
  {
    id: 32,
    category: "situational",
    question: "A teammate presents a technical design you authored as their own in front of management. How should you handle this?",
    options: [
      "Confront them aggressively during the meeting to set the record straight immediately",
      "Do nothing, assuming engineering work is anonymous and management doesn't care",
      "Speak with the teammate privately first to clarify contributions, and in subsequent follow-ups/reviews, speak politely and present detailed diagrams outlining your section of the architecture",
      "Refuse to work on the project and ask to be transferred to another manager"
    ],
    correctAnswer: 2,
    explanation: "Aggressive confrontation ruins team collaboration, while silence invites future plagiarism. A private check-in gives them a chance to correct it, and detailing your design contributions in written reviews asserts your role professionally."
  },
  {
    id: 33,
    category: "situational",
    question: "A critical bug is discovered in a production system. Solving it requires modifying a service owned by another team. The owner of that service is out of office. What is the most appropriate action?",
    options: [
      "Wait for the owner to return from vacation before making changes",
      "Consult the tech lead or engineering manager, write a minimal, well-documented fix, and get it reviewed by another senior engineer/lead before merging",
      "Deploy a change to their repository directly without writing unit tests to solve the outage quickly",
      "Disable the broken service completely on production without notifying anyone"
    ],
    correctAnswer: 1,
    explanation: "Waiting during production bugs is unacceptable, but cowboy modifications are dangerous. Consulting leadership, authoring a minimal test-backed fix, and having another senior review the changes maintains stability and respect for code ownership."
  },
  {
    id: 34,
    category: "situational",
    question: "You realize midway through a sprint that your estimate for a complex coding task was too optimistic, and it will take twice as long to complete. What should you do?",
    options: [
      "Work overnight and cut corners (skip writing unit tests) to fit it in the deadline",
      "Wait until the sprint demo to announce that the task is not completed",
      "Flag the delay immediately to the scrum master and team, explain the technical complexities found, and adjust sprint commitments or request help",
      "Mark the task as completed anyway and push half-finished code"
    ],
    correctAnswer: 2,
    explanation: "Transparency is critical in agile. Raising estimators issues early allows the team to adjust scope, balance workloads, manage stakeholder expectations, and maintain code quality without introducing technical debt."
  },
  {
    id: 35,
    category: "situational",
    question: "During implementation, the product manager requests major new features that expand the project scope. How should the lead developer respond?",
    options: [
      "Accept all scope changes immediately and promise to meet the same launch date",
      "Refuse all scope changes outright and block any future design adjustments",
      "Formally raise a change request, evaluate the timeline and architectural impact, and align with leadership on either adjusting the release date or reducing scope",
      "Implement the features poorly so that they break on launch to show the impact of scope creep"
    ],
    correctAnswer: 2,
    explanation: "Scope creep threatens project quality and developer health. Evaluating changes formally, updating target dates, and negotiating compromises ensures stable development practices and keeps expectations aligned."
  }
];

export const offCampusCodingQuestions: CodingQuestion[] = [
  {
    id: 1,
    title: "Longest Palindromic Substring",
    description: "Given a string `s`, return the longest palindromic substring in `s`.\n\nA string is palindromic if it reads the same backward as forward.",
    constraints: [
      "1 <= s.length <= 1000",
      "s consists of only digits and English letters."
    ],
    examples: [
      {
        input: 's = "babad"',
        output: '"bab"',
        explanation: '"aba" is also a valid answer.'
      },
      {
        input: 's = "cbbd"',
        output: '"bb"'
      }
    ],
    starterTemplates: {
      javascript: `function longestPalindrome(s) {\n    // Write your code here\n    return "";\n}`,
      python: `def longestPalindrome(s: str) -> str:\n    # Write your code here\n    return ""`,
      cpp: `#include <string>\n\nclass Solution {\npublic:\n    std::string longestPalindrome(std::string s) {\n        // Write your code here\n        return "";\n    }\n};`,
      java: `class Solution {\n    public String longestPalindrome(String s) {\n        // Write your code here\n        return "";\n    }\n}`
    }
  },
  {
    id: 2,
    title: "Merge k Sorted Lists",
    description: "You are given an array of `k` linked-lists `lists`, each linked-list is sorted in ascending order.\n\nMerge all the linked-lists into one sorted linked-list and return it.\n\nNote: A linked-list node is represented as an object with `val` (number) and `next` (Node or null) properties.",
    constraints: [
      "k == lists.length",
      "0 <= k <= 10^4",
      "0 <= lists[i].length <= 500",
      "-10^4 <= lists[i][j] <= 10^4",
      "lists[i] is sorted in ascending order."
    ],
    examples: [
      {
        input: "lists = [[1,4,5],[1,3,4],[2,6]]",
        output: "[1,1,2,3,4,4,5,6]",
        explanation: "The linked-lists are:\n[\n  1->4->5,\n  1->3->4,\n  2->6\n]\nmerging them into one sorted list:\n1->1->2->3->4->4->5->6"
      },
      {
        input: "lists = []",
        output: "[]"
      }
    ],
    starterTemplates: {
      javascript: `/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\nfunction mergeKLists(lists) {\n    // Write your code here\n    return null;\n}`,
      python: `# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\ndef mergeKLists(lists: list) -> ListNode:\n    # Write your code here\n    return None`,
      cpp: `struct ListNode {\n    int val;\n    ListNode *next;\n    ListNode() : val(0), next(nullptr) {}\n    ListNode(int x) : val(x), next(nullptr) {}\n    ListNode(int x, ListNode *next) : val(x), next(next) {}\n};\n\n#include <vector>\n\nclass Solution {\npublic:\n    ListNode* mergeKLists(std::vector<ListNode*>& lists) {\n        // Write your code here\n        return nullptr;\n    }\n};`,
      java: `class ListNode {\n    int val;\n    ListNode next;\n    ListNode() {}\n    ListNode(int val) { this.val = val; }\n    ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n}\n\nclass Solution {\n    public ListNode mergeKLists(ListNode[] lists) {\n        // Write your code here\n        return null;\n    }\n}`
    }
  },
  {
    id: 3,
    title: "LRU Cache Design",
    description: "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.\n\nImplement the `LRUCache` class:\n- `LRUCache(capacity)` Initialize the LRU cache with positive size capacity.\n- `get(key)` Return the value of the key if the key exists, otherwise return -1.\n- `put(key, value)` Update the value of the key if the key exists. Otherwise, add the key-value pair to the cache. If the number of keys exceeds the capacity from this operation, evict the least recently used key.\n\nBoth functions must run in O(1) average time complexity.",
    constraints: [
      "1 <= capacity <= 3000",
      "0 <= key <= 10^4",
      "0 <= value <= 10^5",
      "At most 2 * 10^5 calls will be made to get and put."
    ],
    examples: [
      {
        input: '["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]\n[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]',
        output: '[null, null, null, 1, null, -1, null, -1, 3, 4]',
        explanation: 'LRUCache lRUCache = new LRUCache(2);\nlRUCache.put(1, 1); // cache is {1=1}\nlRUCache.put(2, 2); // cache is {1=1, 2=2}\nlRUCache.get(1);    // return 1\nlRUCache.put(3, 3); // LRU key was 2, evicts key 2, cache is {1=1, 3=3}\nlRUCache.get(2);    // returns -1 (not found)\nlRUCache.put(4, 4); // LRU key was 1, evicts key 1, cache is {4=4, 3=3}\nlRUCache.get(1);    // return -1 (not found)\nlRUCache.get(3);    // return 3\nlRUCache.get(4);    // return 4'
      }
    ],
    starterTemplates: {
      javascript: `class LRUCache {\n    constructor(capacity) {\n        // Write initialization here\n    }\n    get(key) {\n        // Write get execution here\n        return -1;\n    }\n    put(key, value) {\n        // Write put execution here\n    }\n}`,
      python: `class LRUCache:\n    def __init__(self, capacity: int):\n        # Write initialization here\n        pass\n    def get(self, key: int) -> int:\n        # Write get execution here\n        return -1\n    def put(self, key: int, value: int) -> None:\n        # Write put execution here\n        pass`,
      cpp: `class LRUCache {\npublic:\n    LRUCache(int capacity) {\n        // Write initialization here\n    }\n    int get(int key) {\n        // Write get execution here\n        return -1;\n    }\n    void put(int key, int value) {\n        // Write put execution here\n    }\n};`,
      java: `class LRUCache {\n    public LRUCache(int capacity) {\n        // Write initialization here\n    }\n    public int get(int key) {\n        // Write get execution here\n        return -1;\n    }\n    public void put(int key, int value) {\n        // Write put execution here\n    }\n}`
    }
  },
  {
    id: 4,
    title: "Product of Array Except Self",
    description: "Given an integer array `nums`, return *an array* `answer` *such that* `answer[i]` *is equal to the product of all the elements of* `nums` *except* `nums[i]`.\n\nThe product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer.\n\nYou must write an algorithm that runs in `O(n)` time and without using the division operation.",
    constraints: [
      "2 <= nums.length <= 10^5",
      "-30 <= nums[i] <= 30",
      "The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer."
    ],
    examples: [
      {
        input: "nums = [1,2,3,4]",
        output: "[24,12,8,6]"
      },
      {
        input: "nums = [-1,1,0,-3,3]",
        output: "[0,0,9,0,0]"
      }
    ],
    starterTemplates: {
      javascript: `function productExceptSelf(nums) {\n    // Write your code here\n    return [];\n}`,
      python: `from typing import List\n\nclass Solution:\n    def productExceptSelf(nums: List[int]) -> List[int]:\n        # Write your code here\n        pass`,
      cpp: `#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> productExceptSelf(vector<int>& nums) {\n        // Write your code here\n        return {};\n    }\n};`,
      java: `class Solution {\n    public int[] productExceptSelf(int[] nums) {\n        // Write your code here\n        return new int[0];\n    }\n}`
    }
  },
  {
    id: 5,
    title: "Coin Change",
    description: "You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn *the fewest number of coins that you need to make up that amount*. If that amount of money cannot be made up by any combination of the coins, return `-1`.\n\nYou may assume that you have an infinite number of each kind of coin.",
    constraints: [
      "1 <= coins.length <= 12",
      "1 <= coins[i] <= 2^31 - 1",
      "0 <= amount <= 10^4"
    ],
    examples: [
      {
        input: "coins = [1,2,5], amount = 11",
        output: "3",
        explanation: "11 = 5 + 5 + 1"
      },
      {
        input: "coins = [2], amount = 3",
        output: "-1"
      },
      {
        input: "coins = [1], amount = 0",
        output: "0"
      }
    ],
    starterTemplates: {
      javascript: `function coinChange(coins, amount) {\n    // Write your code here\n    return -1;\n}`,
      python: `from typing import List\n\nclass Solution:\n    def coinChange(self, coins: List[int], amount: int) -> int:\n        # Write your code here\n        return -1`,
      cpp: `#include <vector>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        // Write your code here\n        return -1;\n    }\n};`,
      java: `class Solution {\n    public int coinChange(int[] coins, int amount) {\n        // Write your code here\n        return -1;\n    }\n}`
    }
  }
];
