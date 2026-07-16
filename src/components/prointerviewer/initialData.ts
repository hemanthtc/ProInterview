import type { ResumeData } from './types';

export const initialResumeData: ResumeData = {
  personalInfo: {
    name: "Alex Morgan",
    title: "Senior Full Stack Engineer",
    email: "alex.morgan@techcorp.com",
    phone: "+1 (555) 019-2834",
    location: "San Francisco, CA",
    website: "https://alexmorgan.dev",
    linkedin: "linkedin.com/in/alexmorgan",
    github: "github.com/alexmorgan",
    avatar: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiMzQjgyRjYiLz48cGF0aCBkPSJNNTAgMjVjLTguMyAwLTE1IDYuNy0xNSAxNXM2LjcgMTUgMTUgMTUgMTUtNi43IDE1LTE1LTYuNy0xNS0xNS0xNXptMCAzNWMtMTUuNiAwLTMxIDcuOC0zMSAxOC44VjgyeDYydi0zLjJjMC0xMS0xNS40LTE4LjgtMzEtMTguOHoiIGZpbGw9IiNGRkZGRkYiLz48L3N2Zz4=",
    summary: "Innovative Senior Full Stack Engineer with over 8 years of experience designing, building, and deploying scalable web applications. Expert in React, TypeScript, Node.js, and Cloud Infrastructure. Passionate about engineering excellence, performance optimization, and building intuitive user experiences that solve complex business challenges."
  },
  workExperience: [
    {
      id: "exp-1",
      company: "TechGlobal Inc.",
      position: "Senior Full Stack Engineer",
      location: "San Francisco, CA",
      startDate: "2022-06",
      endDate: "",
      current: true,
      description: "• Architected and built a real-time analytics dashboard using React, TypeScript, and Node.js, improving page load speeds by 42%.\n• Spearheaded the migration of a legacy monolithic backend to a microservices architecture on AWS (ECS, Lambda, API Gateway), reducing operational costs by 28%.\n• Managed a team of 5 engineers, establishing agile best practices, code reviews, and CI/CD pipelines using GitHub Actions.\n• Collaborated with product teams to design and implement collaborative workspace features, boosting monthly active users by 15%."
    },
    {
      id: "exp-2",
      company: "Innovate Solutions",
      position: "Full Stack Developer",
      location: "Boston, MA",
      startDate: "2019-03",
      endDate: "2022-05",
      current: false,
      description: "• Developed responsive, pixel-perfect user interfaces using React, Redux Toolkit, and TailwindCSS.\n• Implemented secure authentication and authorization flows utilizing OAuth 2.0 and JWT tokens.\n• Optimized database queries and schemas in PostgreSQL, resulting in a 35% reduction in API response times.\n• Authored comprehensive unit and integration tests using Jest and React Testing Library, raising code coverage from 60% to 88%."
    },
    {
      id: "exp-3",
      company: "StartupHub",
      position: "Software Engineer Intern",
      location: "Remote",
      startDate: "2018-06",
      endDate: "2018-09",
      current: false,
      description: "• Built a customer feedback collection widget using vanilla JavaScript, HTML, and CSS that was integrated into 20+ partner websites.\n• Assisted in developing core business logic using Express.js and MongoDB.\n• Monitored system health and application errors using Sentry, resolving 40+ bug reports."
    }
  ],
  education: [
    {
      id: "edu-1",
      institution: "Stanford University",
      degree: "Bachelor of Science",
      fieldOfStudy: "Computer Science",
      location: "Stanford, CA",
      startDate: "2015-09",
      endDate: "2019-06",
      cgpa: "3.85 / 4.00",
      percentage: "96%",
      description: "Specialized in Software Engineering and Database Systems. Recipient of Dean's List honors for 6 semesters. Tech Lead for the Stanford Web Development Club."
    }
  ],
  projects: [
    {
      id: "proj-1",
      name: "CloudScale SaaS",
      role: "Lead Creator",
      description: "A serverless cloud deployment and monitoring tool that allows developers to spin up development environments in one click. Features visual architecture maps and cost optimization alerts.",
      technologies: ["React", "TypeScript", "Node.js", "AWS Lambda", "DynamoDB"],
      link: "https://github.com/alexmorgan/cloudscale"
    },
    {
      id: "proj-2",
      name: "DevFlow Framework",
      role: "Open Source Maintainer",
      description: "A lightweight, type-safe router and state management library for React and Vite projects. Has over 12k weekly downloads and a community of 50+ contributors.",
      technologies: ["TypeScript", "React", "Rollup", "Vitest"],
      link: "https://devflow.org"
    }
  ],
  skills: [
    { id: "sk-1", name: "TypeScript", level: "Expert", category: "Languages" },
    { id: "sk-2", name: "JavaScript", level: "Expert", category: "Languages" },
    { id: "sk-3", name: "Python", level: "Intermediate", category: "Languages" },
    { id: "sk-4", name: "SQL", level: "Advanced", category: "Languages" },
    { id: "sk-5", name: "React / Next.js", level: "Expert", category: "Frameworks" },
    { id: "sk-6", name: "Node.js / Express", level: "Expert", category: "Frameworks" },
    { id: "sk-7", name: "GraphQL", level: "Advanced", category: "Frameworks" },
    { id: "sk-8", name: "PostgreSQL", level: "Advanced", category: "Databases" },
    { id: "sk-9", name: "MongoDB", level: "Advanced", category: "Databases" },
    { id: "sk-10", name: "Docker", level: "Advanced", category: "Tools" },
    { id: "sk-11", name: "AWS (Lambda, S3, ECS)", level: "Advanced", category: "Tools" },
    { id: "sk-12", name: "CI/CD (GitHub Actions)", level: "Advanced", category: "Tools" }
  ],
  languages: [
    { id: "lan-1", name: "English", proficiency: "Native" },
    { id: "lan-2", name: "Spanish", proficiency: "Conversational" }
  ],
  certifications: [
    {
      id: "cert-1",
      name: "AWS Certified Solutions Architect – Associate",
      issuer: "Amazon Web Services (AWS)",
      date: "2023-08",
      link: ""
    },
    {
      id: "cert-2",
      name: "Certified ScrumMaster (CSM)",
      issuer: "Scrum Alliance",
      date: "2021-11",
      link: ""
    }
  ],
  customSections: [
    {
      id: "cust-1",
      title: "Volunteering",
      items: [
        {
          id: "cust-item-1",
          title: "Technical Mentor",
          subtitle: "CoderDojo San Francisco",
          date: "2020 - Present",
          description: "Mentor underprivileged middle school children in building web pages and introducing basic programming concepts using Scratch and HTML."
        }
      ]
    }
  ]
};
