-- Toda tabla de public debe tener RLS activado. Si alguien crea una tabla y se
-- olvida, este test falla.
begin;
create extension if not exists pgtap with schema extensions;
select plan(1);

select is(
  array(
    select c.relname::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    order by 1
  ),
  array[]::text[],
  'Todas las tablas de public tienen RLS activado'
);

select * from finish();
rollback;
