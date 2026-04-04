"""One-time migration script: seed the database from existing JSON files.

Usage:
    cd backend && python -m scripts.migrate_json_to_db

Or on Heroku:
    heroku run "cd backend && python -m scripts.migrate_json_to_db"
"""

import asyncio
import json
import sys
from pathlib import Path

# Add backend to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from database import AsyncSessionLocal, create_tables  # noqa: E402
from models import (  # noqa: E402
    Contest,
    CustomTopic,
    EditorialFlag,
    Journal,
    JournalEntry,
    Member,
    MemberSolvedProblem,
    Note,
    ProblemTag,
    SolveQuality,
    Tag,
)

DATA_DIR = Path(__file__).parent.parent / "backend" / "data"


def _load_json(filename: str, default: dict | list | None = None) -> dict | list:
    path = DATA_DIR / filename
    if not path.exists():
        print(f"  Skipping {filename} (not found)")
        return default if default is not None else {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_curated_ids() -> set[str]:
    problems = _load_json("problems.json", [])
    return {p["id"] for p in problems}


async def migrate():
    print("Creating tables...")
    await create_tables()

    curated_ids = _load_curated_ids()
    print(f"Loaded {len(curated_ids)} curated problem IDs")

    async with AsyncSessionLocal() as db:
        # --- Members ---
        team_data = _load_json("team.json", {"members": []})
        members = team_data.get("members", [])
        print(f"\nMigrating {len(members)} members...")

        for m in members:
            member = Member(
                id=m["id"],
                name=m["name"],
                active=m.get("active", True),
                cf_handle=m.get("cf_handle"),
                lc_handle=m.get("lc_handle"),
                lc_data=m.get("lc_data"),
                last_synced=m.get("last_synced"),
                lc_synced=(m.get("lc_data") or {}).get("lc_synced"),
            )
            db.add(member)

            # Solved problems
            all_accepted = set(m.get("all_accepted", []))
            solved_curated = set(m.get("solved_curated", []))
            timestamps = m.get("problem_timestamps", {})

            for pid in all_accepted:
                db.add(MemberSolvedProblem(
                    member_id=m["id"],
                    problem_id=pid,
                    is_curated=pid in curated_ids,
                    solved_at_ts=timestamps.get(pid),
                ))

            # Solve quality
            for pid, sq in (m.get("solve_quality") or {}).items():
                db.add(SolveQuality(
                    member_id=m["id"],
                    problem_id=pid,
                    classification=sq.get("classification"),
                    wrong_attempts=sq.get("wrong_attempts"),
                    time_to_solve_hrs=sq.get("time_to_solve_hrs"),
                    weight=sq.get("weight"),
                ))

            # Editorial flags
            for pid, flag in (m.get("editorial_flags") or {}).items():
                db.add(EditorialFlag(
                    member_id=m["id"],
                    problem_id=pid,
                    flagged=True,
                ))

            print(f"  {m['name']}: {len(all_accepted)} solved, {len(solved_curated)} curated")

        await db.commit()

        # --- Contests ---
        contests_data = _load_json("contests.json", {"contests": []})
        contests = contests_data.get("contests", [])
        print(f"\nMigrating {len(contests)} contests...")

        for c in contests:
            db.add(Contest(
                id=c["id"],
                cf_contest_id=c["cf_contest_id"],
                contest_name=c["contest_name"],
                date=c["date"],
                duration_minutes=c["duration_minutes"],
                teams=c.get("teams", []),
                results=c.get("results", []),
                notes=c.get("notes", ""),
                dismissed_problems=c.get("dismissed_problems", []),
                created_at=c["created_at"],
            ))

        await db.commit()

        # --- Notes ---
        notes_data = _load_json("notes.json", {"notes": []})
        notes = notes_data.get("notes", [])
        print(f"\nMigrating {len(notes)} notes...")

        for n in notes:
            db.add(Note(
                id=n["id"],
                member_id=n["member_id"],
                problem_id=n["problem_id"],
                content=n["content"],
                created_at=n["created_at"],
                updated_at=n.get("updated_at", n["created_at"]),
            ))

        await db.commit()

        # --- Journals ---
        journals_data = _load_json("journals.json", {"journals": [], "custom_topics": []})
        journals = journals_data.get("journals", [])
        custom_topics = journals_data.get("custom_topics", [])
        print(f"\nMigrating {len(journals)} journals and {len(custom_topics)} custom topics...")

        for ct in custom_topics:
            db.add(CustomTopic(
                id=ct["id"],
                name=ct["name"],
                icon=ct.get("icon", "\U0001f4dd"),
                created_by=ct.get("created_by"),
                created_at=ct.get("created_at", ""),
            ))

        for j in journals:
            journal = Journal(
                id=j["id"],
                member_id=j["member_id"],
                topic_id=j["topic_id"],
                created_at=j["created_at"],
                updated_at=j.get("updated_at", j["created_at"]),
            )
            db.add(journal)
            await db.flush()  # ensure journal ID is available

            for e in j.get("entries", []):
                db.add(JournalEntry(
                    id=e["id"],
                    journal_id=j["id"],
                    content=e["content"],
                    created_at=e["created_at"],
                ))

        await db.commit()

        # --- Tags ---
        tags_data = _load_json("tags.json", {"tags": [], "problem_tags": {}})
        tags = tags_data.get("tags", [])
        problem_tags = tags_data.get("problem_tags", {})
        print(f"\nMigrating {len(tags)} tags and {sum(len(v) for v in problem_tags.values())} problem-tag mappings...")

        for t in tags:
            db.add(Tag(
                id=t["id"],
                name=t["name"],
                color=t.get("color", "#00ffa3"),
                created_by=t.get("created_by"),
                created_at=t.get("created_at", ""),
            ))

        await db.flush()

        for pid, tag_ids in problem_tags.items():
            for tid in tag_ids:
                db.add(ProblemTag(
                    problem_id=pid,
                    tag_id=tid,
                ))

        await db.commit()

    print("\nMigration complete!")


if __name__ == "__main__":
    asyncio.run(migrate())
