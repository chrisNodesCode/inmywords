/* eslint-env node */
/* global process, Buffer */

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const prisma = new PrismaClient();

const PRICE_TO_PLAN = {
  [process.env.STRIPE_PRICE_STANDARD]: 'standard',
  [process.env.STRIPE_PRICE_PRO]: 'pro',
};

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const signature = req.headers['stripe-signature'];

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const subscription =
          session.subscription &&
          (await stripe.subscriptions.retrieve(session.subscription));
        const priceId = subscription?.items?.data[0]?.price?.id;
        const plan = PRICE_TO_PLAN[priceId] ?? null;
        await prisma.user.update({
          where: { stripeCustomerId: session.customer },
          data: { subscriptionPlan: plan },
        });
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        const priceId = invoice.lines.data[0]?.price?.id;
        const plan = PRICE_TO_PLAN[priceId] ?? null;
        await prisma.user.update({
          where: { stripeCustomerId: invoice.customer },
          data: { subscriptionPlan: plan },
        });
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const priceId = subscription.items.data[0]?.price?.id;
        const plan =
          subscription.status === 'active'
            ? PRICE_TO_PLAN[priceId] ?? null
            : null;
        await prisma.user.update({
          where: { stripeCustomerId: subscription.customer },
          data: { subscriptionPlan: plan },
        });
        break;
      }
      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        const obj = event.data.object;
        const customerId = obj.customer;
        await prisma.user.update({
          where: { stripeCustomerId: customerId },
          data: { subscriptionPlan: null },
        });
        break;
      }
      default:
        break;
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handler error', err);
    return res.status(500).send('Webhook handler failed');
  }
}
