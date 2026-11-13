export const metadata = {
  title: 'Pricing – SilverCore Command',
  description: 'Simple, transparent pricing for sales teams. Everything you need to run your field operation.',
}

export default function PricingPage() {
  return (
    <main style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#fff', minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 48px', borderBottom: '1px solid #f3f4f6' }}>
        <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.5px' }}>
          Silver<span style={{ color: '#3b82f6' }}>Core</span>{' '}
          <span style={{ color: '#6b7280', fontWeight: 400, fontSize: 16 }}>Command</span>
        </span>
        <a href="/login" style={{ padding: '8px 20px', background: '#3b82f6', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
          Sign In
        </a>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '80px 24px 60px' }}>
        <div style={{ display: 'inline-block', background: '#eff6ff', color: '#3b82f6', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 100, marginBottom: 20 }}>
          Pricing
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-1px', margin: '0 0 16px', lineHeight: 1.1 }}>
          One plan. Everything included.
        </h1>
        <p style={{ fontSize: 18, color: '#6b7280', maxWidth: 520, margin: '0 auto 12px' }}>
          Built for door-to-door and field sales companies. No per-seat surprise bills — one flat annual rate covers your whole team.
        </p>
      </section>

      {/* Pricing card */}
      <section style={{ display: 'flex', justifyContent: 'center', padding: '0 24px 80px' }}>
        <div style={{ background: '#fff', border: '2px solid #3b82f6', borderRadius: 20, padding: '48px 56px', maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(59,130,246,.12)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#3b82f6', marginBottom: 12 }}>Command — Annual</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 8 }}>
            <span style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-2px', lineHeight: 1 }}>$30,000</span>
            <span style={{ color: '#6b7280', fontSize: 16, marginBottom: 10 }}>/year</span>
          </div>
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 36, lineHeight: 1.6 }}>
            Flat rate. Unlimited reps. Unlimited activity. Billed annually.
          </p>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              'Live map — rep locations & deal pins',
              'Deal log with outcome tracking',
              'Assignment & job dispatch',
              'Team vault — photo & document storage',
              'GPS check-in with door detection',
              'Push notifications for new assignments',
              'Weekly performance reports',
              'Route optimization',
              'Reminders & follow-up scheduling',
              'Unlimited reps & co-hosts',
              'Dedicated onboarding & support',
            ].map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 15, color: '#111' }}>
                <span style={{ color: '#22c55e', fontSize: 18, lineHeight: '22px', flexShrink: 0 }}>&#10003;</span>
                {f}
              </li>
            ))}
          </ul>

          <a
            href="mailto:hello@silvercore.app?subject=SilverCore%20Command%20Demo%20Request"
            style={{ display: 'block', textAlign: 'center', background: '#3b82f6', color: '#fff', padding: '16px 0', borderRadius: 12, fontWeight: 700, fontSize: 16, textDecoration: 'none', letterSpacing: '-.2px' }}
          >
            Request a Demo &rarr;
          </a>
          <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 12 }}>No commitment. We&apos;ll show you the platform live.</p>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: '#f9fafb', padding: '64px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 32, letterSpacing: '-.5px' }}>Common questions</h2>
          {[
            ['How many reps can I add?', 'Unlimited. The $30,000/year rate covers every rep, co-host, and host in your organization — no per-seat fees.'],
            ['Is there a setup fee?', 'No. Onboarding is included. We configure the platform for your team and walk you through every feature.'],
            ['What devices work?', 'SilverCore Command is a Progressive Web App — it installs on iPhone, Android, and desktop from any browser. No app store required.'],
            ['Can I export data?', 'Yes. Weekly HTML reports are built in and printable as PDF. Raw data export is available on request.'],
            ['How is payment handled?', 'Annual invoice via ACH or check. We can work with your procurement or accounts payable team.'],
          ].map(([q, a]) => (
            <div key={q as string} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 24, marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{q}</div>
              <div style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.7 }}>{a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section style={{ textAlign: 'center', padding: '64px 24px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.5px', marginBottom: 12 }}>Ready to run a tighter field operation?</h2>
        <p style={{ color: '#6b7280', fontSize: 16, marginBottom: 28 }}>See SilverCore Command working with a live demo for your team.</p>
        <a
          href="mailto:hello@silvercore.app?subject=SilverCore%20Command%20Demo%20Request"
          style={{ display: 'inline-block', background: '#111', color: '#fff', padding: '14px 32px', borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}
        >
          Get in touch
        </a>
      </section>

      <footer style={{ borderTop: '1px solid #f3f4f6', padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#9ca3af' }}>
        <span>&#169; 2026 SilverCore Command</span>
        <a href="/login" style={{ color: '#6b7280', textDecoration: 'none' }}>Sign In</a>
      </footer>
    </main>
  )
}
