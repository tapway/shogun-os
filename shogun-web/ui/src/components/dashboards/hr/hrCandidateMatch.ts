import type { HrCandidate, HrJobOpening } from "../../../lib/types";

/** Match candidates to a job opening by role/title similarity.
 * Shared by the Job Openings tab (candidate counts) and the Talent Pool page.
 */
export function findCandidatesForJob(job: HrJobOpening, allCandidates: HrCandidate[]): HrCandidate[] {
  const jobTitle = (job.job_title || "").toLowerCase().trim();
  if (!jobTitle) return [];
  // Extract key words from job title (skip generic words)
  const skipWords = new Set(["jr", "sr", "senior", "junior", "lead", "head", "of", "the", "and", "&", "executive", "manager", "engineer", "specialist", "officer"]);
  const jobWords = jobTitle
    .split(/[\s/()-]+/)
    .filter((w) => w.length > 2 && !skipWords.has(w));

  return allCandidates.filter((c) => {
    const candidateRole = (c.role || "").toLowerCase().trim();
    if (!candidateRole) return false;
    // Direct substring match (most reliable)
    if (candidateRole.includes(jobTitle) || jobTitle.includes(candidateRole)) return true;
    // Word overlap: at least one significant word matches
    const candidateWords = candidateRole.split(/[\s/()-]+/).filter((w) => w.length > 2);
    return jobWords.some((jw) => candidateWords.some((cw) => cw.includes(jw) || jw.includes(cw)));
  });
}