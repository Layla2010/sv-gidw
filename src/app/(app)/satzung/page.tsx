'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, Trash2 } from 'lucide-react'
import type { SatzungFile, Profile } from '@/types'
import ConfirmDialog from '@/components/ConfirmDialog'

const MAX_FILE_SIZE = 10 * 1024 * 1024

export default function SatzungPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [file, setFile] = useState<SatzungFile | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
    }
    const { data } = await supabase
      .from('satzung_files')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (data) {
      setFile(data)
      const { data: signed } = await supabase.storage.from('satzung').createSignedUrl(data.file_path, 3600)
      setPdfUrl(signed?.signedUrl ?? null)
    } else {
      setFile(null)
      setPdfUrl(null)
    }
  }

  async function upload() {
    if (!uploadFile) return
    if (uploadFile.type !== 'application/pdf') { setUploadError('Nur PDF-Dateien erlaubt.'); return }
    if (uploadFile.size > MAX_FILE_SIZE) { setUploadError('Datei zu groß (max. 10 MB).'); return }
    setUploading(true)
    setUploadError('')
    const filePath = `satzung/${Date.now()}_${uploadFile.name}`
    const { error } = await supabase.storage.from('satzung').upload(filePath, uploadFile)
    if (error) { setUploadError('Upload fehlgeschlagen.'); setUploading(false); return }
    await supabase.from('satzung_files').insert({ file_name: uploadFile.name, file_path: filePath, file_size: uploadFile.size })
    setUploadFile(null)
    setUploading(false)
    loadData()
  }

  async function deleteFile() {
    if (!file) return
    await supabase.storage.from('satzung').remove([file.file_path])
    await supabase.from('satzung_files').delete().eq('id', file.id)
    setConfirmDelete(false)
    setFile(null)
    setPdfUrl(null)
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {confirmDelete && (
        <ConfirmDialog
          message="Die Satzung wird unwiderruflich gelöscht."
          onConfirm={deleteFile}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <div className="flex items-center justify-between mb-6 group">
        <h1 className="text-2xl font-semibold text-gray-900">SV-Satzung</h1>

        {isAdmin && (
          <div className="flex items-center gap-2">
            {file && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100"
              >
                <Trash2 size={15} />
              </button>
            )}
            <input type="file" accept=".pdf" id="satzung-upload" className="hidden"
              onChange={e => { setUploadFile(e.target.files?.[0] ?? null); setUploadError('') }} />
            <label htmlFor="satzung-upload"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 cursor-pointer">
              <Upload size={13} /> {uploadFile ? uploadFile.name : 'PDF hochladen'}
            </label>
            {uploadFile && (
              <button onClick={upload} disabled={uploading}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                {uploading ? '…' : 'Hochladen'}
              </button>
            )}
          </div>
        )}
      </div>

      {uploadError && <p className="text-sm text-red-600 mb-4">{uploadError}</p>}

      {pdfUrl ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <iframe src={pdfUrl} className="w-full h-[80vh]" title="SV-Satzung" />
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-500 font-medium">Noch keine Satzung hochgeladen</p>
          {isAdmin && <p className="text-sm text-gray-400 mt-1">Fahre über den Titel um eine PDF hochzuladen.</p>}
        </div>
      )}
    </div>
  )
}
