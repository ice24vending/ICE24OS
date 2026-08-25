-- Phase 1 infrastructure capability only. Domain tables are introduced in later phases.
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
