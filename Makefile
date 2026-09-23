up:
	docker compose up -d
migrate-fresh-seed:
	docker compose exec api php artisan migrate:fresh --seed --force
down:
	docker compose down
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