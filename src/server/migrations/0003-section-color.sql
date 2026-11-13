-- Each section's color: one of the hue names in src/lib/hues.ts. Existing
-- sections take turns through that rotation in the order the sidebar lists
-- them, so neighbors differ.
ALTER TABLE sections ADD COLUMN color TEXT NOT NULL DEFAULT 'orange';

UPDATE sections SET color = (
  SELECT CASE n % 8
    WHEN 0 THEN 'orange'
    WHEN 1 THEN 'blue'
    WHEN 2 THEN 'green'
    WHEN 3 THEN 'rose'
    WHEN 4 THEN 'honey'
    WHEN 5 THEN 'violet'
    WHEN 6 THEN 'teal'
    ELSE 'tomato'
  END
  FROM (
    SELECT count(*) AS n FROM sections AS earlier
    WHERE earlier.name COLLATE NOCASE < sections.name COLLATE NOCASE
  )
);
