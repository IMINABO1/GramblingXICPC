/** Curated problem from GET /api/problems/ */
export interface Problem {
  id: string;
  name: string;
  rating: number;
  topic: string;
  url: string;
  curated: boolean;
}

/** Editorial info from GET /api/editorials/{problem_id} */
export interface Editorial {
  problem_id: string;
  problem_url: string;
  editorial_url: string | null;
  has_editorial: boolean;
}

/** Bulk editorials response from POST /api/editorials/bulk */
export interface BulkEditorialsResponse {
  editorials: Record<string, Editorial>;
  fetched_count: number;
}

/** Single topic entry from the topics response */
export interface Topic {
  name: string;
  icon: string;
  prereqs: string[];
  tier: number;
}

/** Full response from GET /api/problems/topics */
export interface TopicsResponse {
  topics: Record<string, Topic>;
  tier_labels: string[];
  tier_colors: string[];
  tier_bg: string[];
}

/** Computed per-topic progress stats */
export interface TopicStats {
  total: number;
  solved: number;
}

/** Team member from GET /api/team/ */
export interface Member {
  id: number;
  name: string;
  active: boolean;
  cf_handle: string | null;
  lc_handle: string | null;
  solved_curated: string[];
  solved_count: number;
  total_accepted: number;
  last_synced: string | null;
  lc_total_solved: number;
  lc_synced: string | null;
}

/** Sync result from POST /api/team/{id}/sync */
export interface SyncResult {
  member_id: number;
  cf_handle: string;
  new_solved: string[];
  total_solved: number;
  total_accepted: number;
  last_synced: string;
}

/** Sync-all result per member (may include error) */
export interface SyncAllResult {
  member_id: number;
  cf_handle: string;
  new_solved?: string[];
  total_solved?: number;
  total_accepted?: number;
  last_synced?: string;
  error?: string;
}

/** Graph metadata from GET /api/graph/ */
export interface GraphMeta {
  total_problems: number;
  total_edges: number;
  k: number;
  built_at: string;
}

/** Neighbor entry from GET /api/graph/neighbors/{contest_id}/{index} */
export interface GraphNeighbor {
  id: string;
  score: number;
  shared_tags: string[];
}

/** Node in the curated subgraph from GET /api/graph/curated-subgraph */
export interface SubgraphNode {
  id: string;
  name: string;
  rating: number;
  topic: string;
}

/** Edge in the curated subgraph */
export interface SubgraphEdge {
  source: string;
  target: string;
  score: number;
}

/** Response from GET /api/graph/curated-subgraph */
export interface CuratedSubgraph {
  nodes: SubgraphNode[];
  edges: SubgraphEdge[];
}

/** Problem with 3D position from UMAP projection */
export interface CosmosProblem {
  id: string;
  name: string;
  rating: number;
  tags: string[];
  x: number;
  y: number;
  z: number;
}

/** Response from GET /api/graph/cosmos */
export interface CosmosData {
  meta: {
    total: number;
    n_neighbors: number;
    min_dist: number;
  };
  problems: CosmosProblem[];
}

/** Month plan entry (frontend-only static data) */
export interface MonthPlan {
  month: string;
  focus: string;
  topics: string[];
  goal: string;
}

/** Per-member strength profile from POST /api/team/compose */
export interface MemberProfile {
  id: number;
  name: string;
  strengths: Record<string, number>;
  cluster_scores: Record<string, number>;
}

/** Suggested team split from POST /api/team/compose */
export interface TeamSuggestion {
  team_a: number[];
  team_b: number[];
  alternates: number[];
  score: number;
  team_a_coverage: Record<string, number>;
  team_b_coverage: Record<string, number>;
}

/** Response from POST /api/team/compose */
export interface ComposeResponse {
  profiles: MemberProfile[];
  suggestion: TeamSuggestion;
}

/** A sub-team participating in a virtual contest */
export interface ContestTeamEntry {
  label: string;
  member_ids: number[];
}

