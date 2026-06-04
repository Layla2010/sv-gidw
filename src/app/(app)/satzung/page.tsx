'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Upload, Trash2, BookOpen } from 'lucide-react'
import type { SatzungFile, Profile } from '@/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

export default function SatzungPage() {
  const [files, setFiles] = useState<SatzungFile[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [selectedFile, setSelectedFile] = useState<SatzungFile | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  async function loadData() {
    const [{ data: { user } }] = await Promise.all([supabase.auth.getUser()])
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
    }
    const { data } = await supabase.from('satzung_files').select('*').order('created_at', { ascending: false })
    setFiles(data ?? [])
    if (data && data.length > 0 && !selectedFile) {
      openFile(data[0])
    }
  }

  useEffect(() => { loadData() }, [])

  async function openFile(file: SatzungFile) {
    setSelectedFile(file)
    if (file.file_name.endsWith('.pdf')) {
      const { data } = await supabase.storage.from('satzung').createSignedUrl(file.file_path, 3600)
      setPdfUrl(data?.signedUrl ?? null)
    } else {
      setPdfUrl(null)
    }
  }

  async function uploadSatzung() {
    if (!uploadFile) return
    if (!ALLOWED_TYPES.includes(uploadFile.type)) { setUploadError('Nur PDF oder Word-Dateien erlaubt.'); return }
    if (uploadFile.size > MAX_FILE_SIZE) { setUploadError('Datei zu groß (max. 10 MB).'); return }
    setUploading(true)
    setUploadError('')
    const filePath = `satzung/${Date.now()}_${uploadFile.name}`
    const { error } = await supabase.storage.from('satzung').upload(filePath, uploadFile)
    if (error) { setUploadError('Upload fehlgeschlagen.'); setUploading(false); return }
    await supabase.from('satzung_files').insert({
      file_name: uploadFile.name,
      file_path: filePath,
      file_size: uploadFile.size,
    })
    setUploadFile(null)
    setUploading(false)
    loadData()
  }

  async function deleteFile(id: string, filePath: string) {
    if (!confirm('Datei wirklich löschen?')) return
    await supabase.storage.from('satzung').remove([filePath])
    await supabase.from('satzung_files').delete().eq('id', id)
    if (selectedFile?.id === id) { setSelectedFile(null); setPdfUrl(null) }
    loadData()
  }

  async function downloadFile() {
    if (!selectedFile) return
    const { data } = await supabase.storage.from('satzung').download(selectedFile.file_path)
    if (data) {
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url; a.download = selectedFile.file_name; a.click()
      URL.revokeObjectURL(url)
    }
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">SV-Satzung</h1>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".pdf,.docx"
              id="satzung-upload"
              className="hidden"
              onChange={e => { setUploadFile(e.target.files?.[0] ?? null); setUploadError('') }}
            />
            <label
              htmlFor="satzung-upload"
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <Upload size={15} /> {uploadFile ? uploadFile.name : 'Datei wählen'}
            </label>
            {uploadFile && (
              <button
                onClick={uploadSatzung}
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Hochladen…' : 'Hochladen'}
              </button>
            )}
          </div>
        )}
      </div>

      {uploadError && <p className="text-sm text-red-600 mb-4">{uploadError}</p>}

      {files.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Noch keine Satzung hochgeladen</p>
          {isAdmin && <p className="text-sm text-gray-400 mt-1">Lade die SV-Satzung als PDF oder Word-Datei hoch.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* File list */}
          <div className="lg:col-span-1 space-y-2">
            <h2 className="text-sm font-medium text-gray-600 mb-2">Versionen</h2>
            {files.map(file => (
              <div
                key={file.id}
                onClick={() => openFile(file)}
                className={`flex items-start gap-2 p-3 rounded-xl cursor-pointer border transition-colors ${
                  selectedFile?.id === file.id
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-gray-200 hover:border-blue-200'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.file_name}</p>
                  <p className="text-xs text-gray-500">{format(new Date(file.created_at), 'd. MMM yyyy', { locale: de })}</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={e => { e.stopPropagation(); deleteFile(file.id, file.file_path) }}
                    className="p-1 text-gray-300 hover:text-red-500 flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl overflow-hidden">
            {selectedFile && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{selectedFile.file_name}</p>
                <button
                  onClick={downloadFile}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Herunterladen
                </button>
              </div>
            )}
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-[70vh]"
                title="SV-Satzung"
              />
            ) : selectedFile ? (
              <div className="flex items-center justify-center h-[70vh] text-gray-500 text-sm">
                <p>Vorschau nur für PDFs verfügbar. <button onClick={downloadFile} className="text-blue-600 hover:underline">Datei herunterladen</button></p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
