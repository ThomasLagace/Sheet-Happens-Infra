up:
	docker compose up -d
# Create missing .env files (infra/frontend/backend), then start the stack.
# Use PowerShell directly: Chocolatey make on Windows runs recipes via cmd.exe,
# where `command -v` produces "-v was unexpected at this time".
ensure-env:
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ensure-env.ps1
up-dev: ensure-env
	docker compose up -d
migrate-fresh-seed:
	docker compose exec api php artisan migrate:fresh --seed --force
down:
	docker compose down
# From-scratch smoke: wipe volumes, rebuild, wait, assert (PowerShell).
smoke-from-scratch:
	docker compose down -v --remove-orphans
	docker compose up -d --build
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/assert-stack.ps1
smoke:
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/assert-stack.ps1
# composer-install: \
	docker run --rm \
		   -u "$(id -u):$(id -g)" \
		   -v "./backend/:/var/www/html" \
		   -w /var/www/html \
		   laravelsail/php84-composer:latest \
		   composer install --ignore-platform-reqs
build:
	docker-compose up --build
clone-http:
	git clone https://github.com/Kouameanaset/Sheet-Happens-Api.git backend
	git clone https://github.com/Kouameanaset/Sheet-Happens-Frontend.git frontend
clone-ssh:
	git clone git@github.com:Kouameanaset/Sheet-Happens-Api.git backend
	git clone git@github.com:Kouameanaset/Sheet-Happens-Frontend.git frontend
php:
	docker compose exec api php $(filter-out $@, $(MAKECMDGOALS))

%:
	@: