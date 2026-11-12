-- When each recipe was last opened, in milliseconds since the epoch; null
-- until it is first viewed. Usage data only, so backups leave it out.
ALTER TABLE recipes ADD COLUMN viewed_at INTEGER;
