-- Adds JD-to-ITI forwarding support to an already-deployed database.
-- Safe to run once; if you're setting up MySQL fresh, schema.sql already
-- includes this column and you don't need this file.
--
-- Run via phpMyAdmin (SQL tab) or:
--   mysql -u <user> -p <database> < seed/migrations/001_add_forward_log.sql

ALTER TABLE requisitions
  ADD COLUMN forward_log JSON DEFAULT NULL AFTER google_form_config;
