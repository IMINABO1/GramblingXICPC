"""Rotations router — team rotation analytics derived from contest data."""

from itertools import combinations
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from routers.contests import load_contests
from services.handle_sync import load_team
from services.team_profiles import compute_profiles, load_problems, team_coverage

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class ContestSnapshot(BaseModel):
    contest_id: str
    contest_name: str
    date: str
    solved: int
    total: int
    solve_rate: float


class ComboStats(BaseModel):
    combo_key: str
    member_ids: list[int]
    member_names: list[str]
    team_size: int
    contests_played: int
    total_problems_faced: int
    total_solved: int
    solve_rate: float
    avg_solve_time: float | None
    best_contest: ContestSnapshot | None
    worst_contest: ContestSnapshot | None


class ComboRanking(BaseModel):
    rank: int
    combo: ComboStats
    trend: list[float]


class SuggestedTeam(BaseModel):
    member_ids: list[int]
    member_names: list[str]
    coverage: dict[str, float]


class SuggestResponse(BaseModel):
    teams: list[SuggestedTeam]
    reason: str
    tested_trios: int
    total_possible_trios: int
    active_count: int


class ComboTimelinePoint(BaseModel):
    date: str
    contest_name: str
    contest_id: str
    solve_rate: float
    problems_solved: int
    total_problems: int


class TimelineResponse(BaseModel):
    combos: dict[str, list[ComboTimelinePoint]]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _combo_key(member_ids: list[int]) -> str:
    """Canonical combo identifier: sorted IDs joined by hyphens."""
    return "-".join(str(i) for i in sorted(member_ids))


def _derive_combo_data() -> dict[str, list[dict[str, Any]]]:
    """Derive per-combo contest records from contests.json.

    Returns {combo_key: [list of per-contest records]}.
    Only includes teams with 2 or 3 members.
    """
    data = load_contests()
    combo_records: dict[str, list[dict[str, Any]]] = {}

    for c in data["contests"]:
        results = c.get("results", [])
        total_problems = len(results)

        for team_entry in c.get("teams", []):
            member_ids = team_entry["member_ids"]
            if len(member_ids) not in (2, 3):
                continue

            key = _combo_key(member_ids)
            team_label = team_entry["label"]

            team_solved = [
                r for r in results
                if r.get("solved_by_team") == team_label
            ]
            solve_times = [
                r["solve_time_minutes"]
                for r in team_solved
                if r.get("solve_time_minutes") is not None
            ]

            combo_records.setdefault(key, []).append({
                "contest_id": c["id"],
                "contest_name": c["contest_name"],
                "date": c["date"],
                "team_label": team_label,
                "solved_count": len(team_solved),
                "total_problems": total_problems,
                "solve_times": solve_times,
                "member_ids": sorted(member_ids),
            })

    return combo_records


def _build_combo_stats(
    combo_records: dict[str, list[dict[str, Any]]],
    name_map: dict[int, str],
) -> list[ComboStats]:
    """Build aggregate ComboStats from raw combo records."""
    result: list[ComboStats] = []

    for key, records in combo_records.items():
        member_ids = [int(x) for x in key.split("-")]
        member_names = [name_map.get(i, f"#{i}") for i in member_ids]

        total_problems = sum(r["total_problems"] for r in records)
        total_solved = sum(r["solved_count"] for r in records)
        all_times = [t for r in records for t in r["solve_times"]]

        snapshots = [
            ContestSnapshot(
                contest_id=r["contest_id"],
                contest_name=r["contest_name"],
                date=r["date"],
                solved=r["solved_count"],
                total=r["total_problems"],
                solve_rate=r["solved_count"] / r["total_problems"] if r["total_problems"] > 0 else 0,
            )
            for r in records
        ]
        best = max(snapshots, key=lambda s: s.solve_rate) if snapshots else None
        worst = min(snapshots, key=lambda s: s.solve_rate) if snapshots else None

        result.append(ComboStats(
            combo_key=key,
            member_ids=member_ids,
            member_names=member_names,
            team_size=len(member_ids),
            contests_played=len(records),
            total_problems_faced=total_problems,
            total_solved=total_solved,
            solve_rate=total_solved / total_problems if total_problems > 0 else 0,
            avg_solve_time=sum(all_times) / len(all_times) if all_times else None,
            best_contest=best,
            worst_contest=worst,
        ))

    return result


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/combos")
async def list_combos() -> list[ComboStats]:
    """All tested groups (trios and duos) with aggregate performance stats."""
    combo_records = _derive_combo_data()
    team_data = load_team()
    name_map = {m["id"]: m["name"] for m in team_data["members"]}
    return _build_combo_stats(combo_records, name_map)


