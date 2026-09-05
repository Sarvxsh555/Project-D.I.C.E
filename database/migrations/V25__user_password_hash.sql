-- Real authentication: users.password_hash backs a DB-driven UserDetailsService,
-- replacing SecurityConfig's in-memory demo account store. Nullable because
-- existing seeded profile rows have none yet — DiceUserDetailsService treats a
-- null hash as "cannot authenticate" (fails closed) rather than crashing.
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
