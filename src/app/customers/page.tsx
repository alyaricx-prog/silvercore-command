'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import PageSkeleton from '@/components/Skeleton'
import type { Profile, Customer, CustomerEvent } from '@/lib/types'

const statusColors: Record<Customer['status'], string> = {
  active:   'bg-green-900/30 text-green-300',
  inactive: 'bg-rim text-dim',
  prospect: 'bg-blue-900/30 text-blue-300',
}

const eventIcons: Record<CustomerEvent['kind'], string> = {
  call:        '📞',
  visit:       '🚶',
  deal_closed: '✅',
  deal_lost:   '❌',
  note:        '📝',
  follow_up:   '🔁',
}

export default function CustomersPage() {
  const [profile, setProfile]       = useState<Profile | null>(null)
  const [customers, setCustomers]   = useState<Customer[]>([])
  const [selected, setSelected]     = useState<Customer | null>(null)
  const [events, setEvents]         = useState<CustomerEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)
  const [msg, setMsg]               = useState('')
  const [search, setSearch]         = useState('')

  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', status: 'active' as Customer['status'], notes: '',
  })
  const [eventForm, setEventForm] = useState({
    kind: 'visit' as CustomerEvent['kind'], summary: '',
  })
  const [saving, setSaving]       = useState(false)

  const router  = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { router.push('/dashboard'); return }
      setProfile(prof)
      const { data: c } = await supabase.from('customers').select('*')
        .eq('organisation_id', prof.organisation_id).order('name')
      setCustomers(c || [])
      setLoading(false)
    }
    load()
  }, [])

  async function openCustomer(c: Customer) {
    setSelected(c)
    setShowForm(false)
    setShowEventForm(false)
    setLoadingEvents(true)
    const { data } = await supabase.from('customer_events').select('*')
      .eq('customer_id', c.id).order('created_at', { ascending: false })
    setEvents(data || [])
    setLoadingEvents(false)
  }

  async function handleSaveCustomer(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true); setMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('customers').insert({
      organisation_id: profile.organisation_id,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
      created_by: user!.id,
    }).select().single()
    if (error) { setMsg('Error: ' + error.message) }
    else {
      setCustomers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setForm({ name: '', phone: '', email: '', address: '', status: 'active', notes: '' })
      setShowForm(false)
      openCustomer(data)
    }
    setSaving(false)
  }

  async function handleLogEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !selected) return
    setSaving(true); setMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('customer_events').insert({
      organisation_id: profile.organisation_id,
      customer_id: selected.id,
      logged_by: user!.id,
      kind: eventForm.kind,
      summary: eventForm.summary.trim(),
    }).select().single()
    if (error) { setMsg('Error: ' + error.message) }
    else {
      setEvents(prev => [data, ...prev])
      setEventForm({ kind: 'visit', summary: '' })
      setShowEventForm(false)
    }
    setSaving(false)
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <PageSkeleton variant="list" />

  if (selected) {
    return (
      <main className="sc-enter min-h-screen bg-page text-hi pb-28">
        <header className="px-5 pt-12 pb-4 border-b border-rim flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="text-dim hover:text-hi transition text-lg">←</button>
          <div>
            <p className="text-xs text-dim uppercase tracking-widest mb-0.5">Customer</p>
            <h1 className="text-xl font-bold leading-tight">{selected.name}</h1>
          </div>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[selected.status]}`}>
            {selected.status}
          </span>
        </header>

        <div className="px-5 py-4 space-y-4">
          {/* Contact info */}
          <div className="bg-card border border-rim rounded-xl p-4 space-y-2">
            {selected.phone  && <p className="text-sm text-hi">📞 {selected.phone}</p>}
            {selected.email  && <p className="text-sm text-hi">✉️ {selected.email}</p>}
            {selected.address && <p className="text-sm text-hi">📍 {selected.address}</p>}
            {selected.notes  && <p className="text-sm text-lo italic mt-1">{selected.notes}</p>}
          </div>

          {/* Log event */}
          <button onClick={() => setShowEventForm(v => !v)}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition text-sm">
            {showEventForm ? 'Cancel' : '+ Log Interaction'}
          </button>

          {showEventForm && (
            <form onSubmit={handleLogEvent} className="bg-card border border-rim rounded-xl p-4 space-y-3">
              <div>
                <label className="text-xs text-lo mb-1 block">Type</label>
                <select value={eventForm.kind} onChange={e => setEventForm(f => ({ ...f, kind: e.target.value as CustomerEvent['kind'] }))}
                  className="w-full bg-well border border-rim rounded-xl px-3 py-3 text-sm text-hi focus:outline-none focus:border-blue-500">
                  <option value="visit">Visit</option>
                  <option value="call">Call</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="deal_closed">Deal Closed</option>
                  <option value="deal_lost">Deal Lost</option>
                  <option value="note">Note</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-lo mb-1 block">Summary *</label>
                <textarea required value={eventForm.summary} onChange={e => setEventForm(f => ({ ...f, summary: e.target.value }))}
                  placeholder="What happened? Key details..."
                  rows={3}
                  className="w-full bg-well border border-rim rounded-xl px-4 py-3 text-sm text-hi placeholder-dim resize-none focus:outline-none focus:border-blue-500" />
              </div>
              <button type="submit" disabled={saving || !eventForm.summary.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-well disabled:text-dim text-white font-semibold py-3 rounded-xl transition text-sm">
                {saving ? 'Saving…' : 'Log Interaction'}
              </button>
            </form>
          )}

          {msg && <div className={`px-4 py-3 rounded-xl text-sm ${msg.startsWith('Error') ? 'bg-red-900/40 text-red-300' : 'bg-green-900/40 text-green-300'}`}>{msg}</div>}

          {/* Timeline */}
          <div>
            <h2 className="text-xs text-dim uppercase tracking-widest mb-3">Timeline</h2>
            {loadingEvents ? (
              <p className="text-dim text-sm text-center py-6">Loading…</p>
            ) : events.length === 0 ? (
              <p className="text-dim text-sm text-center py-6">No interactions logged yet.</p>
            ) : (
              <div className="relative pl-5 space-y-0">
                <div className="absolute left-2 top-2 bottom-2 w-px bg-rim" />
                {events.map((ev, i) => (
                  <div key={ev.id} className="relative pl-5 pb-4">
                    <div className="absolute -left-[3px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-page" />
                    <div className="bg-card border border-rim rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{eventIcons[ev.kind]}</span>
                        <span className="text-xs font-semibold text-hi capitalize">{ev.kind.replace('_', ' ')}</span>
                        <span className="ml-auto text-xs text-dim">{new Date(ev.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-lo">{ev.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <Nav role={profile!.role} />
      </main>
    )
  }

  return (
    <main className="sc-enter min-h-screen bg-page text-hi pb-28">
      <header className="px-5 pt-12 pb-4 border-b border-rim">
        <p className="text-xs text-dim uppercase tracking-widest mb-1">CRM</p>
        <h1 className="text-xl font-bold">Customers</h1>
      </header>

      <div className="px-5 py-4 space-y-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, email…"
          className="w-full bg-well border border-rim rounded-xl px-4 py-3 text-sm text-hi placeholder-dim focus:outline-none focus:border-blue-500" />

        <button onClick={() => setShowForm(v => !v)}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition text-sm">
          {showForm ? 'Cancel' : '+ Add Customer'}
        </button>

        {showForm && (
          <form onSubmit={handleSaveCustomer} className="bg-card border border-rim rounded-xl p-4 space-y-3">
            {[
              { label: 'Name *', key: 'name', placeholder: 'Full name or company' },
              { label: 'Phone', key: 'phone', placeholder: '555-0100' },
              { label: 'Email', key: 'email', placeholder: 'name@example.com' },
              { label: 'Address', key: 'address', placeholder: '123 Main St, Camp Hill PA' },
              { label: 'Notes', key: 'notes', placeholder: 'Any helpful context…' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-lo mb-1 block">{f.label}</label>
                <input required={f.key === 'name'} value={(form as any)[f.key]}
                  onChange={e => setForm(cf => ({ ...cf, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-well border border-rim rounded-xl px-4 py-3 text-sm text-hi placeholder-dim focus:outline-none focus:border-blue-500" />
              </div>
            ))}
            <div>
              <label className="text-xs text-lo mb-1 block">Status</label>
              <select value={form.status} onChange={e => setForm(cf => ({ ...cf, status: e.target.value as Customer['status'] }))}
                className="w-full bg-well border border-rim rounded-xl px-3 py-3 text-sm text-hi focus:outline-none focus:border-blue-500">
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            {msg && <p className="text-sm text-red-300">{msg}</p>}
            <button type="submit" disabled={saving || !form.name.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-well disabled:text-dim text-white font-semibold py-3 rounded-xl transition">
              {saving ? 'Saving…' : 'Add Customer'}
            </button>
          </form>
        )}

        {filtered.length === 0 ? (
          <p className="text-dim text-sm text-center py-12">
            {customers.length === 0 ? 'No customers yet. Add your first one above.' : 'No results.'}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => (
              <button key={c.id} onClick={() => openCustomer(c)}
                className="w-full bg-card border border-rim rounded-xl px-4 py-3 flex items-center gap-3 text-left hover:border-blue-500/50 transition">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-hi truncate">{c.name}</p>
                  {(c.phone || c.address) && (
                    <p className="text-xs text-dim truncate">{c.phone || c.address}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${statusColors[c.status]}`}>
                  {c.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <Nav role={profile!.role} />
    </main>
  )
}
