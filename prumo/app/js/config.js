// Beta setup. The URL and the publishable key are public by design: what protects the data are the
// row rules in supabase/schema.sql and the admin check in supabase/functions/admin. Never put a secret key here.
export const SUPABASE_URL = 'https://mpyrcdcazgiauogbtptd.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_5F470Kln3O1YQ56ZhgwDOQ_3fTieXLp';
// Copy of each waitlist entry and feedback to Matheus's inbox (FormSubmit). Empty = only the database.
export const NOTIFY_URL = 'https://formsubmit.co/ajax/matheusvillanova1@gmail.com';
// Public by design (Cloudflare Turnstile site key). The secret half lives only in Supabase.
export const TURNSTILE_KEY = '0x4AAAAAAF9NqVGr13wZJOkV';
// The advisor service (supabase/functions/advisor, Gemini) is deployed? Keep false until it is: the chat then answers from local rules.
export const ADVISOR_ON = false;
export const CONTACT = 'matheusvillanova1@gmail.com';