/** Per-problem result in a virtual contest */
export interface ContestProblemResult {
  problem_index: string;
  problem_name: string;
  solved_by_team: string | null;
  solve_time_minutes: number | null;
}

/** Virtual contest from GET /api/contests/ */
export interface VirtualContest {
  id: string;
  cf_contest_id: number;
  contest_name: string;
  date: string;
  duration_minutes: number;
  teams: ContestTeamEntry[];
  results: ContestProblemResult[];
  notes: string;
  created_at: string;
  total_problems: number;
  solved_count: number;
  solve_counts_by_team: Record<string, number>;
}

/** Payload for creating a contest (POST /api/contests/) */
export interface ContestCreatePayload {
  cf_contest_id: number;
  contest_name: string;
  date: string;
  duration_minutes: number;
  teams: ContestTeamEntry[];
  results: ContestProblemResult[];
  notes?: string;
}

/** Payload for updating a contest (PUT /api/contests/{id}) */
export interface ContestUpdatePayload {
  contest_name?: string;
  date?: string;
  duration_minutes?: number;
  teams?: ContestTeamEntry[];
  results?: ContestProblemResult[];
  notes?: string;
}

/** Single data point in the trends timeline */
export interface TrendPoint {
  contest_id: string;
  date: string;
  contest_name: string;
  total_problems: number;
  solved_count: number;
  solve_counts_by_team: Record<string, number>;
  avg_solve_time_minutes: number | null;
  avg_solve_times_by_team: Record<string, number>;
}

/** Aggregated trend data from GET /api/contests/trends */
export interface TrendsResponse {
  points: TrendPoint[];
  overall_avg_solves: number;
  overall_avg_time: number | null;
  recent_avg_solves: number;
  recent_avg_time: number | null;
}

/** Contest info fetched from CF API via GET /api/codeforces/contest/{id} */
export interface CFContestInfo {
  id: number;
  name: string;
  duration_seconds: number;
  problems: { index: string; name: string }[];
}

/** Per-member solve status for an upsolve item */
export interface MemberUpsolveStatus {
  member_id: number;
  member_name: string;
  has_solved: boolean;
}

/** A single problem that needs upsolving */
export interface UpsolveItem {
  contest_id: string;
  cf_contest_id: number;
  contest_name: string;
  contest_date: string;
  problem_index: string;
  problem_name: string;
  problem_cf_id: string;
  cf_url: string;
  solved_during_contest: boolean;
  solved_by_team: string | null;
  member_statuses: MemberUpsolveStatus[];
  pending_count: number;
  dismissed: boolean;
}

/** Problems grouped by contest in the upsolve queue */
export interface UpsolveContestGroup {
  contest_id: string;
  cf_contest_id: number;
  contest_name: string;
  contest_date: string;
  items: UpsolveItem[];
  total_items: number;
  total_solved: number;
  total_pending: number;
}

/** Full upsolve queue response from GET /api/upsolve/ */
export interface UpsolveQueueResponse {
  contests: UpsolveContestGroup[];
  total_items: number;
  total_solved: number;
  total_pending: number;
}

/** Per-member upsolve stats entry */
export interface MemberUpsolveStatsEntry {
  member_id: number;
  member_name: string;
  total: number;
  solved: number;
  pending: number;
}

/** Aggregate upsolve statistics from GET /api/upsolve/stats */
export interface UpsolveStatsResponse {
  total_items: number;
  total_solved: number;
  total_pending: number;
  completion_pct: number;
  per_member: MemberUpsolveStatsEntry[];
  per_contest: { contest_id: string; contest_name: string; total: number; solved: number; pct: number }[];
}

/** Single recommended problem from GET /api/recommendations/{member_id} */
export interface RecommendedProblem {
  id: string;
  name: string;
  rating: number;
  topic: string;
  url: string;
  score: number;
  reason: string;
}

/** Response from GET /api/recommendations/{member_id} */
export interface RecommendationsResponse {
  member_id: number;
  member_name: string;
  member_avg_rating: number;
  solved_count: number;
  seed_problem: string | null;
  lc_skill_applied: boolean;
  recommendations: RecommendedProblem[];
}

