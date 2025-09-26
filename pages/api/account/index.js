/* eslint-env node */
// pages/api/account/index.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import bcrypt from 'bcryptjs';
import Stripe from 'stripe';
import prisma from '@/api/prismaClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const userId = session.user.id;

  switch (req.method) {
    case 'GET': {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            username: true,
            email: true,
            createdAt: true,
            stripeCustomerId: true,
            subscriptionPlan: true,
          },
        });
        const [notebooks, groups, subgroups, entries, tags] = await Promise.all([
          prisma.notebook.count({ where: { userId } }),
          prisma.group.count({ where: { notebook: { userId } } }),
          prisma.subgroup.count({ where: { group: { notebook: { userId } } } }),
          prisma.entry.count({ where: { userId } }),
          prisma.tag.count({ where: { notebook: { userId } } }),
        ]);
        let renewalDate = null;
        let manageUrl = null;
        if (user.stripeCustomerId) {
          try {
            const subs = await stripe.subscriptions.list({
              customer: user.stripeCustomerId,
              limit: 1,
            });
            const sub = subs.data[0];
            if (sub) {
              renewalDate = sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null;
              const portal = await stripe.billingPortal.sessions.create({
                customer: user.stripeCustomerId,
                return_url:
                  process.env.STRIPE_PORTAL_RETURN_URL ||
                  process.env.STRIPE_SUCCESS_URL ||
                  process.env.NEXTAUTH_URL ||
                  'http://localhost:3000/account',
              });
              manageUrl = portal.url;
            }
          } catch (err) {
            console.error('Failed to fetch Stripe subscription', err);
          }
        }
        return res.status(200).json({
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          stats: { notebooks, groups, subgroups, entries, tags },
          subscription: {
            plan: user.subscriptionPlan || 'free',
            renewalDate,
            manageUrl,
          },
        });
      } catch (error) {
        console.error('GET /api/account error', error);
        return res.status(500).json({ error: 'Failed to load account' });
      }
    }
    case 'PUT': {
      try {
        const { username, email, password } = req.body;
        const data = {};
        if (username !== undefined) data.username = username;
        if (email !== undefined) data.email = email;
        if (password) data.passwordHash = await bcrypt.hash(password, 10);
        const updated = await prisma.user.update({
          where: { id: userId },
          data,
        });
        return res
          .status(200)
          .json({ username: updated.username, email: updated.email });
      } catch (error) {
        console.error('PUT /api/account error', error);
        return res.status(500).json({ error: 'Failed to update account' });
      }
    }
    case 'DELETE': {
      try {
        await prisma.user.delete({ where: { id: userId } });
        return res.status(204).end();
      } catch (error) {
        console.error('DELETE /api/account error', error);
        return res.status(500).json({ error: 'Failed to delete account' });
      }
    }
    default: {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  }
}
