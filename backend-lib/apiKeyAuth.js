// Very deliberately simple: every request must carry the shared API key,
// same trust level as the old Supabase anon key (a shared secret, not
// per-user auth). This matches the security posture the app already had —
// storage.ts never sent a per-user session token to Supabase either.
//
// NOTE FOR LATER: this does NOT distinguish between roles (desk officer vs
// ITI officer vs director). If you want row-level restrictions per role,
// that needs real per-user auth (e.g. JWT issued at login) added on top of
// this. Flagging this here so it isn't forgotten.
export default function apiKeyAuth(req, res, next) {
  const key = req.header('x-api-key');
  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Missing or invalid API key' });
  }
  next();
}
