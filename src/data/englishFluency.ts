export interface FluencyWord {
    id: string;
    word: string;
    meaning: string;
    hindi: string;
    example: string;
    distractors: [string, string, string];
}

export interface FluencyPrompt {
    id: string;
    title: string;
    prompt: string;
}

export interface PhraseUpgrade {
    from: string;
    to: string;
}

/** Original interview-English bank (not scraped from any course). */
export const FLUENCY_WORDS: FluencyWord[] = [
    {
        id: "articulate",
        word: "articulate",
        meaning: "Explain an idea clearly and in order",
        hindi: "स्पष्टता से समझाना",
        example: "I can articulate the trade-off between speed and code quality.",
        distractors: ["Speak very loudly", "Memorize a script", "Avoid the question"],
    },
    {
        id: "concise",
        word: "concise",
        meaning: "Short, but still complete",
        hindi: "संक्षिप्त लेकिन पूरा",
        example: "Keep the introduction concise — thirty seconds is enough.",
        distractors: ["Very long and detailed", "Rude or blunt", "Full of jokes"],
    },
    {
        id: "ownership",
        word: "ownership",
        meaning: "Taking responsibility for a result",
        hindi: "जिम्मेदारी लेना",
        example: "I took ownership of the outage and wrote the postmortem.",
        distractors: ["Blaming the team", "Avoiding work", "Asking for a raise"],
    },
    {
        id: "collaborate",
        word: "collaborate",
        meaning: "Work with others toward one goal",
        hindi: "साथ मिलकर काम करना",
        example: "I collaborated with design to ship the checkout flow.",
        distractors: ["Work alone only", "Compete with peers", "Skip meetings"],
    },
    {
        id: "prioritize",
        word: "prioritize",
        meaning: "Decide what matters first",
        hindi: "पहले क्या करना है तय करना",
        example: "I prioritize customer-facing bugs over internal tooling.",
        distractors: ["Do everything at once", "Ignore deadlines", "Copy others"],
    },
    {
        id: "stakeholder",
        word: "stakeholder",
        meaning: "Someone affected by or invested in the work",
        hindi: "हितधारक",
        example: "I updated stakeholders every Friday with a short status.",
        distractors: ["A software library", "A type of bug", "A salary band"],
    },
    {
        id: "tradeoff",
        word: "trade-off",
        meaning: "A choice where you gain one thing and lose another",
        hindi: "एक चीज़ लेकर दूसरी छोड़ना",
        example: "The trade-off was extra latency for stronger consistency.",
        distractors: ["A free upgrade", "A coding language", "A meeting invite"],
    },
    {
        id: "iterate",
        word: "iterate",
        meaning: "Improve something in small repeated steps",
        hindi: "बार-बार सुधारना",
        example: "We iterated on the resume until the ATS score crossed 80.",
        distractors: ["Delete the project", "Launch once and stop", "Outsource forever"],
    },
    {
        id: "clarify",
        word: "clarify",
        meaning: "Make the question or requirement clear",
        hindi: "स्पष्ट करना",
        example: "Let me clarify — do you want time or space complexity first?",
        distractors: ["Guess silently", "Change the topic", "Speak faster"],
    },
    {
        id: "impact",
        word: "impact",
        meaning: "The measurable result of your work",
        hindi: "प्रभाव / नतीजा",
        example: "The impact was a 20 percent drop in support tickets.",
        distractors: ["Your job title", "Hours you sat in office", "Number of meetings"],
    },
    {
        id: "resilient",
        word: "resilient",
        meaning: "Recovers well after pressure or failure",
        hindi: "दबाव के बाद वापस आना",
        example: "The service is resilient because we added retries and a fallback.",
        distractors: ["Never tested", "Always offline", "Hard to deploy"],
    },
    {
        id: "proactive",
        word: "proactive",
        meaning: "Acting before a problem becomes urgent",
        hindi: "पहले से पहल करना",
        example: "I was proactive and wrote tests before the festival traffic spike.",
        distractors: ["Waiting for a ticket", "Hiding issues", "Working only when asked"],
    },
    {
        id: "ambiguous",
        word: "ambiguous",
        meaning: "Unclear; can mean more than one thing",
        hindi: "अस्पष्ट",
        example: "The requirement was ambiguous, so I listed two interpretations.",
        distractors: ["Very precise", "Already shipped", "Written in code"],
    },
    {
        id: "constraint",
        word: "constraint",
        meaning: "A limit you must work within",
        hindi: "सीमा / पाबंदी",
        example: "The constraint was a two-week internship, so I scoped an MVP.",
        distractors: ["A bonus perk", "Unlimited budget", "A promotion"],
    },
    {
        id: "feedback",
        word: "feedback",
        meaning: "Specific comments that help you improve",
        hindi: "सुझाव / प्रतिक्रिया",
        example: "I asked for feedback on my STAR stories after the mock.",
        distractors: ["A salary slip", "A rejection only", "A company logo"],
    },
    {
        id: "confident",
        word: "confident",
        meaning: "Sure of your point, without sounding rude",
        hindi: "आत्मविश्वास के साथ",
        example: "Speak at a confident pace — not rushed, not whispered.",
        distractors: ["Arrogant and loud", "Silent the whole time", "Reading slides only"],
    },
    {
        id: "structure",
        word: "structure",
        meaning: "A clear order: situation, action, result",
        hindi: "क्रम / ढांचा",
        example: "Give your answer structure so the interviewer can follow.",
        distractors: ["Random stories", "Only jokes", "One-word replies"],
    },
    {
        id: "quantify",
        word: "quantify",
        meaning: "Use numbers to show the result",
        hindi: "आंकड़ों में बताना",
        example: "Quantify the win: users, time saved, or error rate.",
        distractors: ["Avoid all numbers", "Only use adjectives", "Repeat the question"],
    },
    {
        id: "empathy",
        word: "empathy",
        meaning: "Understanding how the other person feels",
        hindi: "दूसरे की स्थिति समझना",
        example: "I showed empathy when a teammate was blocked on reviews.",
        distractors: ["Ignoring users", "Winning arguments", "Coding faster"],
    },
    {
        id: "followup",
        word: "follow-up",
        meaning: "A next question or action after the first answer",
        hindi: "आगे का सवाल या कदम",
        example: "I sent a follow-up email with the repo link the same day.",
        distractors: ["Ending the call", "Changing companies", "Skipping homework"],
    },
    {
        id: "professional",
        word: "professional",
        meaning: "Polite, clear, and workplace-ready",
        hindi: "व्यावसायिक",
        example: "Use professional English: complete sentences, fewer fillers.",
        distractors: ["Slang only", "Chat abbreviations", "All caps shouting"],
    },
    {
        id: "fluent",
        word: "fluent",
        meaning: "Speaking smoothly, with few long pauses",
        hindi: "धाराप्रवाह",
        example: "Fluency is pace plus clarity — not a British accent.",
        distractors: ["Perfect grammar only", "Speaking Hindi only", "Reading a PDF"],
    },
    {
        id: "vocabulary",
        word: "vocabulary",
        meaning: "The set of words you can use correctly",
        hindi: "शब्द भंडार",
        example: "Learn five interview vocabulary words, then use them out loud.",
        distractors: ["Your GPA", "Your GitHub stars", "A dress code"],
    },
    {
        id: "intonation",
        word: "intonation",
        meaning: "How your voice rises and falls while speaking",
        hindi: "आवाज़ का उतार-चढ़ाव",
        example: "Friendly intonation makes “Tell me about yourself” sound human.",
        distractors: ["Typing speed", "Font size", "Camera angle"],
    },
];

