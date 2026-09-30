/**
 * Account sync (optional). Fill in after creating the Supabase project — see DEVELOPER.md › "Account sync".
 * Both values are public by design (the anon key only allows what the row-level-security rules in
 * supabase/setup.sql allow: each signed-in user can read and write only their own diary).
 * Leave them empty and Spotlog keeps working with browser storage only.
 */
export const CLOUD = {
    url: '', // e.g. 'https://abcdxyz.supabase.co'
    anonKey: '', // Project Settings › API › anon public key
};
