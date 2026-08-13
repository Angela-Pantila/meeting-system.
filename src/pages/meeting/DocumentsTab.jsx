import { useRef, useState } from 'react'
import { Download, FileText, Trash2, Upload } from 'lucide-react'
import { supabase, STORAGE_BUCKET } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Alert, EmptyState } from '../../components/ui'
import { formatDateTime } from '../../lib/utils'

export default function DocumentsTab({ meetingId, documents, setDocuments, canManage }) {
  const { user } = useAuth()
  const inputRef = useRef(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const path = `${meetingId}/${Date.now()}_${file.name}`

    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: false })
    if (upErr) {
      setError(upErr.message)
      setUploading(false)
      return
    }

    const { data, error: insErr } = await supabase
      .from('meeting_documents')
      .insert({
        meeting_id: meetingId,
        name: file.name,
        file_path: path,
        file_type: file.type,
        size_bytes: file.size,
        uploaded_by: user.id,
      })
      .select('*, uploader:profiles(full_name)')
      .single()
    setUploading(false)
    if (insErr) {
      await supabase.storage.from(STORAGE_BUCKET).remove([path])
      setError(insErr.message)
      return
    }
    setDocuments((prev) => [...prev, data])
    if (inputRef.current) inputRef.current.value = ''
  }

  const download = async (doc) => {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(doc.file_path, 3600)
    if (error || !data?.signedUrl) {
      setError(error?.message || 'Could not generate download link.')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  const remove = async (doc) => {
    const { error } = await supabase.from('meeting_documents').delete().eq('id', doc.id)
    if (error) {
      setError(error.message)
      return
    }
    await supabase.storage.from(STORAGE_BUCKET).remove([doc.file_path])
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">
          Documents ({documents.length})
        </h3>
        {canManage && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn-primary px-3 py-1.5 text-xs"
          >
            <Upload size={14} />
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        )}
        <input ref={inputRef} type="file" className="hidden" onChange={upload} />
      </div>

      {error && <Alert>{error}</Alert>}

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents"
          message="Upload agendas, reports or minutes to attach to this meeting."
        />
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <FileText size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{doc.name}</p>
                <p className="text-xs text-slate-500">
                  {formatSize(doc.size_bytes)}
                  {doc.uploader?.full_name && ` · ${doc.uploader.full_name}`}
                  {` · ${formatDateTime(doc.created_at)}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => download(doc)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                  aria-label="Download"
                >
                  <Download size={16} />
                </button>
                {canManage && (
                  <button
                    onClick={() => remove(doc)}
                    className="rounded-lg p-2 text-slate-400 hover:text-rose-600"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
