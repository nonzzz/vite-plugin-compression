ROLLUP = pnpm exec rollup --config rollup.config.mjs

install:
	@echo "Setup pnpm package manager..."
	npm install -g corepack@latest --force
	@corepack enable
	pnpm install

build:
	@echo "Building..."
	-rm -rf dist
	NODE_NO_WARNINGS=1 $(ROLLUP)

bootstrap: install build

build-pub: install
	@echo "Building for publish..."
	@$(MAKE) publish

publish: build
	@echo "Publishing package..."
	$(eval VERSION = $(shell awk -F'"' '/"version":/ {print $4}' package.json))
	$(eval TAG = $(shell echo $(VERSION) | awk -F'-' '{if (NF > 1) print $$2; else print ""}' | cut -d'.' -f1))
	$(eval FLAGS += $(shell \
		if [ "$(TAG)" != "" ]; then \
			echo "--tag $(TAG)"; \
		fi \
	))
	@npm publish $(FLAGS) --provenance


test:
	@echo "Running tests..."
	@pnpm exec vitest --dir __tests__ --typecheck.enabled

end-to-end-test:
	@echo "Running end-to-end tests..."
	@pnpm exec vitest e2e/**/*.spec.ts --coverage.enabled=false

format:
	@echo "Format code"
	@pnpm exec dprint fmt