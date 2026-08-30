export type UiLang = "en" | "hi";

const COPY = {
    en: {
        assessmentTitle: "HackerRank-style coding round",
        assessmentBody:
            "Random mix of LeetCode, HackerRank, Codeforces, and CodeChef-style problems. Camera proctor is on. Tab switches count as violations.",
        start: "Enable camera and start",
        faculty: "Faculty dashboard",
        joinExam: "Join exam",
    },
    hi: {
        assessmentTitle: "हैकररैंक जैसा कोडिंग राउंड",
        assessmentBody:
            "लीटकोड, हैकररैंक, कोडफोर्स और कोडशेफ शैली के रैंडम प्रश्न। कैमरा प्रॉक्टर चालू रहेगा। टैब बदलना उल्लंघन माना जाएगा।",
        start: "कैमरा चालू करें और शुरू करें",
        faculty: "फैकल्टी डैशबोर्ड",
        joinExam: "परीक्षा जॉइन करें",
    },
} as const;

export function assessmentCopy(lang: UiLang) {
    return COPY[lang];
}
