.DEFAULT_GOAL := help

DOCKER_PLAYWRIGHT=@docker compose run --rm playwright
DOCKER_PLAYWRIGHT_CMD=docker compose run --rm playwright
TARGET_HEADER=@printf '===== \033[34m%s\033[0m\n' $@

.PHONY: docker-build
docker-build: ## Builds the Node.js Docker image
	$(TARGET_HEADER)
	docker build -t vue-match-3-game-node ./docker/

.PHONY: tests
tests: tests.playwright ## Executes all tests

.PHONY: tests.playwright
tests.playwright: ## Executes Playwright tests (example: make tests.playwright cli="tests/playwright/game.spec.ts")
	$(TARGET_HEADER)
	@docker compose up -d node

ifdef cli
	@echo "$(DOCKER_PLAYWRIGHT_CMD) yarn test:playwright $(cli)"
	$(DOCKER_PLAYWRIGHT) yarn test:playwright $(cli)
else
	@echo "$(DOCKER_PLAYWRIGHT_CMD) yarn test:playwright"
	$(DOCKER_PLAYWRIGHT) yarn test:playwright
endif

.PHONY: help
help: ## Shows command help
	@set -eu; \
	if [ -t 1 ] && [ -z "$${CI:-}" ] && [ -z "$${NO_COLOR:-}" ]; then \
		C_TGT="$$(printf '\033[34m')"; \
		C_RST="$$(printf '\033[0m')"; \
	else \
		C_TGT=''; C_RST=''; \
	fi; \
	awk -v c_tgt="$$C_TGT" -v c_rst="$$C_RST" 'BEGIN { FS = ":.*## "; printf "Usage:\n  make <target> [cli=\"arguments\"]\n\nTargets:\n" } /^[a-zA-Z0-9_.-]+:.*## / { printf "  %s%-20s%s %s\n", c_tgt, $$1, c_rst, $$2 }' $(MAKEFILE_LIST)
