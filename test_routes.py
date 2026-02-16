#!/usr/bin/env python
"""Test script to verify routes are registered."""
from backend.main import app

print("All routes in the app:")
for route in app.routes:
    if hasattr(route, 'path'):
        print(f"  {route.path}")

print("\nRecommendations routes:")
rec_routes = [r for r in app.routes if hasattr(r, 'path') and 'recommendation' in r.path.lower()]
for route in rec_routes:
    print(f"  {route.path}")
    print(f"    Methods: {route.methods if hasattr(route, 'methods') else 'N/A'}")
