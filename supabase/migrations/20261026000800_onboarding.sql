-- =============================================================================
-- TWJ · 0800 · Onboarding: cuestionario de salud configurable y avisos de cambios
-- solo después de completar la ficha (rellenarla por primera vez no es "cambio").
-- =============================================================================

create or replace function public.track_client_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client uuid;
  v_onboarded timestamptz;
  v_old jsonb;
  v_new jsonb;
  k text;
begin
  if auth.uid() is null or public.is_staff() then
    return new;
  end if;

  if tg_table_name = 'profiles' then
    select c.id, c.onboarding_completed_at into v_client, v_onboarded from public.clients c where c.profile_id = new.id;
  else
    select c.id, c.onboarding_completed_at into v_client, v_onboarded from public.clients c where c.id = new.client_id;
  end if;
  if v_client is null or v_onboarded is null then
    return new;
  end if;

  v_old := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  v_new := to_jsonb(new);

  for k in select jsonb_object_keys(v_new) loop
    continue when k in ('updated_at', 'created_at', 'client_id', 'id', 'theme', 'avatar_path', 'timezone');
    if (v_new -> k) is distinct from (v_old -> k) then
      insert into public.profile_changes (client_id, changed_by, table_name, field, old_value, new_value)
      values (v_client, auth.uid(), tg_table_name, k, v_old -> k, v_new -> k);
    end if;
  end loop;

  return new;
end;
$$;

-- Cuestionario de salud basado en las preguntas generales del PAR-Q+.
-- TODO(legal): verificar contra la versión oficial en español del PAR-Q+ y su
-- aviso de copyright antes de producción. Editable desde el panel.
insert into public.settings (key, value, is_public, description) values
  ('health_screening.questions', '{
    "version": "2026-10-parq-draft",
    "intro": "Antes de empezar, 7 preguntas rápidas sobre tu salud. Si respondes que sí a alguna, no pasa nada: Jaime lo tendrá en cuenta y te recomendamos consultarlo con tu médico antes de subir la intensidad.",
    "questions": [
      {"key": "heart_condition", "label": "¿Algún médico te ha dicho alguna vez que tienes un problema de corazón o la tensión alta?"},
      {"key": "chest_pain", "label": "¿Sientes dolor en el pecho en reposo, en tu día a día o al hacer actividad física?"},
      {"key": "dizziness", "label": "¿Pierdes el equilibrio por mareos o has perdido el conocimiento en los últimos 12 meses? (Responde que no si el mareo fue por respirar muy rápido, también durante ejercicio intenso)."},
      {"key": "chronic_condition", "label": "¿Te han diagnosticado alguna otra enfermedad crónica (distinta de corazón o tensión alta)?"},
      {"key": "medication", "label": "¿Tomas actualmente medicación prescrita para alguna enfermedad crónica?"},
      {"key": "musculoskeletal", "label": "¿Tienes (o has tenido en los últimos 12 meses) algún problema de huesos, articulaciones o tejidos blandos que pueda empeorar si haces más actividad física?"},
      {"key": "supervised_only", "label": "¿Algún médico te ha dicho que solo debes hacer actividad física supervisada por un profesional sanitario?"}
    ],
    "disclaimer": "Train with Jaime no sustituye el consejo médico. Si tienes dudas sobre tu salud, consulta con un profesional sanitario."
  }', true, 'Cuestionario de salud inicial (tipo PAR-Q). Editable.')
on conflict (key) do nothing;
