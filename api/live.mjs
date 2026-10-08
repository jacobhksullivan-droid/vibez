// Vercel serverless function for /api/live — same code as the Netlify one.
import handler from "../netlify/functions/live.mjs";
export const GET = req => handler(req);
