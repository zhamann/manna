CREATE TABLE sections (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (name <> '')
);

CREATE TABLE recipes (
  id INTEGER PRIMARY KEY,
  section_id INTEGER NOT NULL REFERENCES sections (id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (title <> ''),
  description TEXT NOT NULL DEFAULT '',
  servings TEXT NOT NULL DEFAULT '',
  prep_time TEXT NOT NULL DEFAULT '',
  cook_time TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  ingredients TEXT NOT NULL DEFAULT '[]',
  steps TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX recipes_section_id ON recipes (section_id);
