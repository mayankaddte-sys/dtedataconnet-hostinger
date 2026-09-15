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

  const pk = TABLES[table].pk;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const rawRow of rows) {
      const row = serializeRow(table, rawRow);
      const columns = Object.keys(row);
      const values = columns.map((c) => row[c]);

      // Decide insert-vs-update by looking the row up by PRIMARY KEY only.
      // We used to do a single `INSERT ... ON DUPLICATE KEY UPDATE`, but
      // MySQL fires that clause on a collision with *any* unique key on the
      // table (e.g. requisitions.requisition_number), not just the pk we
      // actually intend to match on. That let a coincidental collision on a
      // different unique column silently overwrite an unrelated existing
      // row's data while leaving that row's original id untouched - so the
      // row the caller thought it just inserted never actually existed.
      // Matching by pk here, and letting any other unique-constraint
      // violation surface as a real error below, avoids that corruption.
      const [existing] = await conn.query(
        `SELECT 1 FROM \`${table}\` WHERE \`${pk}\` = ? LIMIT 1`,
        [row[pk]]
      );

      if (existing.length > 0) {
        const updateCols = columns.filter((c) => c !== pk);
        if (updateCols.length > 0) {
          const setClause = updateCols.map((c) => `\`${c}\` = ?`).join(', ');
          const updateValues = updateCols.map((c) => row[c]);
          await conn.query(
            `UPDATE \`${table}\` SET ${setClause} WHERE \`${pk}\` = ?`,
            [...updateValues, row[pk]]
          );
        }
      } else {
        const placeholders = columns.map(() => '?').join(', ');
        await conn.query(
          `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
          values
        );
      }
    }

    await conn.commit();
    res.json({ data: rows, error: null });
  } catch (err) {
    await conn.rollback();
    console.error(`UPSERT ${table} failed`, err);
    // A genuine duplicate-key error now means a real conflict on a non-pk
    // unique column (e.g. a reused requisition_number) rather than a
    // silent cross-row overwrite - surface it clearly to the caller.
    const message =
      err.code === 'ER_DUP_ENTRY'
        ? `Duplicate value for a unique field in "${table}": ${err.sqlMessage || err.message}`
        : err.message;
    res.status(500).json({ error: message });
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
