# Enterprise AI OS - Makefile
# Author: Md Adil Muzaffar

.PHONY: help up down restart logs dev-backend dev-frontend test eval clean

help:
	@echo "Enterprise AI OS Developer CLI"
	@echo "--------------------------------"
	@echo "make up          - Start all infrastructure containers (Postgres, Redis, MinIO)"
	@echo "make down        - Stop and remove all containers"
	@echo "make logs        - View logs of all containers"
	@echo "make dev-backend - Run FastAPI backend locally with hot-reload"
	@echo "make dev-frontend- Run React frontend locally"
	@echo "make test        - Run pytest unit and integration tests"
	@echo "make eval        - Run LangGraph agent evaluations"
	@echo "make clean       - Remove all Docker volumes and wipe data"

# --- Infrastructure ---
up:
	docker-compose up -d
	@echo "Infrastructure is up! MinIO Console: http://localhost:9001"

down:
	docker-compose down

restart:
	docker-compose down && docker-compose up -d

logs:
	docker-compose logs -f

clean:
	docker-compose down -v
	@echo "All volumes and data wiped."

# --- Development Environments ---
dev-backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm run dev

# --- Quality Assurance ---
test:
	cd backend && pytest -v

eval:
	cd evaluation && python run_evals.py