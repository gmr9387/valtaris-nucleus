-- member_accumulators' PK was (member_id, plan_year) -- two different
-- tenants whose member IDs happen to collide would silently overwrite
-- each other's accumulator data. Table has 0 rows (confirmed before
-- this migration), so widening the PK is free.
alter table member_accumulators drop constraint member_accumulators_pkey;
alter table member_accumulators add primary key (member_id, plan_year, organization_id);
