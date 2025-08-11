/* eslint-env node */

import Stripe from 'stripe';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { priceId } = req.body;
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid price ID' });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: process.env.STRIPE_SUCCESS_URL,
      cancel_url: process.env.STRIPE_CANCEL_URL,
      customer: session.user.stripeCustomerId,
    });

    return res.status(200).json({ url: checkoutSession.url });
  } catch (error) {
    console.error('POST /api/stripe/create-checkout-session error', error);
    return res
      .status(500)
      .json({ error: 'Failed to create checkout session' });
  }
}

