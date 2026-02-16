"""Sync Codeforces handles — pull submission history for team members.

Usage:
    python scripts/sync_handles.py                         # Sync all members with handles
    python scripts/sync_handles.py --member 0              # Sync just member 0
    python scripts/sync_handles.py --set-handle 0 tourist  # Set handle for member 0
    python scripts/sync_handles.py --list                  # List all members
"""

import argparse
import sys
from pathlib import Path

# Add project root to path so imports work when run as script
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.services.handle_sync import load_team, save_team, sync_all, sync_member


def cmd_list() -> None:
    """Print all team members."""
    team = load_team()
    print(f"{'ID':<4} {'Name':<15} {'CF Handle':<20} {'Curated':<10} {'Total AC':<10} {'Last Synced'}")
    print("-" * 85)
    for m in team["members"]:
        handle = m.get("cf_handle") or "(not set)"
        curated = len(m.get("solved_curated", []))
        total = len(m.get("all_accepted", []))
        synced = m.get("last_synced") or "never"
        print(f"{m['id']:<4} {m['name']:<15} {handle:<20} {curated:<10} {total:<10} {synced}")


def cmd_set_handle(member_id: int, handle: str) -> None:
    """Set a CF handle for a member."""
    team = load_team()
    for m in team["members"]:
        if m["id"] == member_id:
            m["cf_handle"] = handle
            save_team(team)
            print(f"Set handle for {m['name']} (id={member_id}) to: {handle}")
            return
    print(f"Error: member {member_id} not found", file=sys.stderr)
    sys.exit(1)


def cmd_sync(member_id: int | None) -> None:
    """Sync one or all members."""
    if member_id is not None:
        try:
            result = sync_member(member_id)
            print(f"Synced {result['cf_handle']} (member {member_id}):")
            print(f"  Curated solved: {result['total_solved']}")
            print(f"  Total accepted: {result['total_accepted']}")
            if result["new_solved"]:
                print(f"  New curated:    {', '.join(result['new_solved'])}")
            print(f"  Last synced:    {result['last_synced']}")
        except ValueError as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        results = sync_all()
        if not results:
            print("No members have CF handles set. Use --set-handle to add one.")
            return
        for r in results:
            if "error" in r:
                print(f"  [{r['member_id']}] {r['cf_handle']}: ERROR - {r['error']}")
            else:
                print(f"  [{r['member_id']}] {r['cf_handle']}: {r['total_solved']} curated, {r['total_accepted']} total")
        print(f"\nSynced {len(results)} member(s).")


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync CF handles for team members")
    parser.add_argument("--list", action="store_true", help="List all team members")
    parser.add_argument("--member", type=int, help="Sync a specific member by ID")
    parser.add_argument("--set-handle", nargs=2, metavar=("MEMBER_ID", "HANDLE"), help="Set CF handle for a member")
    args = parser.parse_args()

    if args.list:
        cmd_list()
    elif args.set_handle:
        cmd_set_handle(int(args.set_handle[0]), args.set_handle[1])
    else:
        cmd_sync(args.member)


if __name__ == "__main__":
    main()
