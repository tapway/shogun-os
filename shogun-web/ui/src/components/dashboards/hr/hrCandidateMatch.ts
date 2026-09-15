import type { HrCandidate, HrJobOpening } from "../../../lib/types";

/** Match candidates to a job opening by explicit job_opening_id assignment only.
 * Candidates must be manually added to a job — no auto-matching by role/title.
 */
export function findCandidatesForJob(job: HrJobOpening, allCandidates: HrCandidate[]): HrCandidate[] {
  if (!job.id) return [];
  return allCandidates.filter((c) => c.job_opening_id === job.id);
}
