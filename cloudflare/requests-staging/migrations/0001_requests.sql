CREATE TABLE staging_requests (
  id TEXT PRIMARY KEY NOT NULL,
  requester TEXT NOT NULL,
  type TEXT NOT NULL,
  sector TEXT NOT NULL,
  reason TEXT NOT NULL CHECK(length(reason) BETWEEN 10 AND 5000),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL CHECK(end_date >= start_date),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  decision TEXT NOT NULL DEFAULT 'pending' CHECK(decision IN ('pending','accepted','rejected')),
  responded_by TEXT,
  responded_at TEXT,
  CHECK ((decision = 'pending' AND responded_by IS NULL AND responded_at IS NULL)
      OR (decision <> 'pending' AND responded_by IS NOT NULL AND responded_at IS NOT NULL))
);
CREATE INDEX staging_requests_sector ON staging_requests(sector, created_at DESC);
CREATE INDEX staging_requests_requester ON staging_requests(requester, created_at DESC);
