/* eslint-env node */
// pages/api/debug-prisma.js
export default async function handler(req, res) {
  try {
    // Pull in the module exactly how your NextAuth route does
    const pkg = await import('@prisma/client');
    // Log to Vercel function logs
    console.log('[@prisma/client] keys:', Object.keys(pkg));
    console.log('[@prisma/client].PrismaClient:', pkg.PrismaClient);
    // Send back minimal JSON
    res.status(200).json({
      keys: Object.keys(pkg),
      hasPrismaClient: typeof pkg.PrismaClient === 'function',
    });
  } catch (err) {
    console.error('Debug error:', err);
    res.status(500).json({ error: err.message });
  }
}
