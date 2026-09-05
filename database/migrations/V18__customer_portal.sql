-- Login identity for the customer portal — maps the authenticated JWT subject
-- to the customer row they own. Null for customers with no portal access.

ALTER TABLE customers ADD COLUMN portal_username VARCHAR(128) UNIQUE;
