'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import AppHeader from '@/components/AppHeader'
import type { Profile } from '@/lib/types'

function getTenure(createdAt: string): { label: string; color: string; months: number } {
  const months = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
  if (months < 3)  return { label: 'New',        color: '#94a3b8', months }
  if (months < 12) return { label: 'Growing',     color: '#38bdf8', months }
  if (months < 36) return { label: 'Established', color: '#4ade80', months }
  return              { label: 'Long-term',    color: '#c084fc', months }
}

type GridCell = { row: number; col: number; heat: number; kind: 'hot'|'warm'|'cool'|'cold'|'deploy'; label?: string }
type SimMember = { id: string; name: string; group: string; tenure: ReturnType<typeof getTenure>; score: number }
type SimScenario = { id: number; label: string; coverage: number; riskScore: number; confidence: number; outcome: 'success'|'partial'|'at-risk'; team: SimMember[]; grid: GridCell[]; contractEdits: string[]; timeline: { label: string; days: number }[] }

const GRID_ROWS = 8, GRID_COLS = 10

function sr(seed: number, i: number) { const x = Math.sin(seed*9301+i*49297+233)*10000; return x-Math.floor(x) }
function hashStr(s: string) { let h=0; for(let i=0;i<s.length;i++) h=(Math.imul(31,h)+s.charCodeAt(i))|0; return Math.abs(h) }

function buildGrid(seed: number, teamSize: number, si: number): GridCell[] {
  const clusters = si===0?2:si===1?1:3
  const centres = Array.from({length:clusters},(_,ci)=>({ r:Math.floor(sr(seed+ci*7,si)*GRID_ROWS), c:Math.floor(sr(seed+ci*13,si)*GRID_COLS) }))
  const cells: GridCell[] = []
  for(let r=0;r<GRID_ROWS;r++) for(let c=0;c<GRID_COLS;c++) {
    const heat = Math.min(1,centres.reduce((mx,ctr)=>{ const d=Math.sqrt((r-ctr.r)**2+(c-ctr.c)**2); return Math.max(mx,Math.max(0,1-d/3.5)*(0.7+0.3*sr(seed,r*100+c))) },0))
    const kind: GridCell['kind'] = heat>0.72?'hot':heat>0.45?'warm':heat>0.22?'cool':'cold'
    cells.push({row:r,col:c,heat,kind})
  }
  const warm = cells.filter(c=>c.kind==='warm'||c.kind==='cool').sort((a,b)=>b.heat-a.heat)
  warm.slice(0,teamSize).forEach((cell,i)=>{ cell.kind='deploy'; cell.label=`T${i+1}` })
  return cells
}

function scoreMembers(members: Profile[], contractText: string): SimMember[] {
  const seed = hashStr(contractText)
  return members.map((m,i)=>{ const tenure=getTenure(m.created_at); const tenureBonus=tenure.months<3?10:tenure.months<12?20:tenure.months<36?30:40; return { id:m.id, name:m.full_name, group:m.group_name||'General', tenure, score:Math.min(100,Math.round(tenureBonus+40+sr(seed,i)*20)) } }).sort((a,b)=>b.score-a.score)
}

function runSimulations(contractText: string, members: SimMember[]): SimScenario[] {
  const seed = hashStr(contractText)
  const topN = Math.max(2,Math.min(6,Math.round(members.length*0.6)))
  return [
    {label:'Full Coverage',teamFraction:1.0,riskBase:25},
    {label:'Lean Team',    teamFraction:0.5,riskBase:55},
    {label:'Surge Deploy', teamFraction:0.8,riskBase:38},
  ].map((cfg,si)=>{
    const teamSize = Math.max(1,Math.round(topN*cfg.teamFraction))
    const grid = buildGrid(seed,teamSize,si)
    const hotCells = grid.filter(c=>c.kind==='hot').length
    const riskScore = Math.min(99,Math.round(cfg.riskBase+sr(seed,si*7)*15+hotCells*1.5))
    const coverage  = Math.min(100,Math.round(85+(cfg.teamFraction-0.5)*20+sr(seed,si*3)*8-riskScore*0.1))
    const confidence= Math.min(99,Math.round(70+(1-cfg.teamFraction*0.2)*15+sr(seed,si*11)*10))
    const outcome: SimScenario['outcome'] = riskScore<40?'success':riskScore<65?'partial':'at-risk'
    const team = members.slice(0,teamSize).map(m=>({...m,deployed:true}))
    const edits: string[] = []
    if(riskScore>50) edits.push('Extend initial deployment window by 2 weeks to reduce exposure')
    if(teamSize<3)   edits.push('Increase minimum staffing clause to 3 field reps')
    if(si===1)       edits.push('Add 30-day performance review checkpoint')
    if(hotCells>4)   edits.push('Request territory exclusivity for identified high-heat zones')
    edits.push('Add force-majeure provision covering team availability gaps')
    const timeline = [{label:'Kick-off',days:0},{label:'Team deploy',days:3+si},{label:'30-day review',days:30},{label:'Mid-contract',days:45+si*5},{label:'Close / renew',days:90}]
    return {id:si,label:cfg.label,coverage,riskScore,confidence,outcome,team,grid,contractEdits:edits,timeline}
  })
}

