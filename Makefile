SHELL := /bin/bash
COMMIT_SHA_SHORT ?= $(shell git rev-parse --short=12 HEAD)
PWD_DIR := ${CURDIR}

default: help;
mkfile_path := $(abspath $(lastword $(MAKEFILE_LIST)))
current_dir := $(notdir $(patsubst %/,%,$(dir $(mkfile_path))))
ROOT_DIR:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

# ======================================================================================

##@ Build
build: ## builds the web UI and packages it (use VERSION=v1.2.3 or defaults to commit-SNAPSHOT)
	@echo "Building web UI..."
	@cd webui && make build
	@echo "Creating package..."
	@mkdir -p dist
	@VERSION=$${VERSION:-$(COMMIT_SHA_SHORT)-SNAPSHOT} && \
	PACKAGE_NAME="nanoSmart-$$VERSION" && \
	mkdir -p "dist/$$PACKAGE_NAME/cron" && \
	mkdir -p "dist/$$PACKAGE_NAME/webui" && \
	cp -r webui/dist/assets "dist/$$PACKAGE_NAME/webui/" && \
	cp -r webui/dist/icons "dist/$$PACKAGE_NAME/webui/" && \
	cp webui/dist/index.html "dist/$$PACKAGE_NAME/webui/" && \
	cp -r cron/smart_monitor.conf "dist/$$PACKAGE_NAME/cron/smart_monitor.conf" && \
	cp -r cron/smart_monitor.sh "dist/$$PACKAGE_NAME/cron/smart_monitor.sh" && \
	cp LICENSE "dist/$$PACKAGE_NAME/" && \
	cp README.md "dist/$$PACKAGE_NAME/" && \
	cd dist && zip -r "$$PACKAGE_NAME.zip" "$$PACKAGE_NAME/" && \
	rm -rf "$$PACKAGE_NAME" && \
	echo "Package created: dist/$$PACKAGE_NAME.zip" && \
	echo "Package size: $$(du -h "$$PACKAGE_NAME.zip" | cut -f1)"

clean: ## clean the build environment
	@rm -rf ./dist

##@ Release

check_env: # check for needed envs
ifndef GITHUB_TOKEN
	$(error GITHUB_TOKEN is undefined, create one with repo permissions here: https://github.com/settings/tokens/new?scopes=repo,write%3Apackages )
endif
	@[ "${version}" ] || ( echo ">> version is not set, usage: make release version=\"v1.2.3\" "; exit 1 )
	@which jq > /dev/null || ( echo ">> jq is not installed. Please install jq for JSON parsing."; exit 1 )

.PHONY: check-git-clean
check-git-clean: # check if git repo is clen
	@git diff --quiet

.PHONY: check-branch
check-branch:
	@current_branch=$$(git symbolic-ref --short HEAD) && \
	if [ "$$current_branch" != "main" ]; then \
		echo "Error: You are on branch '$$current_branch'. Please switch to 'main'."; \
		exit 1; \
	fi


release: check_env check-branch check-git-clean  ## release a new version, call with version="v1.2.3", make sure to have valid GH token
	@[ "${version}" ] || ( echo ">> version is not set, usage: make release version=\"v1.2.3\" "; exit 1 )
	@echo "Building release package for version $(version)..."
	@VERSION=$(version) make build
	@echo "Creating GitHub release..."
	@git tag -d $(version) || true
	@git tag -a $(version) -m "Release version: $(version)"
	@git push --delete origin $(version) || true
	@git push origin $(version) || true
	@echo "Creating GitHub release..."
	@RELEASE_ID=$$(curl -s -H "Authorization: token $(GITHUB_TOKEN)" \
		-H "Accept: application/vnd.github.v3+json" \
		-X POST \
		-d '{"tag_name":"$(version)","name":"Release $(version)","body":"Release version $(version)","draft":false,"prerelease":false}' \
		"https://api.github.com/repos/ansible-autobott/nanoSmart/releases" | \
		jq -r '.id') && \
	if [ "$$RELEASE_ID" = "null" ] || [ -z "$$RELEASE_ID" ]; then \
		echo "Error: Could not create release for tag $(version)"; \
		exit 1; \
	fi && \
	echo "Release created with ID: $$RELEASE_ID" && \
	echo "Uploading release assets..." && \
	curl -s -H "Authorization: token $(GITHUB_TOKEN)" \
		-H "Accept: application/vnd.github.v3+json" \
		-H "Content-Type: application/zip" \
		--data-binary @dist/nanoSmart-$(version).zip \
		"https://uploads.github.com/repos/ansible-autobott/nanoSmart/releases/$$RELEASE_ID/assets?name=nanoSmart-$(version).zip" && \
	echo "Release $(version) created and asset uploaded successfully!"


##@ Help
.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
