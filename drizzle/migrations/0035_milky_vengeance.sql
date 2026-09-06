-- Custom SQL migration file, put your code below! --
-- 0034 dropped the NOT NULL DEFAULT on profiles target columns via ALTER COLUMN.
-- calories_rest was added later via `ALTER TABLE profiles ADD calories_rest real DEFAULT 1975 NOT NULL`
-- (migration 0033): SQLite/libSQL never physically wrote that default into rows that
-- existed before the ADD COLUMN, it only computed it lazily at read time from the
-- column's schema default. Dropping the default in 0034 exposed those rows as NULL
-- for calories_rest even though every other target column kept its stored value.
-- Restore the effective pre-migration value for any row still carrying its other
-- targets (a genuinely new, targetless profile has every target column null, not
-- just this one, so it is left untouched).
UPDATE `profiles`
SET `calories_rest` = 1975
WHERE `calories_rest` IS NULL
  AND `protein_target` IS NOT NULL
  AND `fat_min` IS NOT NULL
  AND `fat_max` IS NOT NULL
  AND `fat_floor` IS NOT NULL
  AND `carbs_gym` IS NOT NULL
  AND `carbs_rest` IS NOT NULL
  AND `calories_target` IS NOT NULL;
