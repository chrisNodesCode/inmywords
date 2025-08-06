import React from 'react';

export default function Privacy() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Privacy Policy</h1>
      <p>Last updated: March 19, 2025</p>

      <h2>1. Data We Collect</h2>
      <p>We collect information you provide when creating an account such as username, email, and an optional password. For password accounts we store a bcrypt hash of the password. If you sign in with Google, we receive your name, email, and Google ID. We also store the notebooks, groups, subgroups, entries, tags, and preferences you create, along with session tokens and linked OAuth account data.</p>

      <h2>2. How We Use Data</h2>
      <p>Your information is used to operate and secure the Service, personalize editor settings, and communicate with you.</p>

      <h2>3. Data Sharing and Disclosure</h2>
      <p>Your data is stored in a PostgreSQL database and is not shared with third parties except for authentication providers such as Google. Hosting and analytics providers may process data on our behalf to run the Service.</p>

      <h2>4. Data Security</h2>
      <p>We protect your data using industry-standard practices including hashed passwords and HTTPS.</p>

      <h2>5. Your Rights</h2>
      <p>You may request access to, correction of, or deletion of your data by contacting us.</p>

      <h2>6. Data Retention</h2>
      <p>We retain data for as long as your account is active or as needed to provide the Service. We may also retain certain information to comply with legal obligations.</p>

      <h2>7. International Transfers</h2>
      <p>Your data may be transferred to and stored on servers located outside your jurisdiction.</p>

      <h2>8. Changes to this Policy</h2>
      <p>We may update this Privacy Policy from time to time. Continued use of the Service after changes constitutes acceptance of the new policy.</p>

      <h2>9. Contact</h2>
      <p>For privacy questions, contact us at privacy@inmywords.app.</p>
    </div>
  );
}
