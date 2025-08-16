COMMIT_SHA_SHORT ?= $(shell git rev-parse --short=12 HEAD)
PWD_DIR := ${CURDIR}

default: help

prepare: ## run dev preparation
	@npm install

fmt: ## format code
	@npm run format

lint: ## run eslint
	@npm run lint

run: ## run the local dev
	@npm run dev

build: ## build a production release
	@npm run build

dependencies: ## check unused dependencies
	@npx npm-check

update: ## check updates and update packages
	@npm install -g npm-check-updates && \
     ncu -u

#==========================================================================================
#  Help
#==========================================================================================
.PHONY: help
help: # Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
