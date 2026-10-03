/**
 * Where Spotlog keeps each user's diary so it follows their Windy login to every device.
 * Fill in the URL of the Supabase Edge Function from supabase/functions/spotlog (see docs/operations.md › "Account sync server").
 * Leave it empty and Spotlog keeps the diary in the browser only.
 */
export const CLOUD = {
    functionUrl: '', // e.g. 'https://abcdxyz.supabase.co/functions/v1/spotlog'
};
