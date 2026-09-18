# Infrastructure expectations

This repository is designed to run as a small containerized stack with a Laravel API backend and a Vite + React frontend behind a single Nginx reverse proxy.

## Required prerequisites

- The `make` command must be installed on the host machine.
- The Docker daemon must be running before any project startup step.
- Docker Compose support must be available through the local Docker installation.
- The project repositories must be cloned before the stack is started.

## Expected startup order

The infrastructure is expected to be started in this exact order:

1. `make clone-http`
   - Clones the backend repository into `backend/`.
   - Clones the frontend repository into `frontend/`.
2. `make composer-install`
   - Installs PHP dependencies for the Laravel backend using the Laravel Sail Composer image.
3. `make up`
   - Starts the Docker services defined in `docker-compose.yml`.

This order matters because the backend container expects the application code and Composer dependencies to already be present before the stack is brought up.

## Container traffic flow

All traffic between the containers is meant to pass through the Nginx service named `web-server` in `docker-compose.yml`.

- `web-server` is the public entry point and listens on port `80`.
- `docker/nginx/default.conf` defines the reverse-proxy rules.
- `/` is routed to the Vite + React frontend service.
- `/api` is routed to the Laravel backend service.

In other words:

- Browser request to `/` -> frontend service
- Browser request to `/api` -> Laravel API service

`web-server` should be the only ingress point for application traffic; direct frontend-to-backend communication is not the intended setup.

## Laravel backend contract

The Laravel project is intended to function as an API service, not as a standard web application.

- The backend should not be used as a server-rendered website.
- It should not rely on browser-facing web routes as its primary purpose.
- The API should be exposed through the `/api` path via the Nginx reverse proxy.
- Web routes such as Blade views or a root page are not part of the expected architecture and should be avoided unless they are strictly temporary development scaffolding.

The expected design is: Laravel is an API-only backend behind Nginx, while the frontend provides the user interface.

## Frontend host policy

The Vite + React frontend must be as restrictive as possible regarding allowed hosts.

- It should not allow arbitrary external hostnames.
- Only the minimal host values required for the local Docker/Nginx setup should be accepted.
- The frontend must be reachable through the proxy and should not be configured with broad wildcard host access.

In short, the stack should be intentionally narrow and local: Nginx handles the public entry point, `/api` goes to Laravel, `/` goes to the frontend, and the frontend host configuration is kept as limited as possible.

## Operational summary

The intended runtime behavior is:

- Ensure `make` is installed.
- Ensure Docker is running.
- Run `make clone-http`.
- Run `make composer-install`.
- Run `make up`.
- Access the project through the Nginx reverse proxy on port `80`.
- Use `/api` for Laravel API traffic and `/` for the Vite + React frontend.

This stack is designed to run as a minimal, local infrastructure setup where the reverse proxy is the central traffic router and the backend remains API-focused.
