# Demo Flow

> Boilerplate placeholder — fill in once a scripted demo exists.

## Accounts

The backend seeds one in-memory user per role (see `SecurityConfig.userDetailsService`). Username is the lowercased role name, password is `dice-demo` for all of them:

| Username | Role |
|---|---|
| `sales_rep` | SALES_REP |
| `sales_manager` | SALES_MANAGER |
| `finance` | FINANCE |
| `operations` | OPERATIONS |
| `admin` | ADMIN |
| `customer` | CUSTOMER |

## Suggested walkthrough (TODO: flesh out)

1. Log in as `sales_rep`, create a deal.
2. Push the discount past policy via the negotiations screen.
3. Log in as `sales_manager`, clear the resulting approval.
4. Run the `oeeg/scenarios/inventory-change.json` scenario and observe the fulfillment re-plan.
5. Log in as `finance`, draft the invoice once fulfilled.

## Running the emulator

```
docker compose --profile emulator up oeeg
```

TODO: OEEG's scenario runner is currently a stub (`ScenarioRunner.run` throws `UnsupportedOperationException`) — wire it up before relying on this.
