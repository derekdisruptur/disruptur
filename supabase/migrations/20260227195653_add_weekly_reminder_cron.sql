-- Enable pg_cron and pg_net extensions (idempotent)
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Grant usage so pg_cron can invoke pg_net
grant usage on schema cron to postgres;
grant usage on schema extensions to postgres;

-- Schedule weekly unfinished stories reminder
-- Runs at 2:00 AM UTC every Monday (= 9:00 PM EST Sunday)
select cron.schedule(
  'weekly-unfinished-reminders',
  '0 2 * * 1',
  $$
  select net.http_post(
    url := 'https://vkkmfttatyluagmxgcci.supabase.co/functions/v1/send-unfinished-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