const cellBg: Record<GridCell['kind'],string> = {
  hot:    'rgba(248,113,113,0.85)',
  warm:   'rgba(251,191,36,0.60)',
  cool:   'rgba(96,165,250,0.30)',
  cold:   'rgba(255,255,255,0.03)',
  deploy: 'rgba(52,211,153,0.85)',
}

function SimGrid({grid}: {grid: GridCell[]}) {
  return (
    <div style={{display:'grid',gridTemplateColumns:`repeat(${GRID_COLS},1fr)`,gap:'2px'}} className="w-full rounded-xl overflow-hidden">
      {grid.map((cell,i)=>(
        <div key={i} title={cell.label||cell.kind} style={{aspectRatio:'1',background:cellBg[cell.kind],borderRadius:'3px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'8px',fontWeight:700,color:cell.kind==='deploy'?'#064e3b':cell.kind==='hot'?'#fff':'transparent'}}>
          {cell.label||''}
        </div>
      ))}
    </div>
  )
}

const OC = {
  success:  {label:'High confidence',badgeCls:'sc-badge sc-badge-green'},
  partial:  {label:'Moderate risk',  badgeCls:'sc-badge sc-badge-amber'},
  'at-risk':{label:'At risk',        badgeCls:'sc-badge sc-badge-red'},
}

export default function SimulationPage() {
  const [profile,   setProfile]   = useState<Profile|null>(null)
  const [members,   setMembers]   = useState<Profile[]>([])
  const [loading,   setLoading]   = useState(true)
  const [contract,  setContract]  = useState('')
  const [running,   setRunning]   = useState(false)
  const [scenarios, setScenarios] = useState<SimScenario[]>([])
  const [active,    setActive]    = useState(0)
  const [phase,     setPhase]     = useState<'input'|'results'>('input')
  const [simM,      setSimM]      = useState<SimMember[]>([])
  const [expandEdit,setExpandEdit]= useState(false)
  const router  = useRouter()
  const supabase = createClient()

  useEffect(()=>{
    async function load(){
      const {data:{user}} = await supabase.auth.getUser()
      if(!user){router.push('/auth/login');return}
      const {data:prof} = await supabase.from('profiles').select('*').eq('id',user.id).single()
      if(!prof||(prof.role!=='host'&&prof.role!=='cohost')){router.push('/dashboard');return}
      setProfile(prof)
      const {data:team} = await supabase.from('profiles').select('*').eq('organisation_id',prof.organisation_id).eq('is_active',true).neq('id',user.id)
      setMembers(team||[])
      setLoading(false)
    }
    load()
  },[])

  const runSim = useCallback(()=>{
    if(!contract.trim()) return
    setRunning(true)
    setTimeout(()=>{
      const scored = scoreMembers(members,contract)
      setSimM(scored)
      setScenarios(runSimulations(contract,scored))
      setActive(0); setExpandEdit(false); setRunning(false); setPhase('results')
    },1200)
  },[contract,members])

  if(loading) return <main className="min-h-screen bg-page text-hi flex items-center justify-center"><div className="text-dim text-sm">Loading…</div></main>
  if(!profile) return null

  const best = scenarios.length ? scenarios.reduce((b,s)=>s.riskScore<b.riskScore?s:b,scenarios[0]) : null
  const sc   = scenarios[active]

  return (
    <main className="sc-enter min-h-screen bg-page text-hi pb-32">
      <AppHeader organisationId={profile.organisation_id} title="Simulation" subtitle="Scenario planning · Team deployment" />
      <div className="px-5 space-y-5">

        {/* Contract input */}
        <div className="sc-card-depth p-4 space-y-3">
          <h2 className="sc-section-label">Contract / Opportunity Brief</h2>
          <p className="text-xs text-dim leading-relaxed">Paste a contract, describe an opportunity, or outline the scope. The engine identifies risk zones and models team deployment scenarios.</p>
          <textarea value={contract} onChange={e=>setContract(e.target.value)} rows={6}
            placeholder="Paste contract text, opportunity description, territory details, deadlines, deliverables…"
            className="w-full bg-well border border-rim rounded-xl px-4 py-3 text-sm text-hi placeholder-dim resize-none focus:outline-none focus:border-blue-500/60 transition" />
          <button onClick={runSim} disabled={running||!contract.trim()}
            className="w-full font-bold py-3 rounded-xl transition text-sm text-white disabled:opacity-40"
            style={{background:running?'rgba(var(--sc-brand-rgb),0.5)':'var(--sc-brand)'}}>
            {running
              ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.3"/><path d="M12 2a10 10 0 010 20" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>Running simulation…</span>
              : phase==='results' ? '↺ Re-run Simulation' : '▶ Run Simulation'}
          </button>
        </div>

        {phase==='results' && scenarios.length>0 && (<>
          {best && (
            <div className="sc-feed-item flex items-start gap-3 p-4" style={{borderLeftColor:'#4ade80'}}>
              <span className="text-xl mt-0.5">🏆</span>
              <div>
                <p className="text-sm font-black text-hi">Recommended: {best.label}</p>
                <p className="text-xs text-dim mt-0.5">{best.coverage}% coverage · {best.confidence}% confidence · Risk {best.riskScore}/100</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {scenarios.map((s,i)=>(
              <button key={s.id} onClick={()=>setActive(i)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${active===i?'text-white border-blue-500/60':'text-dim border-rim bg-well hover:border-rim2'}`}
                style={active===i?{background:'var(--sc-brand)',borderColor:'var(--sc-brand)'}:{}}>
                {s.label}{i===scenarios.indexOf(best!)?<span className="ml-1 text-yellow-400">★</span>:null}
              </button>
            ))}
          </div>

          {sc && (<>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                {label:'Coverage',   value:`${sc.coverage}%`,    color:sc.coverage>85?'#4ade80':'#fbbf24'},
                {label:'Risk',       value:`${sc.riskScore}`,     color:sc.riskScore<40?'#4ade80':sc.riskScore<65?'#fbbf24':'#f87171'},
                {label:'Confidence', value:`${sc.confidence}%`,   color:sc.confidence>80?'#4ade80':'#38bdf8'},
              ].map(stat=>(
                <div key={stat.label} className="sc-stat-tile text-center">
                  <div className="text-3xl font-black leading-none mb-1" style={{color:stat.color}}>{stat.value}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-dim">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="sc-card-depth p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-dim">Deployment Grid</h3>
                <span className={OC[sc.outcome].badgeCls}>{OC[sc.outcome].label}</span>
              </div>
              <SimGrid grid={sc.grid} />
              <div className="flex flex-wrap gap-3 text-[10px] text-dim">
                {[{color:'rgba(248,113,113,0.85)',label:'Hot zone'},{color:'rgba(251,191,36,0.60)',label:'Warm zone'},{color:'rgba(96,165,250,0.30)',label:'Low activity'},{color:'rgba(52,211,153,0.85)',label:'Team deploy'}].map(l=>(
                  <span key={l.label} className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{background:l.color}}/>{l.label}</span>
                ))}
              </div>
            </div>

            <div className="sc-card-depth p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-dim">Mission Timeline</h3>
              <div className="relative pl-4">
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-rim rounded-full"/>
                {sc.timeline.map((t,i)=>(
                  <div key={i} className="relative flex items-center gap-3 mb-3 last:mb-0">
                    <div className="absolute -left-1.5 w-3 h-3 rounded-full border-2 border-blue-500 bg-page"/>
                    <div className="pl-2"><p className="text-xs font-bold text-hi">{t.label}</p><p className="text-[10px] text-dim">Day {t.days}</p></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sc-card-depth p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-dim">Suggested Team ({sc.team.length})</h3>
              {sc.team.length===0 && <p className="text-xs text-dim">No active team members. Add employees first.</p>}
              <div className="space-y-2">
                {sc.team.map(m=>(
                  <div key={m.id} className="sc-feed-item flex items-center gap-3" style={{borderLeftColor:m.tenure.color}}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{background:'rgba(var(--sc-brand-rgb),0.15)',color:'var(--sc-brand)'}}>
                      {m.name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-bold text-hi truncate">{m.name}</p><p className="text-xs text-dim">{m.group}</p></div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="sc-badge sc-badge-gray text-[9px]">{m.tenure.label}</span>
                      <span className="text-[10px] font-bold" style={{color:m.score>75?'#4ade80':m.score>50?'#fbbf24':'#94a3b8'}}>Fit {m.score}%</span>
                    </div>
                  </div>
                ))}
                {simM.length>sc.team.length && (
                  <details className="mt-1">
                    <summary className="text-xs text-dim cursor-pointer select-none py-1">+ {simM.length-sc.team.length} bench member{simM.length-sc.team.length>1?'s':''}</summary>
                    <div className="mt-2 space-y-1.5 opacity-50">
                      {simM.slice(sc.team.length).map(m=>(
                        <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-well">
                          <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-hi truncate">{m.name}</p></div>
                          <span className="text-[9px] text-dim">{m.tenure.label}</span>
                          <span className="text-[9px] font-bold text-dim">Fit {m.score}%</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>

            <div className="sc-card-depth p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-dim">Contract Adjustments</h3>
                <button onClick={()=>setExpandEdit(!expandEdit)} className="text-xs text-blue-400 font-semibold">{expandEdit?'Collapse':'Expand'}</button>
              </div>
              <p className="text-xs text-dim leading-relaxed">Based on <strong className="text-hi">{sc.label}</strong> scenario — apply before next client meeting:</p>
              <div className={`space-y-2 overflow-hidden transition-all ${expandEdit?'':'max-h-40'}`}>
                {sc.contractEdits.map((edit,i)=>(
                  <div key={i} className="sc-feed-item flex items-start gap-2 py-2.5" style={{borderLeftColor:'#38bdf8'}}>
                    <span className="text-blue-400 mt-0.5 shrink-0 text-xs font-bold">{i+1}</span>
                    <p className="text-xs text-hi leading-relaxed">{edit}</p>
                  </div>
                ))}
              </div>
              {!expandEdit && sc.contractEdits.length>2 && (
                <button onClick={()=>setExpandEdit(true)} className="w-full text-xs text-blue-400 font-semibold py-1.5 border border-blue-500/20 rounded-lg hover:bg-blue-900/10 transition">See all {sc.contractEdits.length} suggestions</button>
              )}
            </div>

            <div className="sc-card-depth p-4 space-y-3 border border-green-700/30 bg-green-900/10">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <p className="text-sm font-black text-hi">Don&apos;t lose the opportunity</p>
                  <p className="text-xs text-dim mt-0.5 leading-relaxed">Apply the <strong className="text-hi">{best?.label}</strong> scenario&apos;s recommendations to your contract draft and schedule a follow-up meeting.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <a href="/intelligence" className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl border border-green-600/40 text-green-400 hover:bg-green-900/20 transition">Open Contracts</a>
                <a href="/reminders" className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl text-white transition" style={{background:'var(--sc-brand)'}}>Schedule Meeting</a>
              </div>
            </div>
          </>)}
        </>)}

        {phase==='input' && !running && (
          <div className="sc-card-depth px-5 py-10 text-center border-dashed border-rim2">
            <p className="text-4xl mb-3">🧭</p>
            <p className="text-sm font-bold text-hi">Paste a contract to begin</p>
            <p className="text-xs text-dim mt-1 leading-relaxed max-w-xs mx-auto">The simulation engine maps your team to the opportunity, identifies risk zones, and suggests the best deployment strategy.</p>
          </div>
        )}
      </div>
      <Nav role={profile.role} />
    </main>
  )
}
