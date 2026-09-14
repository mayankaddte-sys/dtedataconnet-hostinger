/**
 * Converts Supabase (Postgres) `INSERT INTO "public"."table" (...) VALUES (...);`
 * dump files into MySQL-compatible INSERT statements.
 *
 * Handles the Postgres-specific bits that don't exist in MySQL:
 *   - ARRAY['a','b',...]        -> JSON array text: '["a","b",...]'
 *   - true / false              -> 1 / 0
 *   - '' inside a string        -> ' (Postgres escaping) -> converted, then
 *                                   re-escaped the MySQL way on output
 *
 * USAGE:
 *   1. Put your exported *_rows.sql files in backend/seed/raw/
 *      (same filenames Supabase's table editor exports, e.g.
 *      requisitions_rows.sql, field_units_rows.sql, etc.)
 *   2. node seed/convert-supabase-dump.js
 *   3. Converted files land in backend/seed/converted/
 *      Import these into phpMyAdmin AFTER schema.sql, in this order:
 *        directorate_desks -> field_units -> app_credentials
 *        -> requisitions -> submissions -> extension_requests
 *        -> defaulter_notices
 *      (parents before children, since foreign keys point that way)
 */

const fs = require('fs');
const path = require('path');

const RAW_DIR = path.join(__dirname, 'raw');
const OUT_DIR = path.join(__dirname, 'converted');

// Which columns are JSON-typed in MySQL for each table (must match schema.sql)
const JSON_COLUMNS = {
  requisitions: [
    'target_zones',
    'target_districts',
    'target_unit_ids',
    'custom_fields',
    'google_sheet_config',
    'google_form_config'
  ],
  submissions: ['data']
};

function splitTopLevel(str, openChars, closeChars) {
  const result = [];
  let depth = 0;
  let inString = false;
  let current = '';

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (inString) {
      current += ch;
      if (ch === "'") {
        if (str[i + 1] === "'") {
          current += "'";
          i++;
        } else {
          inString = false;
        }
      }
      continue;
    }

    if (ch === "'") {
      inString = true;
      current += ch;
      continue;
    }
    if (openChars.includes(ch)) {
      depth++;
      current += ch;
      continue;
    }
    if (closeChars.includes(ch)) {
      depth--;
      current += ch;
      continue;
    }
    if (ch === ',' && depth === 0) {
      result.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim().length) result.push(current);
  return result.map((s) => s.trim());
}

function unquote(raw) {
  let s = raw.trim();
  if (s.startsWith("'") && s.endsWith("'")) {
    s = s.slice(1, -1);
  }
  return normalizeTimestamp(s.replace(/''/g, "'"));
}

// Postgres exports timestamps like '2026-09-11 07:33:54.04771+00'.
// MySQL DATETIME doesn't accept a timezone suffix, and its fractional
// seconds max out at 6 digits — strip the tz offset and clamp precision.
function normalizeTimestamp(s) {
  const m = s.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})(\.\d+)?([+-]\d{2}(:?\d{2})?|Z)?$/);
  if (!m) return s;
  let result = m[1];
  if (m[2]) result += m[2].slice(0, 7); // '.' + up to 6 digits
  return result;
}

function convertValue(raw) {
  const v = raw.trim();
  if (/^null$/i.test(v)) return null;
  if (/^true$/i.test(v)) return 1;
  if (/^false$/i.test(v)) return 0;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);

  if (/^ARRAY\s*\[/i.test(v)) {
    const inner = v.slice(v.indexOf('[') + 1, v.lastIndexOf(']'));
    if (!inner.trim()) return JSON.stringify([]);
    const items = splitTopLevel(inner, '([', ')]');
    const arr = items.map((it) => unquote(it));
    return JSON.stringify(arr);
  }

  if (v.startsWith("'") && v.endsWith("'")) {
    return unquote(v);
  }

  return v; // fallback: pass through raw (unquoted identifiers, edge cases)
}

function toSqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return "'" + String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

function parseInsertFile(text) {
  const headerMatch = text.match(/INSERT INTO "public"\."(\w+)"\s*\(([^)]*)\)\s*VALUES/i);
  if (!headerMatch) {
    throw new Error('Could not find INSERT INTO "public"."table" (...) VALUES header');
  }
  const table = headerMatch[1];
  const columns = headerMatch[2].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));

  const afterValues = text.slice(headerMatch.index + headerMatch[0].length);
  const tuplesBlob = afterValues.replace(/;\s*$/, '').trim();

  const rowStrings = splitTopLevel(tuplesBlob, '(', ')');
  const rows = rowStrings.map((rowStr) => {
    const inner = rowStr.trim().replace(/^\(/, '').replace(/\)$/, '');
    const rawValues = splitTopLevel(inner, '([', ')]');
    return rawValues.map(convertValue);
  });

  return { table, columns, rows };
}

function buildMysqlInsert(table, columns, rows, batchSize = 100) {
  const jsonCols = new Set(JSON_COLUMNS[table] || []);
  const statements = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const valuesSql = batch
      .map((row) => {
        const literals = row.map((val, idx) => {
          const col = columns[idx];
          if (jsonCols.has(col) && val !== null && typeof val === 'string') {
            // already a JSON string (from ARRAY[] conversion or original jsonb text) — keep as-is
            return toSqlLiteral(val);
          }
          return toSqlLiteral(val);
        });
        return `(${literals.join(', ')})`;
      })
      .join(',\n  ');

    statements.push(
      `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(', ')})\nVALUES\n  ${valuesSql}\nON DUPLICATE KEY UPDATE \`${columns[0]}\` = VALUES(\`${columns[0]}\`);`
    );
  }

  return statements.join('\n\n');
}

function main() {
  if (!fs.existsSync(RAW_DIR)) {
    console.error(`Missing input folder: ${RAW_DIR}`);
    console.error('Create it and put your *_rows.sql export files inside, then rerun.');
    process.exit(1);
  }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.sql'));
  if (files.length === 0) {
    console.error(`No .sql files found in ${RAW_DIR}`);
    process.exit(1);
  }

  for (const file of files) {
    const fullPath = path.join(RAW_DIR, file);
    const text = fs.readFileSync(fullPath, 'utf8');
    try {
      const { table, columns, rows } = parseInsertFile(text);
      const sql = buildMysqlInsert(table, columns, rows);
      const outPath = path.join(OUT_DIR, `${table}.sql`);
      fs.writeFileSync(outPath, sql + '\n', 'utf8');
      console.log(`Converted ${file} -> converted/${table}.sql (${rows.length} rows)`);
    } catch (err) {
      console.error(`Failed to convert ${file}: ${err.message}`);
    }
  }

  console.log('\nDone. Import order (respect foreign keys):');
  console.log('  1. directorate_desks.sql');
  console.log('  2. field_units.sql');
  console.log('  3. app_credentials.sql');
  console.log('  4. requisitions.sql');
  console.log('  5. submissions.sql');
  console.log('  6. extension_requests.sql (if present)');
  console.log('  7. defaulter_notices.sql');
}

main();
