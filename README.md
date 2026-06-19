# Breezy — User Service

Gère les profils utilisateurs, les relations de suivi (follow/unfollow) et les bannissements pour l'application Breezy.

## Ce que fait ce service

- Synchronisation des profils utilisateurs (créés par l'auth-service à l'inscription)
- Consultation des profils
- Recherche d'utilisateurs par nom
- Follow / unfollow
- Consultation des followers et des abonnements
- Bannissement d'utilisateurs (réservé aux modérateurs et admins, propagé vers l'auth-service)

## Variables d'environnement

Copie `.env.example` en `.env` et remplis les valeurs :

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | Port d'écoute (défaut : 3002) |
| `DATABASE_URL` | URL de connexion PostgreSQL |
| `INTERNAL_SECRET` | Secret partagé pour les appels entre services |
| `AUTH_SERVICE_URL` | URL de l'auth-service |
| `CORS_ORIGIN` | Origine autorisée pour CORS (ex : `http://localhost:3000`) |

> `INTERNAL_SECRET` doit avoir la même valeur dans tous les services.

## Lancer en développement

```bash
npm install
npm run dev
```

Le service tourne sur `http://localhost:3002`.

## Lancer les tests

Assure-toi d'avoir une base PostgreSQL de test (`breezy_users_test`) accessible, puis :

```bash
npm test
```

Les tests utilisent `DATABASE_URL_TEST` si défini, sinon ils se connectent à `localhost:5433/breezy_users_test`.

## Lancer avec Docker

```bash
docker build -t breezy-user .
docker run -p 3002:3002 --env-file .env breezy-user
```

## Endpoints

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/users/sync` | Synchroniser un utilisateur depuis l'auth-service (interne) |
| `GET` | `/users/search?q=` | Rechercher des utilisateurs par nom |
| `GET` | `/users/:id` | Profil d'un utilisateur |
| `GET` | `/users/:id/followers` | Liste des followers |
| `GET` | `/users/:id/following` | Liste des abonnements |
| `POST` | `/users/:id/follow` | Suivre un utilisateur |
| `DELETE` | `/users/:id/follow` | Ne plus suivre un utilisateur |
| `PUT` | `/users/:id/ban` | Bannir un utilisateur (modérateur/admin) |
| `GET` | `/health` | Vérification que le service est up |

### Headers requis (routes protégées)

Les routes protégées attendent ces headers, normalement ajoutés par la gateway :

| Header | Description |
|---|---|
| `x-user-id` | UUID de l'utilisateur connecté |
| `x-user-role` | Rôle (`user`, `moderator`, `admin`) |
| `x-user-username` | Nom d'utilisateur |

### Header interne

L'endpoint `/users/sync` requiert le header `x-internal-secret` avec la valeur de `INTERNAL_SECRET`.

## Structure du projet

```
src/
├── config/       # Connexion base de données (Sequelize)
├── controllers/  # Logique métier
├── middleware/   # Identité (extraction des headers)
├── models/       # Modèles Sequelize (UserProfile, Follow)
└── routes/       # Définition des routes
tests/
└── user.test.js  # Tests d'intégration
```
