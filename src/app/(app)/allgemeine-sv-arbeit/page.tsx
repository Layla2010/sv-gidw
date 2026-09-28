'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Plus, FileText, Trash2, Upload, Calendar, File } from 'lucide-react'
import type { Document, Protocol } from '@/types'
import ConfirmDialog from '@/components/ConfirmDialog'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

export default function AllgemeineSVArbeitPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [showNewDoc, setShowNewDoc] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState('')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDate, setUploadDate] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'doc', id: string } | { type: 'protocol', id: string, filePath: string } | null>(null)
  const supabase = createClient()

  async function loadData() {
    const [docsRes, protocolsRes] = await Promise.all([
      supabase.from('documents').select('*').order('updated_at', { ascending: false }),
      supabase.from('protocols').select('*').order('meeting_date', { ascending: false }),
    ])
    setDocuments(docsRes.data ?? [])
    setProtocols(protocolsRes.data ?? [])
  }

  useEffect(() => { loadData() }, [])

  async function createDocument() {
    if (!newDocTitle.trim()) return
    const { data } = await supabase
      .from('documents')
      .insert({ title: newDocTitle.trim(), content: '' })
      .select()
      .single()
    if (data) {
      setNewDocTitle('')
      setShowNewDoc(false)
      loadData()
    }
  }

  async function deleteDocument(id: string) {
    await supabase.from('documents').delete().eq('id', id)
    setConfirmDelete(null)
    loadData()
  }

  async function uploadProtocol() {
    if (!uploadFile || !uploadTitle.trim()) {
      setUploadError('Bitte Titel und Datei angeben.')
      return
    }
    if (!ALLOWED_TYPES.includes(uploadFile.type)) {
      setUploadError('Nur PDF oder Word-Dateien erlaubt.')
      return
    }
    if (uploadFile.size > MAX_FILE_SIZE) {
      setUploadError('Datei zu groß (max. 10 MB).')
      return
    }
    setLoading(true)
    setUploadError('')
    const filePath = `protocols/${Date.now()}_${uploadFile.name}`
    const { error: storageError } = await supabase.storage
      .from('protocols')
      .upload(filePath, uploadFile)
    if (storageError) {
      setUploadError('Upload fehlgeschlagen: ' + storageError.message)
      setLoading(false)
      return
    }
    await supabase.from('protocols').insert({
      title: uploadTitle.trim(),
      meeting_date: new Date().toISOString().split('T')[0],
      file_path: filePath,
      file_name: uploadFile.name,
      file_size: uploadFile.size,
    })
    setUploadTitle('')
    setUploadFile(null)
    setShowUpload(false)
    setLoading(false)
    loadData()
  }

  async function deleteProtocol(id: string, filePath: string) {
    await supabase.storage.from('protocols').remove([filePath])
    await supabase.from('protocols').delete().eq('id', id)
    setConfirmDelete(null)
    loadData()
  }

  async function downloadProtocol(filePath: string, fileName: string) {
    const { data } = await supabase.storage.from('protocols').download(filePath)
    if (data) {
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  // Group protocols by school year
  const groupedProtocols = protocols.reduce<Record<string, Protocol[]>>((acc, p) => {
    const year = new Date(p.meeting_date).getFullYear()
    const month = new Date(p.meeting_date).getMonth()
    const schoolYear = month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`
    if (!acc[schoolYear]) acc[schoolYear] = []
    acc[schoolYear].push(p)
    return acc
  }, {})

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {confirmDelete && (
        <ConfirmDialog
          message={confirmDelete.type === 'doc' ? 'Das Textfeld wird unwiderruflich gelöscht.' : 'Das Protokoll und die Datei werden unwiderruflich gelöscht.'}
          onConfirm={() => confirmDelete.type === 'doc' ? deleteDocument(confirmDelete.id) : deleteProtocol(confirmDelete.id, confirmDelete.filePath)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Allgemeine SV-Arbeit</h1>

      {/* Textfelder */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Textfelder</h2>
          <button
            onClick={() => setShowNewDoc(!showNewDoc)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus size={16} /> Neues Textfeld
          </button>
        </div>

        {showNewDoc && (
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newDocTitle}
              onChange={e => setNewDocTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createDocument()}
              placeholder="Titel des Textfelds"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={createDocument}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Erstellen
            </button>
            <button
              onClick={() => { setShowNewDoc(false); setNewDocTitle('') }}
              className="px-3 py-2 text-gray-600 hover:text-gray-900 text-sm"
            >
              Abbrechen
            </button>
          </div>
        )}

        {documents.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
            <FileText size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Noch keine Textfelder</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-200 transition-colors group"
              >
                <FileText size={18} className="text-blue-500 flex-shrink-0" />
                <Link
                  href={`/allgemeine-sv-arbeit/${doc.id}`}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">{doc.title}</p>
                  <p className="text-xs text-gray-500">
                    Zuletzt bearbeitet: {format(new Date(doc.updated_at), 'd. MMM yyyy', { locale: de })}
                  </p>
                </Link>
                <button
                  onClick={() => setConfirmDelete({ type: 'doc', id: doc.id })}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-opacity"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Protokolle */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Protokolle und Dokumente</h2>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Upload size={16} /> Datei hochladen
          </button>
        </div>

        {showUpload && (
          <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
              <input
                type="text"
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
                placeholder="z.B. SV-Sitzung Januar"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datei (PDF oder Word, max. 10 MB)</label>
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:border file:border-gray-300 file:rounded-lg file:text-sm file:bg-white file:text-gray-700 hover:file:bg-gray-50"
              />
            </div>
            {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
            <div className="flex gap-2">
              <button
                onClick={uploadProtocol}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Hochladen…' : 'Hochladen'}
              </button>
              <button
                onClick={() => { setShowUpload(false); setUploadError('') }}
                className="px-3 py-2 text-gray-600 hover:text-gray-900 text-sm"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {Object.keys(groupedProtocols).length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
            <Calendar size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Noch keine Protokolle hochgeladen</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(groupedProtocols)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([schoolYear, protos]) => (
                <div key={schoolYear}>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Schuljahr {schoolYear}</h3>
                  <div className="space-y-2">
                    {protos.map(protocol => (
                      <div
                        key={protocol.id}
                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl group"
                      >
                        <File size={18} className="text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{protocol.title}</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(protocol.meeting_date), 'd. MMMM yyyy', { locale: de })}
                          </p>
                        </div>
                        <button
                          onClick={() => downloadProtocol(protocol.file_path, protocol.file_name)}
                          className="text-xs text-blue-600 hover:underline px-2"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ type: 'protocol', id: protocol.id, filePath: protocol.file_path })}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-opacity"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  )
}
