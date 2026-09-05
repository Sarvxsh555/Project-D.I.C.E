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

Everything runs directly on the host — no Docker.

- MySQL 8.0+, running locally
- Java 21 / Maven wrapper (bundled — no local Maven install needed)
- Node 22+

## Quick start

1. Create the database and a dedicated user (once):

   ```sql
   CREATE DATABASE dice CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'dice'@'localhost' IDENTIFIED BY 'dice_local_pw';
   GRANT ALL PRIVILEGES ON dice.* TO 'dice'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. One-time server setting, required for the `updated_at` triggers V13 creates
   (MySQL refuses to let a non-SUPER user create triggers while binary logging
   is on, unless this is set):

   ```sql
   SET GLOBAL log_bin_trust_function_creators = 1;
   ```

   This does **not** survive a MySQL service restart unless added to
   `my.ini`'s `[mysqld]` section (`log_bin_trust_function_creators=1`) —
   editing that file needs admin rights. If the backend fails to start after
   a MySQL restart with error 1419, re-run the `SET GLOBAL` above.

3. Copy the env template and start each service in its own terminal:

   ```bash
   cp .env.example .env

   # Backend — applies Flyway migrations + seed data on first run
   cd backend && ./mvnw spring-boot:run

   # Frontend
   cd frontend && npm install && npm run dev

   # OEEG (optional — Odoo event emulator)
   cd oeeg && ./mvnw spring-boot:run
   ```

- Frontend: http://localhost:5173
- Backend: http://localhost:8080 (health at `/actuator/health`)
- MySQL: localhost:3306

Demo accounts are seeded automatically under the `dev` Spring profile — see
[docs/demo-flow.md](./docs/demo-flow.md) for usernames (password `dice-demo`
for all of them).

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
