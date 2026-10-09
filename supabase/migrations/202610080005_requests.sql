BEGIN;
ALTER TABLE tickets ADD COLUMN request_type text, ADD COLUMN request_start_date date, ADD COLUMN request_end_date date, ADD CONSTRAINT request_dates_valid CHECK(request_end_date>=request_start_date);
-- An endpoint is supplied by the browser. Restrict it to known HTTPS push providers.
ALTER TABLE push_subscriptions ADD CONSTRAINT trusted_push_endpoint CHECK(endpoint ~ '^https://([a-z0-9-]+\.)*(push\.services\.mozilla\.com|fcm\.googleapis\.com|web\.push\.apple\.com|notify\.windows\.com|wns\.windows\.com)/');
COMMIT;
