import type { Metadata } from "next";
import PrivacyClientView from "./PrivacyClientView";

export const metadata: Metadata = {
    title: "Privacy | ProInterview",
    description: "How ProInterview collects, stores, and shares personal data, including AI providers.",
};

export default function PrivacyPage() {
    return <PrivacyClientView />;
}