/** A single stale topic from GET /api/review/{member_id} */
export interface StaleTopic {
  topic_id: string;
  topic_name: string;
  tier: number;
  last_solved_date: string;
  days_since: number;
  problems_solved: number;
  last_problem: {
    id: string;
    name: string;
  };
  review_problems: {
    id: string;
    name: string;
    rating: number;
    url: string;
  }[];
  review_count: number;
}

/** Response from GET /api/review/{member_id} */
export interface ReviewTopicsResponse {
  member_id: number;
  member_name: string;
  cf_handle: string | null;
  stale_days_threshold: number;
  stale_topics: StaleTopic[];
  stale_count: number;
  message?: string;
}

/** Response from GET /api/review/{member_id}/stats */
export interface ReviewStatsResponse {
  member_id: number;
  member_name: string;
  topics_practiced: number;
  topics_untouched: number;
  topics_by_recency: {
    this_week: number;
    this_month: number;
    "1_3_months": number;
    "3_6_months": number;
    "6_months_plus": number;
  };
  total_topics: number;
  message?: string;
}

/** Analyzed ICPC regional contest from GET /api/regionals/ */
export interface RegionalContest {
  contest_id: number;
  name: string;
  year: number | null;
  region: string;
  start_time: number;
  duration: number;
  analysis: {
    total_problems: number;
    topic_counts: Record<string, number>;
    topic_percentages: Record<string, number>;
    problems_by_topic: Record<string, RegionalProblem[]>;
  };
}

/** Problem within a regional contest */
export interface RegionalProblem {
  contestId: number;
  index: string;
  name: string;
  rating: number;
  tags: string[];
  classification: {
    topics: string[];
    primary_topic: string;
    confidence: number;
  };
}

/** Aggregate stats across all regional contests */
export interface RegionalAggregateStats {
  topic_counts: Record<string, number>;
  topic_percentages: Record<string, number>;
  total_problems: number;
  top_10_topics: {
    topic: string;
    count: number;
    percentage: number;
  }[];
}

/** Response from GET /api/regionals/ */
export interface RegionalsResponse {
  contests: RegionalContest[];
  aggregate_stats: RegionalAggregateStats;
  metadata: {
    total_contests: number;
    total_problems: number;
    successful: number;
    failed: number;
    data_source?: string;
  };
}

/** Topic recommendation from GET /api/regionals/recommendations */
export interface RegionalTopicRecommendation {
  topic: string;
  count: number;
  percentage: number;
  priority: "Critical" | "High" | "Medium" | "Low";
}

/** Response from GET /api/regionals/recommendations */
export interface RegionalRecommendationsResponse {
  recommendations: RegionalTopicRecommendation[];
  message: string;
}

/** Weekly solve count for a specific week */
export interface WeeklySolves {
  week_start: string;
  week_end: string;
  count: number;
}

