# Sheet-Happens-Infra

Ce dépôt regroupe le backend et le frontend des applications. Il
permet que les deux projet soit sous le même sous réseau. Son but
est aussi de permettre de rouler le projet avec une seule commande
globalement.

## Getting started

### Prérequis

Avoir la commande `make` et `docker-compose` d'installées.

### Rouler le projet

1. Copier le fichier `.env.development` dans `.env` (`cp .env.development .env`)
2. Pour rouler ce dépôt il faut utiliser `make clone-http` ou
   `make clone-ssh`, sur windows utiliser les scripts `./clone-http.ps1`
   et `./clone-ssh.ps1`.
3. Exécuter la commande `make composer-install`
4. Exécuter la commande `make up`