@router.get("/suggest")
async def suggest_next() -> SuggestResponse:
    """Suggest the next full partition of active members into teams."""
    team_data = load_team()
    members = team_data["members"]
    active_members = [m for m in members if m.get("active", True)]
    active_ids = [m["id"] for m in active_members]
    name_map = {m["id"]: m["name"] for m in members}
    n = len(active_ids)

    if n < 2:
        return SuggestResponse(
            teams=[],
            reason="Need at least 2 active members to form teams",
            tested_trios=0,
            total_possible_trios=0,
            active_count=n,
        )

    # All possible trios from active members
    all_trios = list(combinations(active_ids, 3)) if n >= 3 else []
    total_possible = len(all_trios)

    # Which trios have been tested
    combo_records = _derive_combo_data()
    tested_keys = set(combo_records.keys())
    tested_trio_count = sum(1 for t in all_trios if _combo_key(list(t)) in tested_keys)

    # Load profiles for coverage tiebreaking
    problems = load_problems()
    profiles = compute_profiles(active_members, problems)

    # Find the best partition: floor(n/3) trios + remainder
    num_trios = n // 3
    remainder = n % 3

    if num_trios == 0:
        # Only a duo or solo
        teams = [SuggestedTeam(
            member_ids=active_ids,
            member_names=[name_map.get(i, f"#{i}") for i in active_ids],
            coverage=team_coverage(active_ids, profiles),
        )]
        return SuggestResponse(
            teams=teams,
            reason="All active members form one team",
            tested_trios=tested_trio_count,
            total_possible_trios=total_possible,
            active_count=n,
        )

    # Score partitions: try to find one with untested trios, then best coverage
    best_partition: list[list[int]] | None = None
    best_score = -1.0
    best_has_untested = False

    for first_trio in combinations(active_ids, 3):
        remaining_after_first = [i for i in active_ids if i not in first_trio]

        if num_trios >= 2:
            for second_trio in combinations(remaining_after_first, 3):
                if first_trio[0] > second_trio[0]:
                    continue
                leftover = [i for i in remaining_after_first if i not in second_trio]
                partition = [list(first_trio), list(second_trio)]
                if leftover:
                    partition.append(leftover)

                # Check if any trio in this partition is untested
                has_untested = any(
                    _combo_key(team) not in tested_keys
                    for team in partition if len(team) == 3
                )

                # Score: min coverage across all teams
                coverages = [sum(team_coverage(team, profiles).values()) for team in partition]
                score = min(coverages)

                # Prefer partitions with untested trios, then by score
                if has_untested and not best_has_untested:
                    best_partition = partition
                    best_score = score
                    best_has_untested = True
                elif has_untested == best_has_untested and score > best_score:
                    best_partition = partition
                    best_score = score
        else:
            # Only 1 trio
            leftover = remaining_after_first
            partition = [list(first_trio)]
            if leftover:
                partition.append(leftover)

            has_untested = _combo_key(list(first_trio)) not in tested_keys
            coverages = [sum(team_coverage(team, profiles).values()) for team in partition]
            score = min(coverages)

            if has_untested and not best_has_untested:
                best_partition = partition
                best_score = score
                best_has_untested = True
            elif has_untested == best_has_untested and score > best_score:
                best_partition = partition
                best_score = score

    if best_partition is None:
        best_partition = [active_ids]

    reason = "Partition includes untested combos" if best_has_untested else "Best balanced partition from tested combos"

    teams = [
        SuggestedTeam(
            member_ids=team,
            member_names=[name_map.get(i, f"#{i}") for i in team],
            coverage=team_coverage(team, profiles),
        )
        for team in best_partition
    ]

    return SuggestResponse(
        teams=teams,
        reason=reason,
        tested_trios=tested_trio_count,
        total_possible_trios=total_possible,
        active_count=n,
    )


@router.get("/rankings")
async def rank_combos() -> list[ComboRanking]:
    """Rank all tested combos by empirical performance."""
    combo_records = _derive_combo_data()
    team_data = load_team()
    name_map = {m["id"]: m["name"] for m in team_data["members"]}
    combos = _build_combo_stats(combo_records, name_map)

    # Sort: primary by solve_rate desc, secondary by avg_solve_time asc
    combos.sort(
        key=lambda c: (-c.solve_rate, c.avg_solve_time if c.avg_solve_time is not None else float("inf"))
    )

    rankings: list[ComboRanking] = []
    for rank, combo in enumerate(combos, 1):
        records = combo_records.get(combo.combo_key, [])
        records_sorted = sorted(records, key=lambda r: r["date"])
        trend = [
            r["solved_count"] / r["total_problems"] if r["total_problems"] > 0 else 0
            for r in records_sorted
        ]
        rankings.append(ComboRanking(rank=rank, combo=combo, trend=trend))

    return rankings


@router.get("/timeline")
async def combo_timeline() -> TimelineResponse:
    """Performance timeline per combo, for line chart visualization."""
    combo_records = _derive_combo_data()

    combos: dict[str, list[ComboTimelinePoint]] = {}
    for key, records in combo_records.items():
        records_sorted = sorted(records, key=lambda r: r["date"])
        combos[key] = [
            ComboTimelinePoint(
                date=r["date"],
                contest_name=r["contest_name"],
                contest_id=r["contest_id"],
                solve_rate=r["solved_count"] / r["total_problems"] if r["total_problems"] > 0 else 0,
                problems_solved=r["solved_count"],
                total_problems=r["total_problems"],
            )
            for r in records_sorted
        ]

    return TimelineResponse(combos=combos)
