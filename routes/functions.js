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

export default router;
