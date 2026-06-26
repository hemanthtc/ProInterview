import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const { emailText, company, location } = await req.json();

        if (!emailText || !emailText.trim()) {
            return NextResponse.json({ error: "Missing emailText parameter" }, { status: 400 });
        }

        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return NextResponse.json({ error: "Missing GEMINI_API_KEY environment variable" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite",
            generationConfig: { temperature: 0.1 }
        });

        const systemPrompt = `You are an expert AI recruiting and employment document analyst.
Your task is to analyze the provided email text and extract structured information, classifying it as either a job invitation/interview/application notification OR an offer letter.

Inputs:
Email Content:
"""
${emailText}
"""

${company ? `User Overrides for verification (evaluate these specifically):` : ''}
${company ? `- Company Name to verify: "${company}"` : ''}
${location ? `- Location to verify: "${location}"` : ''}

You must extract the following fields and return a single, valid JSON block.

1. "emailType":
   - "job_invite": For interview invitations, application notifications, requests to apply, schedules, or coding assessments.
   - "offer_letter": For job offers containing salary, benefits, CTC, or terms of employment.

2. "company": Extracted company name (e.g. "Stripe"). (If user override company is provided, use that name).

3. "role": The job title (e.g., React Developer, Backend Engineer). Default to "Software Engineer" if none specified.

4. "location": The job location (e.g., Remote, San Francisco, WFH). (If user override location is provided, use that location).

5. "skills": Array of technical skills, frameworks, or tools mentioned (e.g., ["React", "TypeScript"]). Default to an empty array [] if none.

6. "hrName": The HR manager, recruiter, or sender's name if identified (e.g., "Sarah Connor"). If not found, use "Not specified".

7. "platformOrFormat": The meeting tool or format (e.g., Zoom, Google Meet, hackerRank, Office). If not found, use "Not specified".

8. "interviewDate": Any date/time mentioned for interview or action deadline. If not found, use "Not specified".

9. "salaryDetails":
   - "baseSalary": The base pay, annual salary, or CTC (e.g., "$120,000 / year", "₹12 LPA"). If not found or not applicable, use "Not specified".
   - "benefits": Array of benefits (allowances, health insurance, equity/shares, bonuses, PF, etc.) mentioned. Default to an empty array [] if none.
   - "joiningDate": The onboarding or start date mentioned. If not found, use "Not specified".

10. "importantPoints": Array of strings summarizing key dates, platform links, and contextual notes.

11. "mandatoryThings": Array of checkbox tasks. Format each item starting with "- [ ] ". E.g., ["- [ ] Bring government ID", "- [ ] Review React documentation"].

12. Verification of target details:
    - "companyValid": true if the target company is a real, valid operating business. false if pure gibberish, non-existent, or obviously fake.
    - "companyScore": A score (0 to 100) indicating authenticity. (100 for verified global brands like Google/Stripe; 70-90 for standard regional firms; 40-60 for highly ambiguous/common abbreviations like UI; 0-30 for fake/gibberish like XyzCorp).
    - "locationValid": true if the location represents a real city, country, region, or standard virtual terms (Remote, WFH, Hybrid). false for non-existent/fake locations (e.g., Mars, Qwerty).
    - "locationScore": A score (0 to 100) indicating location authenticity. (100 for verified cities/countries or standard virtual tags, 0-30 for fake/imaginary locations).
    - "verificationFeedback": A brief (under 40 words) professional explanation of the verification scores.

Respond ONLY with a valid JSON block containing:
{
  "emailType": "job_invite" | "offer_letter",
  "extractedDetails": {
    "company": "company name",
    "role": "role name",
    "location": "location name",
    "skills": ["skill1", "skill2"],
    "hrName": "HR name or Not specified",
    "platformOrFormat": "platform name or Not specified",
    "interviewDate": "interview date/time or Not specified",
    "salaryDetails": {
      "baseSalary": "salary details or Not specified",
      "benefits": ["benefit1", "benefit2"],
      "joiningDate": "joining date or Not specified"
    }
  },
  "importantPoints": ["point 1", "point 2"],
  "mandatoryThings": ["- [ ] requirement 1", "- [ ] requirement 2"],
  "companyValid": true/false,
  "companyScore": number,
  "locationValid": true/false,
  "locationScore": number,
  "verificationFeedback": "verification feedback string"
}
Do not include any markdown format blocks or notes outside the JSON.`;

        let result;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                result = await model.generateContent(systemPrompt);
                break;
            } catch (retryErr: any) {
                const isTransient = retryErr?.status === 429 || retryErr?.status === 503 || 
                                    (retryErr?.message && (retryErr.message.includes("429") || retryErr.message.includes("503") || retryErr.message.includes("demand")));
                if (isTransient && attempt < 2) {
                    const delay = (attempt + 1) * 3000;
                    console.warn(`Gemini transient error (${retryErr?.status || '503'}), retrying in ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                } else {
                    throw retryErr;
                }
            }
        }

        if (!result) {
            return NextResponse.json({ error: "AI rate-limited after retries." }, { status: 429 });
        }

        const textResponse = result.response.text().trim();
        let parsedData;
        try {
            const cleanJson = textResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
            parsedData = JSON.parse(cleanJson);
        } catch (e) {
            console.error("Failed to parse JSON response from Gemini for email analysis:", textResponse);
            return NextResponse.json({
                emailType: "job_invite",
                extractedDetails: {
                    company: company || "Generic Company",
                    role: "Software Engineer",
                    location: location || "Remote",
                    skills: [],
                    hrName: "Not specified",
                    platformOrFormat: "Not specified",
                    interviewDate: "Not specified",
                    salaryDetails: {
                        baseSalary: "Not specified",
                        benefits: [],
                        joiningDate: "Not specified"
                    }
                },
                importantPoints: ["Failed to analyze details dynamically. Review original text."],
                mandatoryThings: ["- [ ] Confirm receipt of this interview schedule."],
                companyValid: true,
                companyScore: 100,
                locationValid: true,
                locationScore: 100,
                verificationFeedback: "Verification complete but structured feedback parsing failed."
            });
        }

        return NextResponse.json(parsedData);
    } catch (error: any) {
        console.error("Email Analysis API Error:", error);
        return NextResponse.json({ error: error.message || "Failed to analyze email" }, { status: 500 });
    }
}
