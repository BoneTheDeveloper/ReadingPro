.PHONY: dev build e2e e2e-setup e2e-ui e2e-debug e2e-docker e2e-clean db-generate db-migrate lint typecheck

# Development
dev:
	pnpm dev

build:
	pnpm build

lint:
	pnpm lint

typecheck:
	pnpm typecheck

# Database
db-generate:
	pnpm db:generate

db-migrate:
	pnpm db:migrate:dev

# E2E Testing
e2e-setup: ## Create test user for E2E (run once)
	pnpm e2e:create-user

e2e: ## Run E2E tests (auto-starts dev server)
	pnpm e2e

e2e-ui: ## Run E2E with Playwright UI
	pnpm e2e:ui

e2e-debug: ## Run E2E in debug mode
	pnpm e2e:debug

e2e-docker: ## Start dev server, run E2E in Docker, then stop dev server
	@set -e; \
	echo "Starting dev server..."; \
	pnpm dev:e2e & \
	DEV_PID=$$!; \
	cleanup() { \
		echo "Stopping dev server..."; \
		kill $$DEV_PID 2>/dev/null || true; \
		docker compose -f docker-compose.e2e.yml down --remove-orphans; \
	}; \
	trap cleanup EXIT INT TERM; \
	echo "Waiting for dev server..."; \
	i=0; \
	until curl -sf http://127.0.0.1:3000 > /dev/null 2>&1; do \
		kill -0 $$DEV_PID 2>/dev/null || { echo "Dev server crashed."; exit 1; }; \
		i=$$((i + 1)); \
		if [ $$i -gt 120 ]; then \
			echo "Dev server did not become ready in 120 seconds."; \
			exit 1; \
		fi; \
		sleep 1; \
	done; \
	echo "Dev server ready, running E2E tests..."; \
	set +e; \
	docker compose -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from e2e; \
	RESULT=$$?; \
	set -e; \
	exit $$RESULT

e2e-clean: ## Remove auth state and test results
	rm -rf .auth/ test-results/ playwright-report/
