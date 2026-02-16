import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

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
