/**
 * Resume and Cover Letter Generator
 *
 * Generates tailored prompts for creating application materials.
 * Can output prompts for clipboard or send directly to LLM.
 */

import { generateSkillsSummary } from './skills.js';
import { createLLMClient } from './llm.js';
import { saveApplication, getApplicationDir } from './config.js';

/**
 * Generate a resume prompt tailored to a specific job
 */
export function generateResumePrompt(profile, job, userInfo = {}) {
  const skillsSummary = generateSkillsSummary(profile);

  return `You are an expert resume writer. Create a tailored, ATS-optimized resume for this job application.

## Target Position
**Title:** ${job.title}
**Company:** ${job.company}
**Location:** ${job.location}

## Job Description
${job.description || 'No description provided'}

## Required Skills
${job.skills?.join(', ') || 'Not specified'}

## Candidate Profile
${skillsSummary}

## Candidate Information
**Name:** ${userInfo.name || '[Your Name]'}
**Email:** ${userInfo.email || '[your.email@example.com]'}
**Location:** ${userInfo.location || '[Your Location]'}
**Phone:** ${userInfo.phone || '[Your Phone]'}
**LinkedIn:** ${userInfo.linkedin || '[LinkedIn URL]'}
**GitHub:** ${userInfo.github || '[GitHub URL]'}
**Portfolio:** ${userInfo.portfolio || '[Portfolio URL]'}

## Instructions
1. Create a professional resume in Markdown format
2. Emphasize skills that match the job requirements
3. Use action verbs and quantifiable achievements where possible
4. Keep it to 1-2 pages equivalent length
5. Structure:
   - Header with contact info
   - Professional Summary (3-4 sentences tailored to this role)
   - Technical Skills (prioritize matching skills)
   - Experience (focus on relevant projects/work)
   - Education (if applicable)
   - Notable Projects (2-3 most relevant)

Format the resume in clean Markdown that can be easily converted to PDF.`;
}

/**
 * Generate a cover letter prompt tailored to a specific job
 */
export function generateCoverLetterPrompt(profile, job, userInfo = {}) {
  const skillsSummary = generateSkillsSummary(profile);

  return `You are an expert cover letter writer. Create a compelling, personalized cover letter for this job application.

## Target Position
**Title:** ${job.title}
**Company:** ${job.company}
**Location:** ${job.location}

## Job Description
${job.description || 'No description provided'}

## Required Skills
${job.skills?.join(', ') || 'Not specified'}

## Candidate Profile
${skillsSummary}

## Candidate Information
**Name:** ${userInfo.name || '[Your Name]'}
**Email:** ${userInfo.email || '[your.email@example.com]'}
**Location:** ${userInfo.location || '[Your Location]'}

## Instructions
1. Write a professional cover letter in Markdown format
2. Open with a strong hook that shows enthusiasm for the specific role
3. Highlight 2-3 specific experiences/projects that demonstrate relevant skills
4. Show you've researched the company (if company info available)
5. Express genuine interest in the role and company mission
6. Close with a clear call to action
7. Keep it to 3-4 paragraphs (under 400 words)
8. Tone: Professional but personable, confident but not arrogant

Format as a proper letter with:
- Date
- Recipient (Hiring Manager at ${job.company})
- Greeting
- Body paragraphs
- Professional closing
- Signature`;
}

/**
 * Generate both resume and cover letter prompts
 */
export function generateApplicationPrompts(profile, job, userInfo = {}) {
  return {
    resume: generateResumePrompt(profile, job, userInfo),
    coverLetter: generateCoverLetterPrompt(profile, job, userInfo),
    metadata: {
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Generate and optionally send to LLM
 */
export async function generateApplication(profile, job, userInfo, llmConfig, options = {}) {
  const { type = 'both' } = options;

  const prompts = generateApplicationPrompts(profile, job, userInfo);
  const client = createLLMClient(llmConfig);

  const results = {
    jobId: job.id,
    company: job.company,
    title: job.title,
    resume: null,
    coverLetter: null,
    prompts,
  };

  // Generate resume
  if (type === 'both' || type === 'resume') {
    const resumeResult = await client.generate(prompts.resume);

    if (resumeResult.success && resumeResult.content) {
      results.resume = {
        content: resumeResult.content,
        path: saveApplication(job.id, 'resume', resumeResult.content),
      };
    } else if (resumeResult.mode === 'clipboard') {
      results.resume = {
        mode: 'clipboard',
        prompt: prompts.resume,
        message: resumeResult.message,
      };
    } else {
      results.resume = { error: resumeResult.error };
    }
  }

  // Generate cover letter
  if (type === 'both' || type === 'coverLetter') {
    const coverResult = await client.generate(prompts.coverLetter);

    if (coverResult.success && coverResult.content) {
      results.coverLetter = {
        content: coverResult.content,
        path: saveApplication(job.id, 'coverLetter', coverResult.content),
      };
    } else if (coverResult.mode === 'clipboard') {
      results.coverLetter = {
        mode: 'clipboard',
        prompt: prompts.coverLetter,
        message: coverResult.message,
      };
    } else {
      results.coverLetter = { error: coverResult.error };
    }
  }

  return results;
}

/**
 * Export prompts to files for manual use
 */
export function exportPromptsToFiles(profile, job, userInfo, outputDir) {
  const prompts = generateApplicationPrompts(profile, job, userInfo);
  const dir = outputDir || getApplicationDir(job.id);

  const { writeFileSync } = require('fs');
  const { join } = require('path');

  const files = {
    resumePrompt: join(dir, 'resume-prompt.md'),
    coverLetterPrompt: join(dir, 'cover-letter-prompt.md'),
    metadata: join(dir, 'metadata.json'),
  };

  writeFileSync(files.resumePrompt, prompts.resume);
  writeFileSync(files.coverLetterPrompt, prompts.coverLetter);
  writeFileSync(files.metadata, JSON.stringify(prompts.metadata, null, 2));

  return files;
}

/**
 * Generate a skill gap analysis prompt
 */
export function generateSkillGapPrompt(profile, job) {
  const skillsSummary = generateSkillsSummary(profile);

  return `Analyze the skill gap between this candidate and job requirements.

## Job Requirements
**Title:** ${job.title}
**Company:** ${job.company}
**Required Skills:** ${job.skills?.join(', ') || 'Not specified'}

## Job Description
${job.description || 'No description provided'}

## Candidate Profile
${skillsSummary}

## Analysis Request
1. Identify skills the candidate has that match the job
2. Identify skills the job requires that the candidate is missing
3. For each missing skill, estimate how long it would take to learn
4. Suggest which missing skills are most important to prioritize
5. Rate overall match percentage with explanation

Format as a structured report with clear sections.`;
}

/**
 * Generate an interview prep prompt
 */
export function generateInterviewPrepPrompt(profile, job) {
  const skillsSummary = generateSkillsSummary(profile);

  return `Prepare interview questions and talking points for this job application.

## Position
**Title:** ${job.title}
**Company:** ${job.company}

## Job Description
${job.description || 'No description provided'}

## Candidate Profile
${skillsSummary}

## Generate:
1. **Technical Questions** (5-7 questions they might ask based on required skills)
2. **Behavioral Questions** (3-5 STAR format questions)
3. **Suggested Talking Points** (key achievements to highlight)
4. **Questions to Ask Them** (5 thoughtful questions about the role/company)
5. **Potential Concerns** (weaknesses they might probe, with suggested responses)

Format each section clearly with questions and suggested approaches.`;
}
