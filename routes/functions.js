import express from 'express';
import { sendEmail } from '../backend-lib/mailer.js';

const router = express.Router();

// POST /api/functions/send-email
// body: { to, subject, html, text }
// Matches emailPasswordReset.ts / emailReminderEngine.ts's
// supabase.functions.invoke('send-email', { body: {...} }) call shape.
router.post('/send-email', async (req, res) => {
  const { to, subject, html, text } = req.body;
  if (!to || !subject) {
    return res.status(400).json({ error: 'Missing to/subject' });
  }

  try {
    await sendEmail({ to, subject, html, text });
    res.json({ data: { success: true }, error: null });
  } catch (err) {
    console.error('send-email failed', err);
    res.status(500).json({ error: err.message || 'Failed to send email' });
  }
});

// POST /api/functions/send-email-batch
// body: { messages: [{ to, subject, html, text }, ...] }
//
// Replaces N separate client-side fetches (one per recipient) with a
// single HTTP request carrying the whole batch. The server fans them out
// itself with a small worker pool (CONCURRENCY) so we don't hammer the
// SMTP server with 286 simultaneous connections either — just controlled,
// bounded parallelism on the one machine best placed to manage it.
//
// Always responds 200 with a per-message results array (never a single
// pass/fail for the whole batch) so a handful of bad addresses can't take
// down delivery to everyone else in the batch.
router.post('/send-email-batch', async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.json({ data: { results: [] }, error: null });
  }

  const CONCURRENCY = 10;
  const results = new Array(messages.length);
  let cursor = 0;

  async function worker() {
    while (cursor < messages.length) {
      const i = cursor++;
      const { to, subject, html, text } = messages[i] || {};
      if (!to || !subject) {
        results[i] = { to, success: false, error: 'Missing to/subject' };
        continue;
      }
      try {
        await sendEmail({ to, subject, html, text });
        results[i] = { to, success: true };
      } catch (err) {
        console.error(`send-email-batch failed for ${to}`, err);
        results[i] = { to, success: false, error: err.message || 'Failed to send email' };
      }
    }
  }

  const workerCount = Math.min(CONCURRENCY, messages.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  res.json({ data: { results }, error: null });
});

export default router;
