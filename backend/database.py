"""Database setup — async SQLAlchemy engine, session factory, and dependency."""

import os
import ssl

from sqlalchemy import JSON, event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

# Default to local SQLite; override with DATABASE_URL for Neon/Postgres in production.
_raw_url = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./data/gravenger.db")

# Neon/Heroku sometimes provide postgres:// — SQLAlchemy needs postgresql+asyncpg://
if _raw_url.startswith("postgres://"):
    _raw_url = _raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif _raw_url.startswith("postgresql://"):
    _raw_url = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# asyncpg doesn't understand sslmode= query param — strip it and pass ssl via connect_args
_needs_ssl = "sslmode=require" in _raw_url
_raw_url = _raw_url.replace("?sslmode=require", "").replace("&sslmode=require", "")

DATABASE_URL = _raw_url
_is_sqlite = DATABASE_URL.startswith("sqlite")

_connect_args: dict = {}
if _is_sqlite:
    _connect_args = {"check_same_thread": False}
elif _needs_ssl:
    _ssl_ctx = ssl.create_default_context()
    _connect_args = {"ssl": _ssl_ctx}

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    type_annotation_map = {dict: JSON}


@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    """Enable foreign keys for SQLite (off by default)."""
    if _is_sqlite:
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


async def get_db():
    """FastAPI dependency — yields an async session, auto-closes after request."""
    async with AsyncSessionLocal() as session:
        yield session


async def create_tables():
    """Create all tables (idempotent). Called during app startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def dispose_engine():
    """Dispose of the engine. Called during app shutdown."""
    await engine.dispose()


def run_create_all():
    """Sync wrapper for create_tables — used in Procfile release phase."""
    import asyncio
    asyncio.run(create_tables())