/** Streak information for a member */
export interface StreakInfo {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

/** Per-topic coverage for a member */
export interface TopicCoverageEntry {
  topic_id: string;
  topic_name: string;
  tier: number;
  solved: number;
  total: number;
  pct: number;
}

/** Single member's leaderboard entry */
export interface MemberLeaderboard {
  id: number;
  name: string;
  cf_handle: string | null;
  curated_solved: number;
  curated_total: number;
  avg_rating_solved: number;
  topics_touched: number;
  total_accepted: number;
  streak: StreakInfo;
  weekly_solves: WeeklySolves[];
  topic_coverage: TopicCoverageEntry[];
}

/** Response from GET /api/leaderboard/ */
export interface LeaderboardResponse {
  members: MemberLeaderboard[];
  curated_total: number;
  total_topics: number;
  generated_at: string;
}

/** Response from GET /api/leaderboard/weekly-summary */
export interface WeeklySummaryResponse {
  week_start: string;
  week_end: string;
  summary_text: string;
}

/** Custom concept tag (team-shared) from GET /api/tags/ */
export interface CustomTag {
  id: string;
  name: string;
  color: string;
  created_by: number;
  created_at: string;
  problem_count: number;
}

/** Problem note (per-member) from GET /api/notes/member/{id} */
export interface ProblemNote {
  id: string;
  member_id: number;
  problem_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

/** Single journal entry */
export interface JournalEntry {
  id: string;
  content: string;
  created_at: string;
}

/** Topic journal (per-member, per-topic) from GET /api/journals/member/{id} */
export interface TopicJournal {
  id: string;
  member_id: number;
  topic_id: string;
  entries: JournalEntry[];
  created_at: string;
  updated_at: string;
}

/** A recommended problem from embedding-based search */
export interface NoteRecommendation {
  id: string;
  name: string;
  rating: number;
  topic: string;
  url: string;
  score: number;
  impact: number;
  curated: boolean;
}

/** Custom journal topic created by a team member */
export interface CustomJournalTopic {
  id: string;
  name: string;
  icon: string;
  created_by: number;
  created_at: string;
}

/** A journal entry with member metadata (from all-entries or search endpoint) */
export interface JournalEntryWithMember {
  id: string;
  content: string;
  created_at: string;
  member_id: number;
  member_name: string;
  topic_id?: string;
  journal_id: string;
  score?: number;
}

/** Result from POST /api/team/{id}/sync-lc */
export interface LCSyncResult {
  member_id: number;
  lc_handle: string;
  total_lc_solved: number;
  easy: number;
  medium: number;
  hard: number;
  topics_with_signal: number;
  estimated_cf_rating: number | null;
  lc_synced: string;
}

/** Solve quality entry from GET /api/solve-quality/{member_id} */
export interface SolveQualityEntry {
  classification: string;
  wrong_attempts: number;
  time_to_solve_hrs: number | null;
  weight: number;
  editorial_override: boolean;
}

/** Editorial flag from GET /api/solve-quality/{member_id} */
export interface EditorialFlag {
  problem_id: string;
  platform: string;
  used_editorial: boolean;
  flagged_at: string | null;
}

/** Response from GET /api/solve-quality/{member_id} */
export interface SolveQualityResponse {
  member_id: number;
  member_name: string;
  solve_quality: Record<string, SolveQualityEntry>;
  editorial_flags: Record<string, EditorialFlag>;
}

// ---------------------------------------------------------------------------
// Rotations
// ---------------------------------------------------------------------------

/** Snapshot of a combo's performance in a single contest */
export interface ContestSnapshot {
  contest_id: string;
  contest_name: string;
  date: string;
  solved: number;
  total: number;
  solve_rate: number;
}

/** Aggregated stats for a group (trio or duo) across all contests */
export interface ComboStats {
  combo_key: string;
  member_ids: number[];
  member_names: string[];
  team_size: number;
  contests_played: number;
  total_problems_faced: number;
  total_solved: number;
  solve_rate: number;
  avg_solve_time: number | null;
  best_contest: ContestSnapshot | null;
  worst_contest: ContestSnapshot | null;
}

/** Ranked combo with sparkline trend data */
export interface ComboRanking {
  rank: number;
  combo: ComboStats;
  trend: number[];
}

/** A team within a suggested partition */
export interface SuggestedTeam {
  member_ids: number[];
  member_names: string[];
  coverage: Record<string, number>;
}

/** Suggestion for the next team partition */
export interface SuggestResponse {
  teams: SuggestedTeam[];
  reason: string;
  tested_trios: number;
  total_possible_trios: number;
  active_count: number;
}

/** Single data point in a combo's performance timeline */
export interface ComboTimelinePoint {
  date: string;
  contest_name: string;
  contest_id: string;
  solve_rate: number;
  problems_solved: number;
  total_problems: number;
}

/** Timeline data for all tested combos */
export interface ComboTimelineResponse {
  combos: Record<string, ComboTimelinePoint[]>;
}
