'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { format, differenceInDays, isPast, isToday } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  ArrowLeft, Plus, Trash2, Upload, Download, AlertCircle,
  Clock, CheckSquare, Square, Users, File, FolderOpen,
} from 'lucide-react'
import type { Project, Task, Participant, ProjectFile } from '@/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

// Columns shown per template
const TEMPLATE_COLS: Record<string, (keyof Participant)[]> = {
  overnight: ['name', 'rolle', 'anwesend', 'gruppenname', 'raum', 'ueber_nacht', 'buffet', 'gegangen', 'sonstiges'],
  daytrip:   ['name', 'rolle', 'anwesend', 'gruppenname', 'gegangen', 'sonstiges'],
  meeting:   ['name', 'rolle', 'anwesend', 'sonstiges'],
}

const COL_LABELS: Record<string, string> = {
  name: 'Name', rolle: 'Rolle', anwesend: 'Anwesend', gruppenname: 'Gruppe',
  raum: 'Raum', ueber_nacht: 'Ü.Nacht', buffet: 'Buffet', gegangen: 'Gegangen', sonstiges: 'Sonstiges',
}

const BOOL_COLS = new Set(['anwesend', 'ueber_nacht', 'gegangen'])

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function DeadlineChip({ deadline }: { deadline: string }) {
  const date = parseLocalDate(deadline)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysLeft = differenceInDays(date, today)
  if (isPast(date) && !isToday(date))
    return <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle size={10} /> Überfällig</span>
  if (daysLeft <= 2)
    return <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle size={10} /> {daysLeft === 0 ? 'Heute' : `${daysLeft}d`}</span>
  if (daysLeft <= 6)
    return <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock size={10} /> {daysLeft}d</span>
  return <span className="text-xs text-gray-500">{format(date, 'd. MMM', { locale: de })}</span>
}

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [tab, setTab] = useState<'aufgaben' | 'teilnehmer' | 'dateien'>('aufgaben')

  // Task form
  const [newTask, setNewTask] = useState({ aufgabe: '', beschreibung: '', verantwortliche: '', deadline: '' })
  const [showTaskForm, setShowTaskForm] = useState(false)

  // Participant form
  const [newParticipant, setNewParticipant] = useState({ name: '', rolle: '' })
  const [showParticipantForm, setShowParticipantForm] = useState(false)

  // File upload
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)

  const supabase = createClient()

  async function loadAll() {
    const [projRes, tasksRes, partRes, filesRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at'),
      supabase.from('participants').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('project_files').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    ])
    setProject(projRes.data)
    setTasks(tasksRes.data ?? [])
    setParticipants(partRes.data ?? [])
    setFiles(filesRes.data ?? [])
  }

  useEffect(() => { loadAll() }, [projectId])

  // Tasks
  async function addTask() {
    if (!newTask.aufgabe.trim()) return
    await supabase.from('tasks').insert({
      project_id: projectId,
      aufgabe: newTask.aufgabe.trim(),
      beschreibung: newTask.beschreibung.trim() || null,
      verantwortliche: newTask.verantwortliche.trim() || null,
      deadline: newTask.deadline || null,
    })
    setNewTask({ aufgabe: '', beschreibung: '', verantwortliche: '', deadline: '' })
    setShowTaskForm(false)
    loadAll()
  }

  async function toggleTask(id: string, erledigt: boolean) {
    await supabase.from('tasks').update({ erledigt: !erledigt }).eq('id', id)
    setTasks(tasks.map(t => t.id === id ? { ...t, erledigt: !erledigt } : t))
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(tasks.filter(t => t.id !== id))
  }

  // Participants
  async function addParticipant() {
    if (!newParticipant.name.trim()) return
    await supabase.from('participants').insert({
      project_id: projectId,
      name: newParticipant.name.trim(),
      rolle: newParticipant.rolle.trim() || null,
      sort_order: participants.length,
    })
    setNewParticipant({ name: '', rolle: '' })
    setShowParticipantForm(false)
    loadAll()
  }

  async function updateParticipant(id: string, field: string, value: string | boolean | null) {
    await supabase.from('participants').update({ [field]: value }).eq('id', id)
    setParticipants(participants.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  async function deleteParticipant(id: string) {
    await supabase.from('participants').delete().eq('id', id)
    setParticipants(participants.filter(p => p.id !== id))
  }

  // Files
  async function uploadProjectFile() {
    if (!uploadFile) return
    if (!ALLOWED_TYPES.includes(uploadFile.type)) {
      setUploadError('Nur PDF oder Word-Dateien erlaubt.')
      return
    }
    if (uploadFile.size > MAX_FILE_SIZE) {
      setUploadError('Datei zu groß (max. 10 MB).')
      return
    }
    setUploading(true)
    setUploadError('')
    const filePath = `project-files/${projectId}/${Date.now()}_${uploadFile.name}`
    const { error } = await supabase.storage.from('project-files').upload(filePath, uploadFile)
    if (error) { setUploadError('Upload fehlgeschlagen.'); setUploading(false); return }
    await supabase.from('project_files').insert({
      project_id: projectId,
      file_name: uploadFile.name,
      file_path: filePath,
      file_size: uploadFile.size,
    })
    setUploadFile(null)
    setUploading(false)
    loadAll()
  }

  async function downloadFile(filePath: string, fileName: string) {
    const { data } = await supabase.storage.from('project-files').download(filePath)
    if (data) {
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url; a.download = fileName; a.click()
      URL.revokeObjectURL(url)
    }
  }

  async function deleteFile(id: string, filePath: string) {
    if (!confirm('Datei wirklich löschen?')) return
    await supabase.storage.from('project-files').remove([filePath])
    await supabase.from('project_files').delete().eq('id', id)
    loadAll()
  }

  if (!project) return <div className="p-6 text-gray-500">Laden…</div>

  const cols = project.participant_template ? TEMPLATE_COLS[project.participant_template] : TEMPLATE_COLS.meeting

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/projekte" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
          {project.description && <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'aufgaben', label: `Aufgaben (${tasks.filter(t => !t.erledigt).length})` },
          ...(project.has_participant_list ? [{ key: 'teilnehmer', label: `Teilnehmer*innen (${participants.length})` }] : []),
          { key: 'dateien', label: `Dateien (${files.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Aufgaben Tab */}
      {tab === 'aufgaben' && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setShowTaskForm(!showTaskForm)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={16} /> Aufgabe hinzufügen
            </button>
          </div>

          {showTaskForm && (
            <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Aufgabe *</label>
                  <input
                    type="text"
                    value={newTask.aufgabe}
                    onChange={e => setNewTask({ ...newTask, aufgabe: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Was ist zu tun?"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Verantwortliche*r</label>
                  <input
                    type="text"
                    value={newTask.verantwortliche}
                    onChange={e => setNewTask({ ...newTask, verantwortliche: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Name der Person"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Beschreibung</label>
                  <input
                    type="text"
                    value={newTask.beschreibung}
                    onChange={e => setNewTask({ ...newTask, beschreibung: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={newTask.deadline}
                    onChange={e => setNewTask({ ...newTask, deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addTask} disabled={!newTask.aufgabe.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Hinzufügen</button>
                <button onClick={() => setShowTaskForm(false)} className="px-3 py-2 text-gray-600 text-sm">Abbrechen</button>
              </div>
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <CheckSquare size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Noch keine Aufgaben</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600 w-8"></th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Aufgabe</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Beschreibung</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Verantwortliche*r</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Deadline</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...tasks].sort((a, b) => {
                    if (a.erledigt !== b.erledigt) return a.erledigt ? 1 : -1
                    if (!a.deadline && !b.deadline) return 0
                    if (!a.deadline) return 1
                    if (!b.deadline) return -1
                    return a.deadline.localeCompare(b.deadline)
                  }).map(task => (
                    <tr key={task.id} className={`hover:bg-gray-50 ${task.erledigt ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleTask(task.id, task.erledigt)}>
                          {task.erledigt
                            ? <CheckSquare size={18} className="text-blue-600" />
                            : <Square size={18} className="text-gray-400" />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <span className={task.erledigt ? 'line-through' : ''}>{task.aufgabe}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{task.beschreibung || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{task.verantwortliche || '—'}</td>
                      <td className="px-4 py-3">
                        {task.deadline && !task.erledigt
                          ? <DeadlineChip deadline={task.deadline} />
                          : task.deadline
                          ? <span className="text-xs text-gray-400">{format(parseLocalDate(task.deadline), 'd. MMM', { locale: de })}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteTask(task.id)} className="p-1 text-gray-300 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Teilnehmer*innen Tab */}
      {tab === 'teilnehmer' && project.has_participant_list && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setShowParticipantForm(!showParticipantForm)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={16} /> Person hinzufügen
            </button>
          </div>

          {showParticipantForm && (
            <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input
                  type="text"
                  value={newParticipant.name}
                  onChange={e => setNewParticipant({ ...newParticipant, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Name"
                  autoFocus
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Rolle</label>
                <input
                  type="text"
                  value={newParticipant.rolle}
                  onChange={e => setNewParticipant({ ...newParticipant, rolle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. SV-Mitglied"
                />
              </div>
              <button onClick={addParticipant} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Hinzufügen</button>
              <button onClick={() => setShowParticipantForm(false)} className="px-3 py-2 text-gray-600 text-sm">✕</button>
            </div>
          )}

          {participants.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <Users size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Noch keine Teilnehmer*innen</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {cols.map(col => (
                      <th key={col} className="text-left px-2 py-2 font-medium text-gray-600 whitespace-nowrap text-xs">
                        {COL_LABELS[col]}
                      </th>
                    ))}
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {participants.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      {cols.map(col => (
                        <td key={col} className="px-1 py-1">
                          {BOOL_COLS.has(col) ? (
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                checked={!!(p[col as keyof Participant])}
                                onChange={e => updateParticipant(p.id, col, e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={(p[col as keyof Participant] as string) ?? ''}
                              onChange={e => updateParticipant(p.id, col, e.target.value)}
                              className="min-w-[60px] px-1.5 py-0.5 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm focus:outline-none bg-transparent"
                              placeholder="—"
                            />
                          )}
                        </td>
                      ))}
                      <td className="px-1 py-1">
                        <button onClick={() => deleteParticipant(p.id)} className="p-1 text-gray-300 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Dateien Tab */}
      {tab === 'dateien' && (
        <div>
          <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl">
            <label className="block text-sm font-medium text-gray-700 mb-2">Datei hochladen (PDF oder Word, max. 10 MB)</label>
            <div className="flex gap-2 items-center">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={e => { setUploadFile(e.target.files?.[0] ?? null); setUploadError('') }}
                className="flex-1 text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:border file:border-gray-300 file:rounded-lg file:text-sm file:bg-white file:text-gray-700 hover:file:bg-gray-50"
              />
              <button
                onClick={uploadProjectFile}
                disabled={!uploadFile || uploading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
              >
                <Upload size={14} /> {uploading ? 'Hochladen…' : 'Hochladen'}
              </button>
            </div>
            {uploadError && <p className="text-sm text-red-600 mt-2">{uploadError}</p>}
          </div>

          {files.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <FolderOpen size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Noch keine Dateien hochgeladen</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map(file => (
                <div key={file.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl group">
                  <File size={18} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.file_name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.file_size / 1024).toFixed(0)} KB · {format(new Date(file.created_at), 'd. MMM yyyy', { locale: de })}
                    </p>
                  </div>
                  <button
                    onClick={() => downloadFile(file.file_path, file.file_name)}
                    className="p-1.5 text-gray-400 hover:text-blue-600"
                  >
                    <Download size={15} />
                  </button>
                  <button
                    onClick={() => deleteFile(file.id, file.file_path)}
                    className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
