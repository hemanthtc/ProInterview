const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/g;

/** Strip emails and phone-like strings before sending text to third-party AI APIs. */
export function redactPii(text: string): string {
    if (!text) return text;
    return text.replace(EMAIL_RE, "[redacted-email]").replace(PHONE_RE, (match) => {
        const digits = match.replace(/\D/g, "");
        return digits.length >= 10 ? "[redacted-phone]" : match;
    });
}

export function redactLogIdentifier(identifier: string): string {
    if (!identifier) return "[unknown]";
    if (identifier.includes("@")) {
        const [user, domain] = identifier.split("@");
        return `${user.slice(0, 2)}***@${domain}`;
    }
    if (identifier.length <= 4) return "***";
    return `${identifier.slice(0, 2)}***${identifier.slice(-2)}`;
}
