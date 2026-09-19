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

// Serialize JS values for JSON columns before sending
// them to mysql2, and pass everything else through untouched.
function serializeRow(table, row) {
  const { json } = TABLES[table];
  const out = {};

  for (const [key, value] of Object.entries(row)) {
    if (
      json.includes(key) &&
      value !== null &&
      value !== undefined
    ) {
      out[key] = JSON.stringify(value);
    } else {
      out[key] = value === undefined ? null : value;
    }
  }

  return out;
}

/* --------------------------------------------------------------------
   GET /api/:table

   Examples:

   GET /api/field_units

   GET /api/submissions?select=id,requisition_id,field_unit_id,status,submitted_at

   GET /api/submissions?order=submitted_at.desc

   GET /api/submissions?status=eq.PENDING

   GET /api/submissions?id=eq.123

   The optional "select" parameter is important because it prevents
   large fields such as uploaded_document_url from being downloaded
   during the initial dashboard load.
   -------------------------------------------------------------------- */
router.get('/:table', async (req, res) => {
  const { table } = req.params;

  if (!assertKnownTable(table, res)) return;

  /*
   * ---------------------------------------------------------------
   * OPTIONAL COLUMN PROJECTION
   *
   * Without ?select=...
   *     SELECT *
   *
   * With ?select=id,status,submitted_at
   *     SELECT `id`, `status`, `submitted_at`
   *
   * This is the main performance improvement for submissions.
   * ---------------------------------------------------------------
   */

  let selectClause = '*';

  if (req.query.select) {
    const requested = String(req.query.select)
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    // Validate every requested column.
    // Only simple SQL identifiers are permitted.
    if (
      requested.length === 0 ||
      requested.some(
        (c) =>
          !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c)
      )
    ) {
      return res.status(400).json({
        error: 'Invalid select columns'
      });
    }

    selectClause = requested
      .map((c) => `\`${c}\``)
      .join(', ');
  }

  let sql = `
    SELECT ${selectClause}
    FROM \`${table}\`
  `;

  const params = [];

  /*
   * ---------------------------------------------------------------
   * FILTERS
   *
   * Supports:
   *
   * ?status=eq.PENDING
   * ?status=neq.COMPLETED
   * ?id=eq.123
   * ---------------------------------------------------------------
   */

  const filters = [];

  for (const [key, raw] of Object.entries(req.query)) {
    if (
      key === 'select' ||
      key === 'order'
    ) {
      continue;
    }

    // Ignore anything that isn't a safe SQL identifier.
    if (
      !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)
    ) {
      continue;
    }

    const val = String(raw);

    if (val.startsWith('eq.')) {
      filters.push(`\`${key}\` = ?`);
      params.push(val.slice(3));
    } else if (val.startsWith('neq.')) {
      filters.push(`\`${key}\` != ?`);
      params.push(val.slice(4));
    }
  }

  if (filters.length) {
    sql += ` WHERE ${filters.join(' AND ')}`;
  }

  /*
   * ---------------------------------------------------------------
   * ORDER
   *
   * Example:
   *
   * ?order=submitted_at.desc
   * ---------------------------------------------------------------
   */

  if (req.query.order) {
    const [col, dir] = String(req.query.order).split('.');

    const safeDir =
      dir === 'desc'
        ? 'DESC'
        : 'ASC';

    if (
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)
    ) {
      sql += ` ORDER BY \`${col}\` ${safeDir}`;
    }
  }

  try {
    const [rows] = await pool.query(
      sql,
      params
    );

    res.json({
      data: rows,
      error: null
    });
  } catch (err) {
    console.error(
      `GET /${table} failed`,
      err
    );

    res.status(500).json({
      error: err.message
    });
  }
});

/* --------------------------------------------------------------------
   POST /api/:table/upsert

   Body:

   {
     rows: [...],
     onConflict: "id"
   }

   The operation matches existing rows using the configured primary key.
   -------------------------------------------------------------------- */
router.post('/:table/upsert', async (req, res) => {
  const { table } = req.params;

  if (!assertKnownTable(table, res)) return;

  const { rows } = req.body;

  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    return res.json({
      data: [],
      error: null
    });
  }

  const pk = TABLES[table].pk;

  const conn =
    await pool.getConnection();

  try {
    await conn.beginTransaction();

    for (const rawRow of rows) {
      const row =
        serializeRow(
          table,
          rawRow
        );

      const columns =
        Object.keys(row);

      const values =
        columns.map(
          (c) => row[c]
        );

      /*
       * Match using PRIMARY KEY only.
       *
       * This avoids accidentally updating another row because
       * of a collision on a different UNIQUE field.
       */

      const [existing] =
        await conn.query(
          `SELECT 1
           FROM \`${table}\`
           WHERE \`${pk}\` = ?
           LIMIT 1`,
          [row[pk]]
        );

      if (existing.length > 0) {
        const updateCols =
          columns.filter(
            (c) => c !== pk
          );

        if (
          updateCols.length > 0
        ) {
          const setClause =
            updateCols
              .map(
                (c) =>
                  `\`${c}\` = ?`
              )
              .join(', ');

          const updateValues =
            updateCols.map(
              (c) => row[c]
            );

          await conn.query(
            `UPDATE \`${table}\`
             SET ${setClause}
             WHERE \`${pk}\` = ?`,
            [
              ...updateValues,
              row[pk]
            ]
          );
        }
      } else {
        const placeholders =
          columns
            .map(() => '?')
            .join(', ');

        await conn.query(
          `INSERT INTO \`${table}\`
           (${columns
             .map(
               (c) => `\`${c}\``
             )
             .join(', ')})
           VALUES (${placeholders})`,
          values
        );
      }
    }

    await conn.commit();

    res.json({
      data: rows,
      error: null
    });
  } catch (err) {
    await conn.rollback();

    console.error(
      `UPSERT ${table} failed`,
      err
    );

    const message =
      err.code === 'ER_DUP_ENTRY'
        ? `Duplicate value for a unique field in "${table}": ${
            err.sqlMessage ||
            err.message
          }`
        : err.message;

    res.status(500).json({
      error: message
    });
  } finally {
    conn.release();
  }
});

/* --------------------------------------------------------------------
   DELETE /api/:table

   Supports:

   DELETE /api/submissions?id=eq.123

   DELETE /api/submissions?status=eq.PENDING

   DELETE requests without filters are refused.
   -------------------------------------------------------------------- */
router.delete('/:table', async (req, res) => {
  const { table } = req.params;

  if (!assertKnownTable(table, res)) return;

  const filters = [];
  const values = [];

  for (const [key, raw] of Object.entries(
    req.query
  )) {
    if (
      !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)
    ) {
      continue;
    }

    const val = String(raw);

    if (val.startsWith('eq.')) {
      filters.push(`\`${key}\` = ?`);
      values.push(val.slice(3));
    } else if (
      val.startsWith('neq.')
    ) {
      filters.push(`\`${key}\` != ?`);
      values.push(val.slice(4));
    }
  }

  /*
   * Safety: never allow DELETE without a filter.
   */

  if (filters.length === 0) {
    return res.status(400).json({
      error:
        'Refusing DELETE with no filters'
    });
  }

  const sql =
    `DELETE FROM \`${table}\`
     WHERE ${filters.join(' AND ')}`;

  try {
    const [result] =
      await pool.query(
        sql,
        values
      );

    res.json({
      data: {
        affectedRows:
          result.affectedRows
      },
      error: null
    });
  } catch (err) {
    console.error(
      `DELETE ${table} failed`,
      err
    );

    res.status(500).json({
      error: err.message
    });
  }
});

export default router;
