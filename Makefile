up:
	export WWWGROUP=$$(id -g) WWWUSER=$$(id -u) && docker-compose up
migrate-fresh-seed:
	./backend/vendor/bin/sail artisan migrate:fresh --seed --force
down:
	docker compose down
composer-install:
	docker run --rm \
		   -u "$(id -u):$(id -g)" \
		   -v "./backend/:/var/www/html" \
		   -w /var/www/html \
		   laravelsail/php84-composer:latest \
		   composer install --ignore-platform-reqs
build:
	export WWWGROUP=$$(id -g) WWWUSER=$$(id -u) && docker-compose up --build
clone-http:
	git clone https://github.com/Kouameanaset/Sheet-Happens-Api.git backend
	git clone https://github.com/Kouameanaset/Sheet-Happens-Frontend.git frontend
clone-ssh:
	git clone git@github.com:Kouameanaset/Sheet-Happens-Api.git backend
	git clone git@github.com:Kouameanaset/Sheet-Happens-Frontend.git frontend
