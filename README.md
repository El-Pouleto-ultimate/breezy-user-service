# Breezy: user service

User profiles for [Breezy](https://github.com/El-Pouleto-ultimate/breezy-infra), a Twitter-like social network
built as microservices: a profile for every account created by the auth service, user search, follow and
unfollow with follower and following counters, follower lists, and bans by moderators and admins, passed on to
the auth service. Following someone sends them a notification through the profil service.

Team project at CESI École d'Ingénieurs (distributed applications, June 2026).

Stack: Node.js 20, Express 5, Sequelize 6 on PostgreSQL, axios, express-validator.

## API

| Method | Path | Access |
|---|---|---|
| POST | `/users/sync` | internal |
| GET | `/users/search` | signed in |
| GET | `/users/by-username/:username` | public |
| GET | `/users/:id` | signed in |
| GET | `/users/:id/followers` | signed in |
| GET | `/users/:id/following` | signed in |
| POST | `/users/:id/follow` | signed in |
| DELETE | `/users/:id/follow` | signed in |
| PUT | `/users/:id/ban` | moderator or admin |
| GET | `/health` | public |

"Signed in" routes read the `x-user-id` and `x-user-role` headers that the gateway sets once it has checked the
JWT. "Internal" routes require the `x-internal-secret` header shared by the services.

## Configuration

Copy `.env.example` to `.env`. Variables: `PORT`, `DATABASE_URL`, `INTERNAL_SECRET`, `AUTH_SERVICE_URL`,
`PROFIL_SERVICE_URL`, `CORS_ORIGIN`.

## Run and test

The whole stack runs with Docker Compose from [breezy-infra](https://github.com/El-Pouleto-ultimate/breezy-infra).
On its own:

```bash
npm install
npm run dev     # or: npm start
npm test        # 13 integration tests (Jest + supertest) against PostgreSQL
```

GitHub Actions runs the tests against PostgreSQL 15 on every push and pull request
([`ci.yml`](.github/workflows/ci.yml)).

## Team

[Estebge](https://github.com/Estebge), [haguetm](https://github.com/haguetm),
[Jessica14112005](https://github.com/Jessica14112005), [Tuture57](https://github.com/Tuture57).
