install:
	@echo "Setup yarn package manager..."
	@corepack enable
	yarn install

build:
	@echo "Building..."
	@yarn exec rollup --config rollup.config.ts --configPlugin swc3

dev:
	@echo "Starting development server..."
	@yarn exec rollup --config rollup.config.ts --configPlugin swc3 --watch

test:
	@echo "Running tests..."
	@yarn exec vitest --dir __tests__

end-to-end-test:
	@echo "Running end-to-end tests..."
	@yarn exec vitest --dir e2e