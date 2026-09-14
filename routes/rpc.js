const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const router = express.Router();

/* --------------------------------------------------------------------
   POST /api/rpc/verify_password_any
   body: { p_identifiers: string[], p_password: string }
   Mirrors storage.ts's verifyUserCredentials(), which only checks
   `data === true` on the response — so we keep that exact contract.
   -------------------------------------------------------------------- */
router.post('/verify_password_any', async (req, res) => {
  const { p_identifiers, p_password } = req.body;
  if (!Array.isArray(p_identifiers) || p_identifiers.length === 0 || !p_password) {
    return res.json({ data: false, error: null });
  }

  try {
    const placeholders = p_identifiers.map(() => '?').join(', ');
    const [rows] = await pool.query(
      `SELECT identifier, password_hash FROM app_credentials WHERE identifier IN (${placeholders})`,
      p_identifiers
    );

    for (const row of rows) {
      const match = await bcrypt.compare(p_password, row.password_hash);
      if (match) {
        return res.json({ data: true, error: null });
      }
    }
    return res.json({ data: false, error: null });
  } catch (err) {
    console.error('verify_password_any failed', err);
    res.status(500).json({ error: err.message });
  }
});

/* --------------------------------------------------------------------
   POST /api/rpc/save_password_any
   body: { p_identifiers: string[], p_password: string }
   Updates the password hash for every identifier that already exists.
   If none exist yet, inserts a new row under the first identifier
   (matches typical "set initial password" use).
   -------------------------------------------------------------------- */
router.post('/save_password_any', async (req, res) => {
  const { p_identifiers, p_password } = req.body;
  if (!Array.isArray(p_identifiers) || p_identifiers.length === 0 || !p_password) {
    return res.json({ data: false, error: null });
  }

  try {
    const hash = await bcrypt.hash(p_password, 10);
    const placeholders = p_identifiers.map(() => '?').join(', ');

    const [result] = await pool.query(
      `UPDATE app_credentials SET password_hash = ? WHERE identifier IN (${placeholders})`,
      [hash, ...p_identifiers]
    );

    if (result.affectedRows === 0) {
      await pool.query(
        'INSERT INTO app_credentials (identifier, password_hash) VALUES (?, ?)',
        [p_identifiers[0], hash]
      );
    }

    res.json({ data: true, error: null });
  } catch (err) {
    console.error('save_password_any failed', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
