JK = pnpm exec jiek -f vite-plugin-compression2

install:
	@echo "Setup pnpm package manager..."
	@corepack enable
	pnpm install

build:
	@echo "Building..."
	-rm -rf dist
	$(JK) build
	mv 'dist/index.min.js' 'dist/index.js'
	mv 'dist/index.min.mjs' 'dist/index.mjs'

bootstrap: install build

build-pub: install build
	@echo "Building for publish..."
	$(JK) pub -no-b

test:
	@echo "Running tests..."
	@pnpm exec vitest --dir __tests__ --typecheck.enabled

end-to-end-test:
	@echo "Running end-to-end tests..."
	@pnpm exec vitest e2e/**/*.spec.ts --coverage.enabled=false

format:
	@echo "Format code"
	@pnpm exec dprint fmt