import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  // Expect ?org_id=... from client (already authenticated via browser session)
  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('org_id')
  if (!orgId) return NextResponse.json({ error: 'Missing org_id' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)

  const [
    { data: deals },
    { data: checkIns },
    { data: completed },
    { data: profiles },
  ] = await Promise.all([
    supabase.from('deal_logs').select('*').eq('organisation_id', orgId).gte('created_at', weekStart.toISOString()),
    supabase.from('check_ins').select('*').eq('organisation_id', orgId).gte('created_at', weekStart.toISOString()),
    supabase.from('assignments').select('*').eq('organisation_id', orgId).eq('status', 'completed').gte('completed_at', weekStart.toISOString()),
    supabase.from('profiles').select('*').eq('organisation_id', orgId).eq('is_active', true),
  ])

  const dealList = deals || []

  // Per-rep stats
  const repStats: Record<string, { name: string; group: string; closed: number; lost: number; followUp: number; noContact: number; checkIns: number }> = {}
  for (const p of profiles || []) {
    repStats[p.id] = { name: p.full_name, group: p.group_name || '', closed: 0, lost: 0, followUp: 0, noContact: 0, checkIns: 0 }
  }
  for (const d of dealList) {
    if (!repStats[d.logged_by]) continue
    if (d.outcome === 'closed') repStats[d.logged_by].closed++
    else if (d.outcome === 'lost') repStats[d.logged_by].lost++
    else if (d.outcome === 'follow_up') repStats[d.logged_by].followUp++
    else if (d.outcome === 'no_contact') repStats[d.logged_by].noContact++
  }
  for (const c of (checkIns || [])) {
    if (repStats[c.employee_id]) repStats[c.employee_id].checkIns++
  }

  const totalClosed = dealList.filter(d => d.outcome === 'closed').length
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  const rows = Object.values(repStats).sort((a, b) => b.closed - a.closed).map(r =>
    `<tr><td>${r.name}</td><td>${r.group}</td><td style="color:#22c55e;font-weight:600">${r.closed}</td><td>${r.lost}</td><td>${r.followUp}</td><td>${r.noContact}</td><td>${r.checkIns}</td><td>${r.closed + r.lost + r.followUp + r.noContact}</td></tr>`
  ).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Weekly Report – ${weekLabel}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#111;padding:48px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
  .brand{font-size:22px;font-weight:800;letter-spacing:-0.5px}
  .brand span{color:#3b82f6}
  .meta{text-align:right;font-size:13px;color:#6b7280}
  .meta .period{font-size:15px;font-weight:600;color:#111;margin-bottom:2px}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:40px}
  .kpi{border:1px solid #e5e7eb;border-radius:12px;padding:20px}
  .kpi .num{font-size:32px;font-weight:800;line-height:1}
  .kpi .label{font-size:12px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:.05em}
  h2{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:12px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;padding:8px 12px;background:#f9fafb;border-bottom:2px solid #e5e7eb;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
  td{padding:10px 12px;border-bottom:1px solid #f3f4f6}
  tr:last-child td{border-bottom:none}
  .footer{margin-top:48px;font-size:11px;color:#9ca3af;text-align:center}
  .print-btn{position:fixed;top:16px;right:16px;padding:10px 20px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}
  @media print{.print-btn{display:none}}
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save PDF</button>
  <div class="header">
    <div class="brand">Silver<span>Core</span> <span style="color:#6b7280;font-weight:400;font-size:16px">Command</span></div>
    <div class="meta"><div class="period">Weekly Report</div><div>${weekLabel}</div></div>
  </div>
  <div class="kpis">
    <div class="kpi"><div class="num">${totalClosed}</div><div class="label">Deals Closed</div></div>
    <div class="kpi"><div class="num">${dealList.length}</div><div class="label">Total Activities</div></div>
    <div class="kpi"><div class="num">${(checkIns || []).length}</div><div class="label">Check-ins</div></div>
    <div class="kpi"><div class="num">${(completed || []).length}</div><div class="label">Jobs Completed</div></div>
  </div>
  <h2>Rep Performance</h2>
  <table>
    <thead><tr><th>Rep</th><th>Group</th><th>Closed</th><th>Lost</th><th>Follow Up</th><th>No Contact</th><th>Check-ins</th><th>Activities</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:#9ca3af;padding:24px">No activity this week</td></tr>'}</tbody>
  </table>
  <div class="footer">Generated by SilverCore Command · ${new Date().toLocaleString()}</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="weekly-report.html"`,
    },
  })
}
