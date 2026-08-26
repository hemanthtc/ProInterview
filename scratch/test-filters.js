const fs = require('fs');
const path = require('path');

// Mock jobs based on what Adzuna actually returns
const mockJobs = [
    {
        role: "Frontend Engineer",
        location: "Bangalore, Karnataka",
        description: "Looking for a Frontend Engineer with 2+ years of experience in React and TypeScript. This is a hybrid role (3 days office, 2 days remote).",
        remote: false,
        type: "full-time"
    },
    {
        role: "Senior React Developer",
        location: "Remote, India",
        description: "Looking for a senior developer. 5+ years of experience. Fully remote.",
        remote: true,
        type: "full-time"
    },
    {
        role: "Frontend Intern",
        location: "Hyderabad",
        description: "Internship opportunity for freshers. 0-1 years of experience required. Must work on-site at our Hyderabad office.",
        remote: false,
        type: "intern"
    },
    {
        role: "Contract UI Developer",
        location: "Pune",
        description: "Contract position for 6 months. Requirements: 1 year of experience in HTML/CSS.",
        remote: false,
        type: "contract"
    }
];

function applyFilters(jobs, experienceFilter, customExpYears, workModeFilter) {
    return jobs.filter((job) => {
        // Experience filter
        if (experienceFilter !== "all") {
            const desc = (job.description + " " + job.role).toLowerCase();
            if (experienceFilter === "fresher") {
                if (!desc.match(/\b(fresher|entry[\s-]?level|0[\s-]?year|graduate|junior)\b/i)) return false;
            } else if (experienceFilter === "intern") {
                if (job.type !== "intern" && !desc.match(/\b(intern|internship|trainee)\b/i)) return false;
            } else if (experienceFilter === "1year") {
                if (!desc.match(/\b(0\s*-\s*1|1\s*[\+\-]?|1\s*year|1\s*yr|entry)\b/i) && !desc.match(/\bfresher\b/i)) return false;
            } else if (experienceFilter === "2year") {
                if (!desc.match(/\b([0-2]\s*-\s*[2-3]|2\s*[\+\-]?|2\s*year|2\s*yr)\b/i) && !desc.match(/\b(1\s*-\s*2|0\s*-\s*2)\b/i)) return false;
            } else if (experienceFilter === "custom" && customExpYears) {
                const yrs = parseInt(customExpYears);
                if (!isNaN(yrs)) {
                    const matches = Array.from(desc.matchAll(/(\d+)\s*(?:\+|plus)?\s*(?:-|to|or)\s*(\d+)\s*(?:\+|plus)?\s*(?:year|yr)s?/gi));
                    const singles = Array.from(desc.matchAll(/(\d+)\s*(\+|plus)?\s*(?:year|yr)s?/gi));
                    const allMatches = [...matches, ...singles];
                    if (allMatches.length > 0) {
                        let hasMatchedRange = false;
                        for (const m of allMatches) {
                            const low = parseInt(m[1]);
                            let high = low;
                            if (m[2] && /^\d+$/.test(m[2])) {
                                high = parseInt(m[2]);
                            } else if (m[2] === "+" || m[2] === "plus" || m[0].includes("+")) {
                                high = 99;
                            }
                            if (yrs >= low && yrs <= high) {
                                hasMatchedRange = true;
                                break;
                            }
                        }
                        if (!hasMatchedRange) return false;
                    }
                }
            }
        }
        // Work mode filter
        if (workModeFilter !== "all") {
            const loc = (job.location + " " + job.description).toLowerCase();
            if (workModeFilter === "remote") {
                if (!job.remote && !loc.match(/\bremote\b/)) return false;
            } else if (workModeFilter === "onsite") {
                if (job.remote || loc.match(/\bremote\b/)) return false;
            } else if (workModeFilter === "offsite") {
                if (!loc.match(/\b(hybrid|off[\s-]?site|work from home|wfh)\b/)) return false;
            }
        }
        return true;
    });
}

console.log("--- Testing Experience Filters ---");
console.log("All jobs:", mockJobs.length);
console.log("Fresher jobs:", applyFilters(mockJobs, "fresher", "", "all").map(j => j.role));
console.log("Intern jobs:", applyFilters(mockJobs, "intern", "", "all").map(j => j.role));
console.log("1 Year jobs:", applyFilters(mockJobs, "1year", "", "all").map(j => j.role));
console.log("2 Years jobs:", applyFilters(mockJobs, "2year", "", "all").map(j => j.role));
console.log("Custom 5 Years jobs:", applyFilters(mockJobs, "custom", "5", "all").map(j => j.role));

console.log("\n--- Testing Work Mode Filters ---");
console.log("Remote jobs:", applyFilters(mockJobs, "all", "", "remote").map(j => j.role));
console.log("On-site jobs:", applyFilters(mockJobs, "all", "", "onsite").map(j => j.role));
console.log("Off-site (Hybrid) jobs:", applyFilters(mockJobs, "all", "", "offsite").map(j => j.role));
