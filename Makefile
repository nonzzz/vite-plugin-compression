install:
	@echo "Setup pnpm package manager..."
	@corepack enable
	pnpm install

build:
	@echo "Building..."
	@pnpm exec rollup --config rollup.config.ts --configPlugin swc3


build-pub: install build

dev:
	@echo "Starting development server..."
	@pnpm exec rollup --config rollup.config.ts --configPlugin swc3 --watch

test:
	@echo "Running tests..."
	@pnpm exec vitest --dir __tests__ --typecheck.enabled

end-to-end-test:
	@echo "Running end-to-end tests..."
	@pnpm exec vitest e2e/**/*.spec.ts --coverage.enabled=false

format:
	@echo "Format code"
	@pnpm exec dprint fmt