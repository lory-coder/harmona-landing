import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendWelcomeEmail(email) {
  try {
    await resend.emails.send({
      from: 'Harmona <hello@harmonaapp.com>',
      to: email,
      subject: 'Du bist auf der Warteliste! 💜',
      html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAF8FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <tr><td style="text-align:center;padding-bottom:32px;">
      <span style="font-size:32px;">🌙</span>
      <h1 style="font-size:22px;font-weight:700;color:#3D3455;margin:12px 0 0;">Willkommen bei Harmona</h1>
    </td></tr>
    <tr><td style="background:#FFFFFF;border-radius:16px;padding:32px 28px;box-shadow:0 4px 20px rgba(139,92,246,0.08);">
      <p style="font-size:16px;line-height:1.7;color:#3D3455;margin:0 0 16px;">
        Hey! Schön, dass du dabei bist. 💜
      </p>
      <p style="font-size:15px;line-height:1.7;color:#3D3455;margin:0 0 16px;">
        Du bist jetzt auf der Harmona-Warteliste. Wir arbeiten gerade mit Hochdruck an der App und melden uns bei dir, sobald es losgeht.
      </p>
      <p style="font-size:15px;line-height:1.7;color:#3D3455;margin:0 0 24px;">
        <strong>Launch-Datum:</strong> 5. Mai 2026
      </p>
      <div style="background:linear-gradient(135deg,#C4A8E8,#D8A8D0);border-radius:12px;padding:20px 24px;text-align:center;">
        <p style="font-size:14px;color:#3D3455;margin:0 0 4px;font-weight:600;">Was dich erwartet</p>
        <p style="font-size:13px;color:#3D3455;margin:0;line-height:1.6;opacity:0.85;">
          Zyklustracking &middot; Personalisierte Ernaehrung &middot; Mondrituale &middot; KI-Coach Luna
        </p>
      </div>
    </td></tr>
    <tr><td style="text-align:center;padding-top:28px;">
      <p style="font-size:13px;color:#9B8FB5;margin:0;">
        Harmona &middot; Deine Zyklus-Begleiterin
      </p>
    </td></tr>
  </table>
</body>
</html>`,
    });
  } catch (err) {
    console.error('Email send error:', err);
    // Don't fail the signup if email fails
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET /api/waitlist — Anzahl abrufen
  if (req.method === 'GET') {
    try {
      const { count, error } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return res.status(200).json({ count: count || 0 });
    } catch (err) {
      console.error('Count error:', err);
      return res.status(200).json({ count: 0 });
    }
  }

  // POST /api/waitlist — E-Mail eintragen
  if (req.method === 'POST') {
    try {
      const { email } = req.body;

      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'invalid_email' });
      }

      const cleanEmail = email.toLowerCase().trim();

      // Prüfen ob E-Mail schon existiert
      const { data: existing } = await supabase
        .from('waitlist')
        .select('id')
        .eq('email', cleanEmail)
        .single();

      if (existing) {
        return res.status(200).json({ error: 'already_registered' });
      }

      // E-Mail eintragen
      const { error: insertError } = await supabase
        .from('waitlist')
        .insert([{ email: cleanEmail }]);

      if (insertError) throw insertError;

      // Bestätigungs-Email senden
      await sendWelcomeEmail(cleanEmail);

      // Aktuelle Anzahl holen
      const { count } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true });

      return res.status(201).json({ success: true, count: count || 1 });
    } catch (err) {
      console.error('Waitlist error:', err);
      return res.status(500).json({ error: 'server_error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
