import type { Metadata } from "next";
import BrandLogo from "@/components/BrandLogo";

export const metadata: Metadata = {
    title: "Privacy | ProInterview",
    description: "How ProInterview collects, stores, and shares personal data, including AI providers.",
};

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-[#0b0b10] text-white/85">
            <div className="max-w-3xl mx-auto px-5 py-12 space-y-8">
                <BrandLogo href="/" showText />
                <h1 className="text-3xl font-black tracking-tight text-white">Privacy notice</h1>
                <p className="text-sm text-white/50">Last updated: 31 August 2026</p>

                <section className="space-y-3 text-sm leading-relaxed">
                    <h2 className="text-lg font-bold text-white">What we collect</h2>
                    <p>
                        Depending on the features you use, we may store your email (account identifier), display name,
                        password hash, phone and education details you add to your profile, resume text, GitHub / LinkedIn /
                        portfolio URLs, interview transcripts and scores, mock aptitude results, job-application tracking,
                        community messages, and uploaded files (photos, resumes, synthetic datasets).
                    </p>
                </section>

                <section className="space-y-3 text-sm leading-relaxed">
                    <h2 className="text-lg font-bold text-white">Where it is stored</h2>
                    <p>
                        Account and progress data live in MongoDB Atlas when configured. Profile files, resumes, and some
                        session archives may be stored in Amazon S3. Data in transit should be protected with HTTPS on the
                        host you deploy to. Field-level encryption at rest is not applied beyond what MongoDB Atlas and AWS
                        provide by default.
                    </p>
                </section>

                <section className="space-y-3 text-sm leading-relaxed">
                    <h2 className="text-lg font-bold text-white">AI and other processors</h2>
                    <p>
                        Interview chat, aptitude quizzes, mock tests, resume help, film-room notes, and similar features send
                        the text (and sometimes images) you provide to <strong>Google Gemini</strong>. Optional Indic voice
                        uses <strong>Sarvam AI</strong>. Code execution may be sent to the public{" "}
                        <strong>Piston (emkc.org)</strong> runner. Job search may call <strong>Adzuna</strong>. Payments use{" "}
                        <strong>Razorpay</strong>. Sign-in may use <strong>Google OAuth</strong>. Connecting Gmail sends
                        message content through our API to Google on your behalf using your token. We redact obvious emails
                        and phone numbers from some AI prompts, but you should not paste secrets into interviews.
                    </p>
                </section>

                <section className="space-y-3 text-sm leading-relaxed">
                    <h2 className="text-lg font-bold text-white">Your choices</h2>
                    <p>
                        You can export or review profile data from the profile page, and delete your account or wipe generated
                        data there. Deletion removes the account record plus associated MongoDB documents and S3 prefixes we
                        know about. Shared scorecard links remain reachable until they expire (30 days) unless you delete that
                        data first. Browser localStorage copies of sessions are under your control.
                    </p>
                </section>

                <section className="space-y-3 text-sm leading-relaxed">
                    <h2 className="text-lg font-bold text-white">Contact</h2>
                    <p>
                        For privacy requests, use the in-app feedback channel or the support email you publish for your
                        deployment. This notice is a product disclosure for operators of this codebase, not legal advice.
                    </p>
                </section>
            </div>
        </main>
    );
}
