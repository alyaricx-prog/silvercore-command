'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import type { Profile, Assignment } from '@/lib/types'

type Document = {
  id: string
  organisation_id: string
  assignment_id: string | null
  uploaded_by: string | null
  name: string
  file_path: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
}

function formatBytes(n: number | null) {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mime: string | null) {
  if (!mime) return '📄'
  if (mime.startsWith('image/')) return '🖼️'
  if (mime === 'application/pdf') return '📕'
  if (mime.includes('word') || mime.includes('document')) return '📝'
  if (mime.includes('sheet') || mime.includes('excel')) return '📊'
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('compressed')) return '🗜️'
  return '📄'
}

export default function VaultPage() {
  const [profile, setProfile]       = useState<Profile | null>(null)
  const [documents, setDocuments]   = useState<Document[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [profiles, setProfiles]     = useState<Profile[]>([])
  const [loading, setLoading]       = useState(true)
  const [uploading, setUploading]   = useState(false)
  const [filterAssignment, setFilterAssignment] = useState('')
  const [search, setSearch]         = useState('')
  const [uploadError, setUploadError] = useState('')
  const [selectedAssignment, setSelectedAssignment] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { router.push('/auth/login'); return }
      setProfile(prof)

      const [docRes, assRes, profRes] = await Promise.all([
        supabase.from('documents').select('*')
          .eq('organisation_id', prof.organisation_id)
          .order('created_at', { ascending: false }),
        supabase.from('assignments').select('*')
          .eq('organisation_id', prof.organisation_id).limit(200),
        supabase.from('profiles').select('*')
          .eq('organisation_id', prof.organisation_id),
      ])
      setDocuments(docRes.data || [])
      setAssignments(assRes.data || [])
      setProfiles(profRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const isHost = profile?.role === 'host' || profile?.role === 'cohost'

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploading(true)
    setUploadError('')

    const ext = file.name.split('.').pop()
    const path = `${profile.organisation_id}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`

    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(path, file, { contentType: file.type })

    if (storageError) {
      setUploadError(storageError.message.includes('Bucket not found')
        ? 'Storage bucket not set up yet. Create a "documents" bucket in Supabase Storage.'
        : storageError.message)
      setUploading(false)
      return
    }

    const { data, error: dbError } = await supabase.from('documents').insert({
      organisation_id: profile.organisation_id,
      uploaded_by: profile.id,
      assignment_id: selectedAssignment || null,
      name: file.name,
      file_path: path,
      mime_type: file.type || null,
      size_bytes: file.size,
    }).select().single()

    if (!dbError && data) {
      setDocuments(prev => [data, ...prev])
      setSelectedAssignment('')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
    setUploading(false)
  }

  async function handleDownload(doc: Document) {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 60)
    if (error || !data) {
      alert('Could not generate download link: ' + (error?.message || 'unknown error'))
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Delete "${doc.name}"?`)) return
    await supabase.storage.from('documents').remove([doc.file_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    setDocuments(prev => prev.filter(d => d.id !== doc.id))
  }

  const filtered = documents
    .filter(d => !filterAssignment || d.assignment_id === filterAssignment)
    .filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()))

  const orgWide  = filtered.filter(d => !d.assignment_id)
  const withAssignment = filtered.filter(d => d.assignment_id)

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--sc-page)' }}>
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-screen pb-20" style={{ background: 'var(--sc-page)', color: 'var(--sc-hi)' }}>
      <div className="max-w-lg mx-auto px-4 pt-14">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Document Vault</h1>
            <p className="text-xs text-dim mt-0.5">{documents.length} file{documents.length !== 1 ? 's' : ''}</p>
          </div>
          {isHost && (
            <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold cursor-pointer">
              <input
                type="file" ref={fileInputRef} className="hidden"
                onChange={handleUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.zip,.txt,.csv"
              />
              {uploading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-base leading-none">↑</span>
              )}
              Upload
            </label>
          )}
        </div>

        {/* Upload options (assignment link) */}
        {isHost && (
          <div className="rounded-2xl border border-rim p-3 mb-4 flex items-center gap-3"
               style={{ background: 'var(--sc-card)' }}>
            <span className="text-xs text-dim whitespace-nowrap">Link to:</span>
            <select
              value={selectedAssignment} onChange={e => setSelectedAssignment(e.target.value)}
              className="flex-1 rounded-lg px-2 py-1.5 text-xs border border-rim2 outline-none focus:border-blue-500"
              style={{ background: 'var(--sc-well)', color: 'var(--sc-hi)' }}
            >
              <option value="">Org-wide (no specific job)</option>
              {assignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.address.substring(0, 40)} {a.group_name ? `· ${a.group_name}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {uploadError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs p-3 mb-4">
            ⚠️ {uploadError}
          </div>
        )}

        {/* Search + filter */}
        <div className="flex gap-2 mb-5">
          <input
            type="text" placeholder="Search files…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 text-sm border border-rim2 outline-none focus:border-blue-500"
            style={{ background: 'var(--sc-well)', color: 'var(--sc-hi)' }}
          />
          <select
            value={filterAssignment} onChange={e => setFilterAssignment(e.target.value)}
            className="rounded-xl px-3 py-2 text-sm border border-rim2 outline-none focus:border-blue-500 max-w-[140px]"
            style={{ background: 'var(--sc-well)', color: 'var(--sc-hi)' }}
          >
            <option value="">All files</option>
            <option value="__orgwide">Org-wide only</option>
            {assignments.map(a => (
              <option key={a.id} value={a.id}>{a.address.substring(0, 25)}…</option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📁</p>
            <p className="font-semibold text-sm">No documents yet</p>
            {isHost && <p className="text-xs text-dim mt-1">Upload files to share with your team.</p>}
          </div>
        ) : (
          <>
            {/* Org-wide section */}
            {orgWide.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-semibold text-dim uppercase tracking-widest mb-2">Organisation</h2>
                <div className="space-y-2">
                  {orgWide.map(doc => (
                    <DocCard key={doc.id} doc={doc} profiles={profiles}
                      onDownload={() => handleDownload(doc)}
                      onDelete={isHost ? () => handleDelete(doc) : undefined}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Per-assignment sections */}
            {withAssignment.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-dim uppercase tracking-widest mb-2">By Assignment</h2>
                <div className="space-y-2">
                  {withAssignment.map(doc => {
                    const linked = assignments.find(a => a.id === doc.assignment_id)
                    return (
                      <DocCard key={doc.id} doc={doc} profiles={profiles}
                        assignment={linked}
                        onDownload={() => handleDownload(doc)}
                        onDelete={isHost ? () => handleDelete(doc) : undefined}
                      />
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* Storage setup note for hosts */}
        {isHost && documents.length === 0 && (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
            <p className="font-semibold mb-1">⚙️ One-time setup required</p>
            <p>Go to <strong>Supabase → Storage → New bucket</strong>, name it <code>documents</code>, and set it to private. Then uploads will work here.</p>
          </div>
        )}
      </div>
      <Nav role={profile!.role} />
    </main>
  )
}

type DocCardProps = {
  doc: Document
  profiles: { id: string; full_name: string }[]
  assignment?: { address: string; group_name?: string | null } | undefined
  onDownload: () => void
  onDelete?: () => void
}

function DocCard({ doc, profiles, assignment, onDownload, onDelete }: DocCardProps) {
  const uploader = profiles.find(p => p.id === doc.uploaded_by)
  return (
    <div className="rounded-2xl border border-rim p-3 flex items-center gap-3 sc-enter"
         style={{ background: 'var(--sc-card)' }}>
      <span className="text-2xl shrink-0">{fileIcon(doc.mime_type)}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{doc.name}</p>
        <div className="flex items-center gap-2 flex-wrap text-xs text-dim mt-0.5">
          {doc.size_bytes && <span>{formatBytes(doc.size_bytes)}</span>}
          {uploader && <span>· {uploader.full_name}</span>}
          {assignment && (
            <span className="truncate">· 📍 {assignment.address.substring(0, 20)}…</span>
          )}
          <span>· {new Date(doc.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onDownload}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-dim hover:text-blue-400 transition-colors"
          style={{ background: 'var(--sc-well)' }} title="Download">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {onDelete && (
          <button onClick={onDelete}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-dim hover:text-red-400 transition-colors"
            style={{ background: 'var(--sc-well)' }} title="Delete">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
