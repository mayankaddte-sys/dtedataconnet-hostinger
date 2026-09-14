import express from 'express';
import pool from '../config/db.js';
import TABLES from '../backend-lib/tables.js';

const router = express.Router();

function assertKnownTable(table, res) {
  if (!TABLES[table]) {
    res.status(404).json({ error: `Unknown table: ${table}` });
    return false;
  }
  return true;
}

// Serialize JS values for JSON columns before sending to mysql2, and pass
// everything else through untouched (numbers, strings, booleans, null).
function serializeRow(table, row) {
  const { json } = TABLES[table];
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (json.includes(key) && value !== null && value !== undefined) {
      out[key] = JSON.stringify(value);
    } else {
      out[key] = value === undefined ? null : value;
    }
  }
  return out;
}

/* --------------------------------------------------------------------
   GET /api/:table            -> SELECT * FROM table
   GET /api/:table?order=col.asc|desc
   -------------------------------------------------------------------- */
router.get('/:table', async (req, res) => {
  const { table } = req.params;
  if (!assertKnownTable(table, res)) return;

  let sql = `SELECT * FROM \`${table}\``;
  const params = [];

  if (req.query.order) {
    const [col, dir] = String(req.query.order).split('.');
    const safeDir = dir === 'desc' ? 'DESC' : 'ASC';
    // Column name is not user-parameterizable in SQL, so validate it's a
    // real column on this table by checking it's a simple identifier.
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) {
      sql += ` ORDER BY \`${col}\` ${safeDir}`;
    }
  }

  try {
    const [rows] = await pool.query(sql, params);
    res.json({ data: rows, error: null });
  } catch (err) {
    console.error(`GET /${table} failed`, err);
    res.status(500).json({ error: err.message });
  }
});

/* --------------------------------------------------------------------
   POST /api/:table/upsert     body: { rows: [...], onConflict: 'id' }
   -------------------------------------------------------------------- */
router.post('/:table/upsert', async (req, res) => {
  const { table } = req.params;
  if (!assertKnownTable(table, res)) return;

  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.json({ data: [], error: null });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const rawRow of rows) {
      const row = serializeRow(table, rawRow);
      const columns = Object.keys(row);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map((c) => row[c]);
      const updateClause = columns
        .filter((c) => c !== TABLES[table].pk)
        .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
        .join(', ');

      const sql = `
        INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(', ')})
        VALUES (${placeholders})
        ON DUPLICATE KEY UPDATE ${updateClause || columns[0] + ' = VALUES(' + columns[0] + ')'}
      `;
      await conn.query(sql, values);
    }

    await conn.commit();
    res.json({ data: rows, error: null });
  } catch (err) {
    await conn.rollback();
    console.error(`UPSERT ${table} failed`, err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

/* --------------------------------------------------------------------
   DELETE /api/:table?col=eq.value
   DELETE /api/:table?col=neq.value
   (matches storage.ts's .delete().eq(...) / .delete().neq(...))
   -------------------------------------------------------------------- */
router.delete('/:table', async (req, res) => {
  const { table } = req.params;
  if (!assertKnownTable(table, res)) return;

  const filters = [];
  const values = [];

  for (const [key, raw] of Object.entries(req.query)) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) continue;
    const val = String(raw);
    if (val.startsWith('eq.')) {
      filters.push(`\`${key}\` = ?`);
      values.push(val.slice(3));
    } else if (val.startsWith('neq.')) {
      filters.push(`\`${key}\` != ?`);
      values.push(val.slice(4));
    }
  }

  if (filters.length === 0) {
    return res.status(400).json({ error: 'Refusing DELETE with no filters' });
  }

  const sql = `DELETE FROM \`${table}\` WHERE ${filters.join(' AND ')}`;

  try {
    const [result] = await pool.query(sql, values);
    res.json({ data: { affectedRows: result.affectedRows }, error: null });
  } catch (err) {
    console.error(`DELETE ${table} failed`, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
