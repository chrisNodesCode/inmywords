import Head from 'next/head';
import Script from 'next/script';
import { Card, Button, Row, Col, List } from 'antd';

const tiers = [
  {
    key: 'free',
    title: 'Free',
    price: '$0',
    features: [
      'Clone 1 Precursor',
      'Create 2 Custom Aliased Notebooks',
      'Full NotebookEditor UI Features',
    ],
  },
  {
    key: 'standard',
    title: '$5/mo.',
    price: '$5 / month',
    priceId: 'price_1PTaLICEBWQImEVcStandard123',
    features: [
      'Clone up to 100 Precursors',
      'Create up to 100 Custom Aliased Notebooks',
      'Full NotebookEditor UI Features',
      'Access to Whisker Ai Writing Companion Feature (coming soon)',
    ],
  },
  {
    key: 'pro',
    title: '$15/mo.',
    price: '$15 / month',
    priceId: 'price_1PTaLKCEBWQImEVcPro123456',
    features: [
      'Clone unlimited Precursors to your account',
      'Create unlimited Custom Aliased Notebooks',
      'Full NotebookEditor UI Features',
      'Access to Whisker Ai Writing Companion Feature (coming soon)',
      'Access to Integration Modules',
    ],
  },
];

export default function PricingPage() {
  const handleCheckout = async (priceId) => {
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error', err);
    }
  };

  return (
    <>
      <Head>
        <title>Pricing | InMyWords</title>
      </Head>
      <div style={{ padding: '2rem' }}>
        <Row gutter={[16, 16]} justify="center">
          {tiers.map((tier) => (
            <Col xs={24} sm={12} md={8} key={tier.key}>
              <Card title={tier.title} bordered>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{tier.price}</p>
                <List
                  dataSource={tier.features}
                  renderItem={(item) => <List.Item>{item}</List.Item>}
                  size="small"
                />
                {tier.key !== 'free' && (
                  <Button
                    type="primary"
                    block
                    onClick={() => handleCheckout(tier.priceId)}
                  >
                    Choose {tier.title}
                  </Button>
                )}
              </Card>
            </Col>
          ))}
        </Row>
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Script src="https://js.stripe.com/v3/pricing-table.js" async />
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <stripe-pricing-table
              pricing-table-id="prctbl_1PTaQMCEBWQImEVcREAL123"
              publishable-key="pk_live_51PTaQMCEBWQImEVcREALKEY"
            />
          </div>
        </div>
      </div>
    </>
  );
}

