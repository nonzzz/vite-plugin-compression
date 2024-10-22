NODE_OPTIONS= export NODE_OPTIONS=--no-warnings
ROLLUP_CMD = ${NODE_OPTIONS} && pnpm exec rollup --config rollup.config.mjs

install:
	@echo "Setup pnpm package manager..."
	@corepack enable
	pnpm install

build:
	@echo "Building..."
	$(ROLLUP_CMD)


build-pub: install build

dev:
	@echo "Starting development server..."
	$(ROLLUP_CMD) --watch

test:
	@echo "Running tests..."
	@pnpm exec vitest --dir __tests__ --typecheck.enabled

end-to-end-test:
	@echo "Running end-to-end tests..."
	@pnpm exec vitest e2e/**/*.spec.ts --coverage.enabled=false

format:
	@echo "Format code"
	@pnpm exec dprint fmt