export const SHADOW_SENTENCES = [
    "Let me structure that. I will cover the situation, my action, and the result.",
    "I took ownership of the bug and shipped a fix the same evening.",
    "Could you clarify whether you want the system design or the coding approach first?",
    "The impact was a twenty percent faster checkout on mobile.",
    "I collaborated with QA so we could release without blocking the festival sale.",
    "I am comfortable with English. Please interrupt me if any word is unclear.",
];

export const FLUENCY_PROMPTS: FluencyPrompt[] = [
    {
        id: "intro",
        title: "Introduce yourself",
        prompt: "Speak for 60 seconds: your name, college, one project, and the role you want. No reading a script.",
    },
    {
        id: "project",
        title: "Explain a project",
        prompt: "Describe one project: problem, your part, tech, and one number that shows impact.",
    },
    {
        id: "conflict",
        title: "Team conflict",
        prompt: "Tell a short story about disagreement on a team. End with what you learned.",
    },
    {
        id: "why-company",
        title: "Why this company",
        prompt: "Why do you want this internship or job? Be specific — product, users, or learning.",
    },
    {
        id: "weakness",
        title: "A real weakness",
        prompt: "Name one communication or technical weakness and how you are practicing it this month.",
    },
];

export const PHRASE_UPGRADES: PhraseUpgrade[] = [
    { from: "i am having", to: "I have" },
    { from: "myself i did", to: "I did" },
    { from: "i did the needful", to: "I completed the requested work" },
    { from: "kindly revert", to: "please reply" },
    { from: "do the needful", to: "please take the next step" },
    { from: "i want to tell that", to: "I want to say that" },
    { from: "according to me", to: "in my view" },
    { from: "i am agree", to: "I agree" },
    { from: "discuss about", to: "discuss" },
    { from: "more better", to: "better" },
    { from: "can able to", to: "can" },
    { from: "i have a doubt", to: "I have a question" },
    { from: "passed out from", to: "graduated from" },
    { from: "today morning", to: "this morning" },
    { from: "like you know", to: "" },
];
