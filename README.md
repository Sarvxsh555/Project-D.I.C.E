# D.I.C.E

Deal Intelligence & Compliance Engine — evaluates sales quotations against
configurable commercial policy (discount limits, margin floors, credit
exposure, ...) and routes what needs a human decision to the right approver.

## Layout

```
frontend/    React + TypeScript SPA (Vite, Tailwind, React Router, TanStack Query)
backend/     Spring Boot API — deal lifecycle, decision engines, persistence
database/    Flyway migrations + seed data, consumed by the backend
oeeg/        Odoo Event Emulation Gateway — replays scenarios against the
             backend webhook so the stack runs without a real Odoo instance
docs/        Architecture, API, event contract, and demo-flow notes
```

See [docs/architecture.md](./docs/architecture.md) for how the pieces fit
together.

## Prerequisites

- Docker + Docker Compose
- Java 21 / Maven wrapper (bundled — no local Maven install needed)
- Node 22+

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8080 (health at `/actuator/health`)
- MySQL: localhost:3306 (database: `dealflow360`)

Demo accounts are seeded automatically under the `dev` Spring profile — see
[docs/demo-flow.md](./docs/demo-flow.md) for usernames (password `dice-demo`
for all of them).

To also run the Odoo event emulator:

```bash
docker compose --profile emulator up
```

## Running services individually

```bash
# Backend
cd backend && ./mvnw spring-boot:run

# Frontend
cd frontend && npm install && npm run dev

# OEEG
cd oeeg && ./mvnw spring-boot:run
```

## Status

This is a scaffolded boilerplate: the backend's domain model, engines,
services, controllers, and schema are wired end-to-end and compile/build
cleanly. The frontend and OEEG are structural skeletons (routing, service
clients, and package layout in place) with page/feature logic still to be
implemented — see the `TODO` comments throughout `frontend/src` and
`oeeg/src`.

## License

MIT — see [LICENSE](./LICENSE). Placeholder; confirm the actual licensing
terms for this project before treating it as final.
