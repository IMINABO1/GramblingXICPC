release: cd backend && python -c "from database import run_create_all; run_create_all()"
web: cd backend && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
