"""SQLAlchemy ORM models — 11 tables for all mutable state."""

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSON as PG_JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from database import Base


class Member(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    cf_handle: Mapped[str | None] = mapped_column(String, nullable=True)
    lc_handle: Mapped[str | None] = mapped_column(String, nullable=True)
    lc_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    last_synced: Mapped[str | None] = mapped_column(String, nullable=True)
    lc_synced: Mapped[str | None] = mapped_column(String, nullable=True)

    solved_problems: Mapped[list["MemberSolvedProblem"]] = relationship(
        back_populates="member", cascade="all, delete-orphan", lazy="selectin"
    )
    solve_qualities: Mapped[list["SolveQuality"]] = relationship(
        back_populates="member", cascade="all, delete-orphan", lazy="selectin"
    )
    editorial_flags: Mapped[list["EditorialFlag"]] = relationship(
        back_populates="member", cascade="all, delete-orphan", lazy="selectin"
    )
    notes: Mapped[list["Note"]] = relationship(
        back_populates="member", cascade="all, delete-orphan", lazy="selectin"
    )
    journals: Mapped[list["Journal"]] = relationship(
        back_populates="member", cascade="all, delete-orphan", lazy="selectin"
    )


class MemberSolvedProblem(Base):
    __tablename__ = "member_solved_problems"
    __table_args__ = (UniqueConstraint("member_id", "problem_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    member_id: Mapped[int] = mapped_column(Integer, ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    problem_id: Mapped[str] = mapped_column(String, nullable=False)
    is_curated: Mapped[bool] = mapped_column(Boolean, nullable=False)
    solved_at_ts: Mapped[int | None] = mapped_column(Integer, nullable=True)

    member: Mapped["Member"] = relationship(back_populates="solved_problems")


class SolveQuality(Base):
    __tablename__ = "solve_qualities"
    __table_args__ = (UniqueConstraint("member_id", "problem_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    member_id: Mapped[int] = mapped_column(Integer, ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    problem_id: Mapped[str] = mapped_column(String, nullable=False)
    classification: Mapped[str | None] = mapped_column(String, nullable=True)
    wrong_attempts: Mapped[int | None] = mapped_column(Integer, nullable=True)
    time_to_solve_hrs: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)

    member: Mapped["Member"] = relationship(back_populates="solve_qualities")


class EditorialFlag(Base):
    __tablename__ = "editorial_flags"
    __table_args__ = (UniqueConstraint("member_id", "problem_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    member_id: Mapped[int] = mapped_column(Integer, ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    problem_id: Mapped[str] = mapped_column(String, nullable=False)
    flagged: Mapped[bool] = mapped_column(Boolean, default=True)

    member: Mapped["Member"] = relationship(back_populates="editorial_flags")


class Contest(Base):
    __tablename__ = "contests"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    cf_contest_id: Mapped[int] = mapped_column(Integer, nullable=False)
    contest_name: Mapped[str] = mapped_column(String, nullable=False)
    date: Mapped[str] = mapped_column(String, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    teams: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    results: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    dismissed_problems: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[str] = mapped_column(String, nullable=False)


class Note(Base):
    __tablename__ = "notes"
    __table_args__ = (UniqueConstraint("member_id", "problem_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    member_id: Mapped[int] = mapped_column(Integer, ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    problem_id: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[str] = mapped_column(String, nullable=False)

    member: Mapped["Member"] = relationship(back_populates="notes")


class Journal(Base):
    __tablename__ = "journals"
    __table_args__ = (UniqueConstraint("member_id", "topic_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    member_id: Mapped[int] = mapped_column(Integer, ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    topic_id: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[str] = mapped_column(String, nullable=False)

    entries: Mapped[list["JournalEntry"]] = relationship(
        back_populates="journal", cascade="all, delete-orphan", lazy="selectin"
    )
    member: Mapped["Member"] = relationship(back_populates="journals")


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    journal_id: Mapped[str] = mapped_column(String, ForeignKey("journals.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)

    journal: Mapped["Journal"] = relationship(back_populates="entries")


class CustomTopic(Base):
    __tablename__ = "custom_topics"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    icon: Mapped[str] = mapped_column(String, default="\U0001f4dd")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[str] = mapped_column(String, nullable=False)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    color: Mapped[str] = mapped_column(String, default="#00ffa3")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[str] = mapped_column(String, nullable=False)

    problem_tags: Mapped[list["ProblemTag"]] = relationship(
        back_populates="tag", cascade="all, delete-orphan", lazy="selectin"
    )


class ProblemTag(Base):
    __tablename__ = "problem_tags"
    __table_args__ = (UniqueConstraint("problem_id", "tag_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    problem_id: Mapped[str] = mapped_column(String, nullable=False)
    tag_id: Mapped[str] = mapped_column(String, ForeignKey("tags.id", ondelete="CASCADE"), nullable=False)

    tag: Mapped["Tag"] = relationship(back_populates="problem_tags")
