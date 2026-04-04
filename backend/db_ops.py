"""Database operations — all async query functions for every domain.

Each function takes an AsyncSession as its first argument. No file I/O here.
"""

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
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


# ---------------------------------------------------------------------------
# Members
# ---------------------------------------------------------------------------


async def get_all_members(db: AsyncSession) -> list[Member]:
    result = await db.execute(select(Member).order_by(Member.id))
    return list(result.scalars().all())


async def get_member(db: AsyncSession, member_id: int) -> Member | None:
    return await db.get(Member, member_id)


async def create_member(
    db: AsyncSession,
    *,
    name: str,
    cf_handle: str | None = None,
    lc_handle: str | None = None,
) -> Member:
    # Find next ID
    result = await db.execute(select(func.max(Member.id)))
    max_id = result.scalar()
    new_id = (max_id + 1) if max_id is not None else 0

    member = Member(
        id=new_id,
        name=name,
        active=True,
        cf_handle=cf_handle,
        lc_handle=lc_handle,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


async def update_member(
    db: AsyncSession,
    member: Member,
    **kwargs: Any,
) -> Member:
    for key, value in kwargs.items():
        if hasattr(member, key):
            setattr(member, key, value)
    await db.commit()
    await db.refresh(member)
    return member


async def delete_member(db: AsyncSession, member_id: int) -> bool:
    member = await db.get(Member, member_id)
    if member is None:
        return False
    await db.delete(member)
    await db.commit()
    return True


# ---------------------------------------------------------------------------
# Solved Problems
# ---------------------------------------------------------------------------


async def get_member_solved_curated(db: AsyncSession, member_id: int) -> list[str]:
    result = await db.execute(
        select(MemberSolvedProblem.problem_id)
        .where(MemberSolvedProblem.member_id == member_id, MemberSolvedProblem.is_curated == True)
    )
    return list(result.scalars().all())


async def get_member_all_accepted(db: AsyncSession, member_id: int) -> list[str]:
    result = await db.execute(
        select(MemberSolvedProblem.problem_id)
        .where(MemberSolvedProblem.member_id == member_id)
    )
    return list(result.scalars().all())


async def get_member_timestamps(db: AsyncSession, member_id: int) -> dict[str, int]:
    result = await db.execute(
        select(MemberSolvedProblem.problem_id, MemberSolvedProblem.solved_at_ts)
        .where(MemberSolvedProblem.member_id == member_id, MemberSolvedProblem.solved_at_ts != None)
    )
    return {row.problem_id: row.solved_at_ts for row in result.all()}


async def sync_member_solved(
    db: AsyncSession,
    member_id: int,
    all_accepted: list[str],
    curated_ids: set[str],
    timestamps: dict[str, int],
    solve_quality_data: dict[str, dict[str, Any]],
) -> None:
    """Replace all solved problems and solve quality for a member (bulk sync)."""
    # Delete existing
    await db.execute(
        delete(MemberSolvedProblem).where(MemberSolvedProblem.member_id == member_id)
    )
    await db.execute(
        delete(SolveQuality).where(SolveQuality.member_id == member_id)
    )

    # Bulk insert solved problems
    for pid in all_accepted:
        db.add(MemberSolvedProblem(
            member_id=member_id,
            problem_id=pid,
            is_curated=pid in curated_ids,
            solved_at_ts=timestamps.get(pid),
        ))

    # Bulk insert solve quality
    for pid, sq in solve_quality_data.items():
        db.add(SolveQuality(
            member_id=member_id,
            problem_id=pid,
            classification=sq.get("classification"),
            wrong_attempts=sq.get("wrong_attempts"),
            time_to_solve_hrs=sq.get("time_to_solve_hrs"),
            weight=sq.get("weight"),
        ))

    await db.commit()


# ---------------------------------------------------------------------------
# Solve Quality & Editorial Flags
# ---------------------------------------------------------------------------


async def get_member_solve_quality(db: AsyncSession, member_id: int) -> dict[str, dict[str, Any]]:
    result = await db.execute(
        select(SolveQuality).where(SolveQuality.member_id == member_id)
    )
    return {
        sq.problem_id: {
            "classification": sq.classification,
            "wrong_attempts": sq.wrong_attempts,
            "time_to_solve_hrs": sq.time_to_solve_hrs,
            "weight": sq.weight,
        }
        for sq in result.scalars().all()
    }


async def get_member_editorial_flags(db: AsyncSession, member_id: int) -> dict[str, dict[str, Any]]:
    result = await db.execute(
        select(EditorialFlag).where(EditorialFlag.member_id == member_id)
    )
    return {
        ef.problem_id: {
            "platform": "cf",  # default
            "flagged_at": None,
        }
        for ef in result.scalars().all()
        if ef.flagged
    }


async def set_editorial_flag(
    db: AsyncSession,
    member_id: int,
    problem_id: str,
    *,
    platform: str = "cf",
    flagged_at: str | None = None,
) -> None:
    # Check if exists
    result = await db.execute(
        select(EditorialFlag).where(
            EditorialFlag.member_id == member_id,
            EditorialFlag.problem_id == problem_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.flagged = True
    else:
        db.add(EditorialFlag(
            member_id=member_id,
            problem_id=problem_id,
            flagged=True,
        ))
    await db.commit()


async def remove_editorial_flag(db: AsyncSession, member_id: int, problem_id: str) -> bool:
    result = await db.execute(
        select(EditorialFlag).where(
            EditorialFlag.member_id == member_id,
            EditorialFlag.problem_id == problem_id,
        )
    )
    flag = result.scalar_one_or_none()
    if flag is None:
        return False
    await db.delete(flag)
    await db.commit()
    return True


# ---------------------------------------------------------------------------
# Contests
# ---------------------------------------------------------------------------


async def get_all_contests(db: AsyncSession) -> list[Contest]:
    result = await db.execute(select(Contest).order_by(Contest.date.desc()))
    return list(result.scalars().all())


async def get_contest(db: AsyncSession, contest_id: str) -> Contest | None:
    return await db.get(Contest, contest_id)


async def create_contest(db: AsyncSession, **kwargs: Any) -> Contest:
    contest = Contest(id=uuid.uuid4().hex[:8], **kwargs)
    db.add(contest)
    await db.commit()
    await db.refresh(contest)
    return contest


async def update_contest(db: AsyncSession, contest: Contest, **kwargs: Any) -> Contest:
    for key, value in kwargs.items():
        if value is not None and hasattr(contest, key):
            setattr(contest, key, value)
    await db.commit()
    await db.refresh(contest)
    return contest


async def delete_contest(db: AsyncSession, contest_id: str) -> bool:
    contest = await db.get(Contest, contest_id)
    if contest is None:
        return False
    await db.delete(contest)
    await db.commit()
    return True


async def dismiss_contest_problem(db: AsyncSession, contest_id: str, problem_index: str) -> Contest | None:
    contest = await db.get(Contest, contest_id)
    if contest is None:
        return None
    dismissed = list(contest.dismissed_problems or [])
    if problem_index not in dismissed:
        dismissed.append(problem_index)
    contest.dismissed_problems = dismissed
    await db.commit()
    await db.refresh(contest)
    return contest


async def undismiss_contest_problem(db: AsyncSession, contest_id: str, problem_index: str) -> Contest | None:
    contest = await db.get(Contest, contest_id)
    if contest is None:
        return None
    dismissed = list(contest.dismissed_problems or [])
    if problem_index in dismissed:
        dismissed.remove(problem_index)
    contest.dismissed_problems = dismissed
    await db.commit()
    await db.refresh(contest)
    return contest


# ---------------------------------------------------------------------------
# Notes
# ---------------------------------------------------------------------------


async def get_member_notes(db: AsyncSession, member_id: int) -> list[Note]:
    result = await db.execute(
        select(Note).where(Note.member_id == member_id).order_by(Note.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_problem_notes(db: AsyncSession, problem_id: str) -> list[Note]:
    result = await db.execute(
        select(Note).where(Note.problem_id == problem_id)
    )
    return list(result.scalars().all())


async def get_member_problem_note(db: AsyncSession, member_id: int, problem_id: str) -> Note | None:
    result = await db.execute(
        select(Note).where(Note.member_id == member_id, Note.problem_id == problem_id)
    )
    return result.scalar_one_or_none()


async def upsert_note(db: AsyncSession, member_id: int, problem_id: str, content: str) -> Note:
    now = datetime.now(timezone.utc).isoformat()
    existing = await get_member_problem_note(db, member_id, problem_id)
    if existing:
        existing.content = content
        existing.updated_at = now
        await db.commit()
        await db.refresh(existing)
        return existing

    note = Note(
        id=f"note_{uuid.uuid4().hex[:8]}",
        member_id=member_id,
        problem_id=problem_id,
        content=content,
        created_at=now,
        updated_at=now,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


async def delete_note(db: AsyncSession, note_id: str) -> bool:
    note = await db.get(Note, note_id)
    if note is None:
        return False
    await db.delete(note)
    await db.commit()
    return True


# ---------------------------------------------------------------------------
# Journals
# ---------------------------------------------------------------------------


async def get_member_journals(db: AsyncSession, member_id: int) -> list[Journal]:
    result = await db.execute(
        select(Journal).where(Journal.member_id == member_id).order_by(Journal.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_journal(db: AsyncSession, member_id: int, topic_id: str) -> Journal | None:
    result = await db.execute(
        select(Journal).where(Journal.member_id == member_id, Journal.topic_id == topic_id)
    )
    return result.scalar_one_or_none()


async def add_journal_entry(
    db: AsyncSession, member_id: int, topic_id: str, content: str
) -> Journal:
    now = datetime.now(timezone.utc).isoformat()
    journal = await get_journal(db, member_id, topic_id)

    entry = JournalEntry(
        id=f"entry_{uuid.uuid4().hex[:8]}",
        content=content,
        created_at=now,
    )

    if journal:
        journal.entries.append(entry)
        journal.updated_at = now
    else:
        journal = Journal(
            id=f"journal_{uuid.uuid4().hex[:8]}",
            member_id=member_id,
            topic_id=topic_id,
            created_at=now,
            updated_at=now,
            entries=[entry],
        )
        db.add(journal)

    await db.commit()
    await db.refresh(journal)
    return journal


async def edit_journal_entry(
    db: AsyncSession, member_id: int, topic_id: str, entry_id: str, content: str
) -> Journal | None:
    journal = await get_journal(db, member_id, topic_id)
    if not journal:
        return None

    for entry in journal.entries:
        if entry.id == entry_id:
            entry.content = content
            journal.updated_at = datetime.now(timezone.utc).isoformat()
            await db.commit()
            await db.refresh(journal)
            return journal

    return None  # entry not found


async def delete_journal_entry(
    db: AsyncSession, member_id: int, topic_id: str, entry_id: str
) -> str | None:
    """Delete an entry. Returns 'deleted' or 'journal_removed' or None if not found."""
    journal = await get_journal(db, member_id, topic_id)
    if not journal:
        return None

    found = False
    for entry in journal.entries:
        if entry.id == entry_id:
            await db.delete(entry)
            found = True
            break

    if not found:
        return None

    # Remove journal if no entries left
    remaining = [e for e in journal.entries if e.id != entry_id]
    if not remaining:
        await db.delete(journal)
        await db.commit()
        return "journal_removed"

    journal.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    return "deleted"


async def get_all_journals(db: AsyncSession) -> list[Journal]:
    result = await db.execute(select(Journal))
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Custom Topics
# ---------------------------------------------------------------------------


async def get_all_custom_topics(db: AsyncSession) -> list[CustomTopic]:
    result = await db.execute(select(CustomTopic))
    return list(result.scalars().all())


async def get_custom_topic_by_name(db: AsyncSession, name: str) -> CustomTopic | None:
    result = await db.execute(
        select(CustomTopic).where(func.lower(CustomTopic.name) == name.lower())
    )
    return result.scalar_one_or_none()


async def create_custom_topic(
    db: AsyncSession, *, name: str, icon: str = "\U0001f4dd", created_by: int
) -> CustomTopic:
    now = datetime.now(timezone.utc).isoformat()
    topic = CustomTopic(
        id=f"custom_{uuid.uuid4().hex[:8]}",
        name=name.strip(),
        icon=icon,
        created_by=created_by,
        created_at=now,
    )
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return topic


async def delete_custom_topic(db: AsyncSession, topic_id: str) -> bool:
    topic = await db.get(CustomTopic, topic_id)
    if topic is None:
        return False
    # Also delete all journals for this topic
    await db.execute(delete(Journal).where(Journal.topic_id == topic_id))
    await db.delete(topic)
    await db.commit()
    return True


# ---------------------------------------------------------------------------
# Tags
# ---------------------------------------------------------------------------


async def get_all_tags(db: AsyncSession) -> list[Tag]:
    result = await db.execute(select(Tag))
    return list(result.scalars().all())


async def get_tag(db: AsyncSession, tag_id: str) -> Tag | None:
    return await db.get(Tag, tag_id)


async def get_tag_by_name(db: AsyncSession, name: str) -> Tag | None:
    result = await db.execute(
        select(Tag).where(func.lower(Tag.name) == name.lower())
    )
    return result.scalar_one_or_none()


async def create_tag(
    db: AsyncSession, *, name: str, color: str = "#00ffa3", created_by: int
) -> Tag:
    now = datetime.now(timezone.utc).isoformat()
    tag = Tag(
        id=f"tag_{uuid.uuid4().hex[:8]}",
        name=name.strip(),
        color=color,
        created_by=created_by,
        created_at=now,
    )
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return tag


async def update_tag(db: AsyncSession, tag: Tag, **kwargs: Any) -> Tag:
    for key, value in kwargs.items():
        if value is not None and hasattr(tag, key):
            setattr(tag, key, value)
    await db.commit()
    await db.refresh(tag)
    return tag


async def delete_tag(db: AsyncSession, tag_id: str) -> bool:
    tag = await db.get(Tag, tag_id)
    if tag is None:
        return False
    await db.delete(tag)  # cascades to problem_tags
    await db.commit()
    return True


async def count_problems_for_tag(db: AsyncSession, tag_id: str) -> int:
    result = await db.execute(
        select(func.count()).where(ProblemTag.tag_id == tag_id)
    )
    return result.scalar() or 0


async def get_problem_tags(db: AsyncSession, problem_id: str) -> list[Tag]:
    result = await db.execute(
        select(Tag).join(ProblemTag).where(ProblemTag.problem_id == problem_id)
    )
    return list(result.scalars().all())


async def add_problem_tags(db: AsyncSession, problem_id: str, tag_ids: list[str]) -> int:
    """Add tags to a problem. Returns total tag count for the problem."""
    # Get existing tag IDs for this problem
    result = await db.execute(
        select(ProblemTag.tag_id).where(ProblemTag.problem_id == problem_id)
    )
    existing = set(result.scalars().all())

    for tid in tag_ids:
        if tid not in existing:
            db.add(ProblemTag(problem_id=problem_id, tag_id=tid))
            existing.add(tid)

    await db.commit()
    return len(existing)


async def remove_problem_tag(db: AsyncSession, problem_id: str, tag_id: str) -> bool:
    result = await db.execute(
        select(ProblemTag).where(
            ProblemTag.problem_id == problem_id, ProblemTag.tag_id == tag_id
        )
    )
    pt = result.scalar_one_or_none()
    if pt is None:
        return False
    await db.delete(pt)
    await db.commit()
    return True


async def get_problems_by_tag(db: AsyncSession, tag_id: str) -> list[str]:
    result = await db.execute(
        select(ProblemTag.problem_id).where(ProblemTag.tag_id == tag_id)
    )
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Helpers — convert ORM objects to dicts matching old JSON shapes
# ---------------------------------------------------------------------------


def member_to_dict(member: Member) -> dict[str, Any]:
    """Convert a Member ORM object to the dict shape that routers/services expect."""
    curated = []
    all_accepted = []
    timestamps: dict[str, int] = {}
    for sp in member.solved_problems:
        all_accepted.append(sp.problem_id)
        if sp.is_curated:
            curated.append(sp.problem_id)
        if sp.solved_at_ts is not None:
            timestamps[sp.problem_id] = sp.solved_at_ts

    sq: dict[str, dict[str, Any]] = {}
    for s in member.solve_qualities:
        sq[s.problem_id] = {
            "classification": s.classification,
            "wrong_attempts": s.wrong_attempts,
            "time_to_solve_hrs": s.time_to_solve_hrs,
            "weight": s.weight,
        }

    ef: dict[str, dict[str, Any]] = {}
    for f in member.editorial_flags:
        if f.flagged:
            ef[f.problem_id] = {"platform": "cf", "flagged_at": None}

    return {
        "id": member.id,
        "name": member.name,
        "active": member.active,
        "cf_handle": member.cf_handle,
        "lc_handle": member.lc_handle,
        "solved_curated": sorted(curated),
        "all_accepted": sorted(all_accepted),
        "problem_timestamps": timestamps,
        "solve_quality": sq,
        "editorial_flags": ef,
        "lc_data": member.lc_data,
        "last_synced": member.last_synced,
        "lc_synced": member.lc_synced,
    }


def contest_to_dict(contest: Contest) -> dict[str, Any]:
    """Convert a Contest ORM object to the dict shape that routers expect."""
    return {
        "id": contest.id,
        "cf_contest_id": contest.cf_contest_id,
        "contest_name": contest.contest_name,
        "date": contest.date,
        "duration_minutes": contest.duration_minutes,
        "teams": contest.teams or [],
        "results": contest.results or [],
        "notes": contest.notes or "",
        "dismissed_problems": contest.dismissed_problems or [],
        "created_at": contest.created_at,
    }


def note_to_dict(note: Note) -> dict[str, Any]:
    return {
        "id": note.id,
        "member_id": note.member_id,
        "problem_id": note.problem_id,
        "content": note.content,
        "created_at": note.created_at,
        "updated_at": note.updated_at,
    }


def journal_to_dict(journal: Journal) -> dict[str, Any]:
    return {
        "id": journal.id,
        "member_id": journal.member_id,
        "topic_id": journal.topic_id,
        "entries": [
            {
                "id": e.id,
                "content": e.content,
                "created_at": e.created_at,
            }
            for e in journal.entries
        ],
        "created_at": journal.created_at,
        "updated_at": journal.updated_at,
    }


def custom_topic_to_dict(topic: CustomTopic) -> dict[str, Any]:
    return {
        "id": topic.id,
        "name": topic.name,
        "icon": topic.icon,
        "created_by": topic.created_by,
        "created_at": topic.created_at,
    }
