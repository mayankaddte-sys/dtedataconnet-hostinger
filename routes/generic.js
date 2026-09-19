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

// Serialize JS values for JSON columns before sending them to MySQL.
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

/*
|--------------------------------------------------------------------------
| GET /api/:table
|--------------------------------------------------------------------------
|
| Examples:
|
| GET /api/field_units
|
| GET /api/field_units?select=id,name,status
|
| GET /api/field_units?select=*
|
| GET /api/requisitions?select=*&order=created_at.desc
|
| GET /api/submissions?select=id,status,submitted_at
|
| GET /api/submissions?id=eq.123
|
|--------------------------------------------------------------------------
*/

router.get('/:table', async (req, res) => {
  const { table } = req.params;

  if (!assertKnownTable(table, res)) {
    return;
  }

  /*
   * ---------------------------------------------------------------
   * SELECT / COLUMN PROJECTION
   * ---------------------------------------------------------------
   *
   * The existing frontend sends:
   *
   *     ?select=*
   *
   * Therefore '*' must remain valid.
   *
   * For performance-sensitive requests we also support:
   *
   *     ?select=id,status,submitted_at
   *
   * This allows the frontend to avoid downloading large fields such
   * as uploaded_document_url during the initial dashboard load.
   */

  let selectClause = '*';

  if (req.query.select) {
    const selectValue = String(req.query.select).trim();

    // Backward compatibility with the existing frontend.
    if (selectValue === '*') {
      selectClause = '*';
    } else {
      const requested = selectValue
        .split(',')
        .map((column) => column.trim())
        .filter(Boolean);

      if (
        requested.length === 0 ||
        requested.some(
          (column) =>
            !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)
        )
      ) {
        return res.status(400).json({
          error: 'Invalid select columns'
        });
      }

      selectClause = requested
        .map((column) => `\`${column}\``)
        .join(', ');
    }
  }

  let sql = `
    SELECT ${selectClause}
    FROM \`${table}\`
  `;

  const params = [];

  /*
   * ---------------------------------------------------------------
   * FILTERS
   * ---------------------------------------------------------------
   *
   * Supports:
   *
   * ?status=eq.PENDING
   * ?status=neq.COMPLETED
   * ?id=eq.123
   */

  const filters = [];

  for (const [key, raw] of Object.entries(req.query)) {
    if (
      key === 'select' ||
      key === 'order'
    ) {
      continue;
    }

    // Only allow safe SQL identifiers.
    if (
      !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)
    ) {
      continue;
    }

    const value = String(raw);

    if (value.startsWith('eq.')) {
      filters.push(`\`${key}\` = ?`);
      params.push(value.slice(3));
    } else if (value.startsWith('neq.')) {
      filters.push(`\`${key}\` != ?`);
      params.push(value.slice(4));
    }
  }

  if (filters.length > 0) {
    sql += ` WHERE ${filters.join(' AND ')}`;
  }

  /*
   * ---------------------------------------------------------------
   * ORDER
   * ---------------------------------------------------------------
   *
   * Examples:
   *
   * ?order=created_at.desc
   * ?order=submitted_at.desc
   */

  if (req.query.order) {
    const [column, direction] =
      String(req.query.order).split('.');

    const safeDirection =
      direction === 'desc'
        ? 'DESC'
        : 'ASC';

    if (
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)
    ) {
      sql +=
        ` ORDER BY \`${column}\` ${safeDirection}`;
    }
  }

  try {
    const [rows] =
      await pool.query(
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

/*
|--------------------------------------------------------------------------
| POST /api/:table/upsert
|--------------------------------------------------------------------------
|
| Body:
|
| {
|   "rows": [...]
| }
|
|--------------------------------------------------------------------------
*/

router.post('/:table/upsert', async (req, res) => {
  const { table } = req.params;

  if (!assertKnownTable(table, res)) {
    return;
  }

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
          (column) => row[column]
        );

      /*
       * Match existing rows using the configured primary key.
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
        /*
         * UPDATE existing row.
         */

        const updateColumns =
          columns.filter(
            (column) => column !== pk
          );

        if (
          updateColumns.length > 0
        ) {
          const setClause =
            updateColumns
              .map(
                (column) =>
                  `\`${column}\` = ?`
              )
              .join(', ');

          const updateValues =
            updateColumns.map(
              (column) =>
                row[column]
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
        /*
         * INSERT new row.
         */

        const placeholders =
          columns
            .map(() => '?')
            .join(', ');

        await conn.query(
          `INSERT INTO \`${table}\`
           (${columns
             .map(
               (column) =>
                 `\`${column}\``
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

/*
|--------------------------------------------------------------------------
| DELETE /api/:table
|--------------------------------------------------------------------------
|
| Examples:
|
| DELETE /api/submissions?id=eq.123
|
| DELETE /api/requisitions?id=eq.123
|
| DELETE without a filter is deliberately refused.
|
|--------------------------------------------------------------------------
*/

router.delete('/:table', async (req, res) => {
  const { table } = req.params;

  if (!assertKnownTable(table, res)) {
    return;
  }

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

    const value = String(raw);

    if (value.startsWith('eq.')) {
      filters.push(`\`${key}\` = ?`);
      values.push(value.slice(3));
    } else if (
      value.startsWith('neq.')
    ) {
      filters.push(`\`${key}\` != ?`);
      values.push(value.slice(4));
    }
  }

  /*
   * Safety protection:
   * Never allow DELETE without a WHERE condition.
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
