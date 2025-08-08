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
      'Full EntryEditor UI Features',
    ],
  },
  {
    key: 'standard',
    title: '$5/mo.',
    price: '$5 / month',
    features: [
      'Clone up to 100 Precursors',
      'Create up to 100 Custom Aliased Notebooks',
      'Full EntryEditor UI Features',
      'Access to Whisker Ai Writing Companion Feature (coming soon)',
    ],
  },
  {
    key: 'pro',
    title: '$15/mo.',
    price: '$15 / month',
    features: [
      'Clone unlimited Precursors to your account',
      'Create unlimited Custom Aliased Notebooks',
      'Full EntryEditor UI Features',
      'Access to Whisker Ai Writing Companion Feature (coming soon)',
      'Access to Integration Modules',
    ],
  },
];

export default function PricingPage() {
  const handleCheckout = (tier) => {
    // TODO: Replace with Stripe Checkout session creation
    alert(`Upgrade to ${tier} coming soon`);
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
                  <Button type="primary" block onClick={() => handleCheckout(tier.title)}>
                    Choose {tier.title}
                  </Button>
                )}
              </Card>
            </Col>
          ))}
        </Row>
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          {/* TODO: Replace with live Stripe Pricing Table embed */}
          <Script src="https://js.stripe.com/v3/pricing-table.js" async />
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <stripe-pricing-table
              pricing-table-id="prctbl_TEST_ID"
              publishable-key="pk_test_TESTKEY"
            />
          </div>
        </div>
      </div>
    </>
  );
}

