'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { format, differenceInDays, isPast, isToday } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  ArrowLeft, Plus, Trash2, Upload, Download, AlertCircle,
  Clock, CheckSquare, Square, Users, File, FolderOpen, Pencil, Check, X, Calendar, GripVertical,
} from 'lucide-react'
import type { Project, Task, Participant, ProjectFile, ZeitplanEintrag } from '@/types'
import ConfirmDialog from '@/components/ConfirmDialog'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableColHeader({
  col, label, onDelete,
}: { col: string; label: string; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col })
  return (
    <th
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="text-left px-2 py-2 font-medium text-gray-600 whitespace-nowrap text-xs select-none"
    >
      <span className="flex items-center gap-0.5">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none"
          title="Spalte verschieben"
        >
          <GripVertical size={12} />
        </span>
        {label}
        <button
          onClick={onDelete}
          className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 ml-0.5"
          title={`Spalte "${label}" ausblenden`}
        >
          <X size={11} />
        </button>
      </span>
    </th>
  )
}

function SortableZeitplanColHeader({
  col, label, onDelete,
}: { col: string; label: string; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `zcol-${col}` })
  return (
    <th
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="text-left px-2 py-2 font-medium text-gray-600 whitespace-nowrap text-xs select-none"
    >
      <span className="flex items-center gap-0.5">
        <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none" title="Spalte verschieben">
          <GripVertical size={12} />
        </span>
        {label}
        <button onClick={onDelete} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 ml-0.5" title={`Spalte "${label}" ausblenden`}>
          <X size={11} />
        </button>
      </span>
    </th>
  )
}

function SortableZeitplanRow({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `zrow-${id}` })
  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="hover:bg-gray-50"
    >
      <td className="px-1 py-1 w-5">
        <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none block">
          <GripVertical size={12} />
        </span>
      </td>
      {children}
    </tr>
  )
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

const TEMPLATE_COLS: Record<string, (keyof Participant)[]> = {
  overnight: ['name', 'rolle', 'klasse', 'anwesend', 'gruppenname', 'raum', 'ueber_nacht', 'buffet', 'gegangen'],
  daytrip:   ['name', 'rolle', 'klasse', 'anwesend', 'gruppenname', 'gegangen'],
  meeting:   ['name', 'rolle', 'klasse', 'anwesend'],
}

const COL_LABELS: Record<string, string> = {
  name: 'Name', rolle: 'Rolle', klasse: 'Klasse', anwesend: 'Anwesend', gruppenname: 'Gruppe',
  raum: 'Raum', ueber_nacht: 'Ü.Nacht', buffet: 'Buffet', gegangen: 'Gegangen', sonstiges: 'Sonstiges',
}

const BOOL_COLS = new Set(['anwesend', 'ueber_nacht', 'gegangen'])

const ZEITPLAN_BASE_COLS = ['uhrzeit', 'programmpunkt', 'ort', 'verantwortlich', 'bemerkung']
const ZEITPLAN_COL_LABELS: Record<string, string> = {
  uhrzeit: 'Uhrzeit', programmpunkt: 'Programmpunkt', ort: 'Ort / Raum',
  verantwortlich: 'Verantwortlich', bemerkung: 'Bemerkung',
}
const EMPTY_ZEITPLAN = { uhrzeit: '', datum: '', programmpunkt: '', ort: '', verantwortlich: '', bemerkung: '' }

function sortByUhrzeit(entries: ZeitplanEintrag[]): ZeitplanEintrag[] {
  return [...entries].sort((a, b) => {
    if (!a.uhrzeit && !b.uhrzeit) return 0
    if (!a.uhrzeit) return 1
    if (!b.uhrzeit) return -1
    return a.uhrzeit.localeCompare(b.uhrzeit)
  })
}

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function DeadlineChip({ deadline }: { deadline: string }) {
  const date = parseLocalDate(deadline)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysLeft = differenceInDays(date, today)
  const dateLabel = format(date, 'd. MMM yyyy', { locale: de })

  if (daysLeft > 6)
    return <span className="text-xs text-gray-500">{format(date, 'd. MMM', { locale: de })}</span>

  const chipClass = (isPast(date) && !isToday(date)) || daysLeft <= 2
    ? 'text-red-700 bg-red-100'
    : 'text-yellow-700 bg-yellow-100'

  const label = (isPast(date) && !isToday(date))
    ? 'Überfällig'
    : daysLeft === 0 ? 'Heute' : `${daysLeft}d`

  const Icon = (isPast(date) && !isToday(date)) || daysLeft <= 2 ? AlertCircle : Clock

  return (
    <span className="relative group inline-flex">
      <span className={`cursor-default text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${chipClass}`}>
        <Icon size={10} /> {label}
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {dateLabel}
      </span>
    </span>
  )
}

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [zeitplan, setZeitplan] = useState<ZeitplanEintrag[]>([])
  const [confirmDeleteFileId, setConfirmDeleteFileId] = useState<string | null>(null)
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false)
  const [tab, setTab] = useState<'aufgaben' | 'teilnehmer' | 'dateien' | 'zeitplan'>('aufgaben')

  // Task form
  const [newTask, setNewTask] = useState({ aufgabe: '', beschreibung: '', verantwortliche: '', deadline: '' })
  const [showTaskForm, setShowTaskForm] = useState(false)

  // Task editing
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState({ aufgabe: '', beschreibung: '', verantwortliche: '', deadline: '' })

  // Custom columns
  const [extraColumns, setExtraColumns] = useState<string[]>([])
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([])
  const [orderedColumns, setOrderedColumns] = useState<string[]>([])
  const [newColName, setNewColName] = useState('')
  const [showAddCol, setShowAddCol] = useState(false)
  const [confirmDeleteCol, setConfirmDeleteCol] = useState<{ col: string, isExtra: boolean } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  // Participant form
  const [newParticipant, setNewParticipant] = useState<Record<string, string | boolean>>({})
  const [newParticipantExtra, setNewParticipantExtra] = useState<Record<string, string>>({})
  const [showParticipantForm, setShowParticipantForm] = useState(false)
  const [confirmDeleteParticipantId, setConfirmDeleteParticipantId] = useState<string | null>(null)

  // Zeitplan form
  const [showZeitplanForm, setShowZeitplanForm] = useState(false)
  const [newZeitplan, setNewZeitplan] = useState(EMPTY_ZEITPLAN)
  const [confirmDeleteZeitplanRowId, setConfirmDeleteZeitplanRowId] = useState<string | null>(null)

  // Zeitplan column management
  const [zeitplanExtraColumns, setZeitplanExtraColumns] = useState<string[]>([])
  const [zeitplanHiddenColumns, setZeitplanHiddenColumns] = useState<string[]>([])
  const [zeitplanOrderedColumns, setZeitplanOrderedColumns] = useState<string[]>([])
  const [showAddZeitplanCol, setShowAddZeitplanCol] = useState(false)
  const [newZeitplanColName, setNewZeitplanColName] = useState('')
  const [confirmDeleteZeitplanCol, setConfirmDeleteZeitplanCol] = useState<{ col: string; isExtra: boolean } | null>(null)

  // File upload
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  async function deleteProject() {
    await supabase.from('projects').delete().eq('id', projectId)
    router.push('/projekte')
  }

  async function loadAll() {
    const [projRes, tasksRes, partRes, filesRes, zeitplanRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at'),
      supabase.from('participants').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('project_files').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('zeitplan_eintraege').select('*').eq('project_id', projectId).order('sort_order').order('created_at'),
    ])
    const proj = projRes.data
    setProject(proj)
    const hidden = proj?.hidden_columns ?? []
    const extra = proj?.extra_columns ?? []
    const template = proj?.participant_template ?? 'meeting'
    const templateCols = (TEMPLATE_COLS[template] ?? TEMPLATE_COLS.meeting)
      .filter(c => !hidden.includes(c)) as string[]
    const allActive = [...templateCols, ...extra]
    const stored = proj?.column_order
    const ordered = stored?.length
      ? [...stored.filter((c: string) => allActive.includes(c)), ...allActive.filter(c => !stored.includes(c))]
      : allActive
    setExtraColumns(extra)
    setHiddenColumns(hidden)
    setOrderedColumns(ordered)

    // Zeitplan columns
    const zhidden = proj?.zeitplan_hidden_columns ?? []
    const zextra = proj?.zeitplan_extra_columns ?? []
    const zBaseActive = ZEITPLAN_BASE_COLS.filter(c => !zhidden.includes(c))
    const zAllActive = [...zBaseActive, ...zextra]
    const zstoredOrder = proj?.zeitplan_column_order
    const zordered = zstoredOrder?.length
      ? [...zstoredOrder.filter((c: string) => zAllActive.includes(c)), ...zAllActive.filter(c => !zstoredOrder.includes(c))]
      : zAllActive
    setZeitplanExtraColumns(zextra)
    setZeitplanHiddenColumns(zhidden)
    setZeitplanOrderedColumns(zordered)

    setTasks(tasksRes.data ?? [])
    setParticipants(partRes.data ?? [])
    setFiles(filesRes.data ?? [])
    setZeitplan(zeitplanRes.data ?? [])
  }

  async function addExtraColumn() {
    const name = newColName.trim()
    if (!name) return
    const updatedExtra = [...extraColumns, name]
    const updatedOrder = [...orderedColumns, name]
    await supabase.from('projects').update({ extra_columns: updatedExtra, column_order: updatedOrder }).eq('id', projectId)
    setExtraColumns(updatedExtra)
    setOrderedColumns(updatedOrder)
    setNewColName('')
    setShowAddCol(false)
  }

  async function removeColumn(col: string, isExtra: boolean) {
    const updatedOrder = orderedColumns.filter(c => c !== col)
    if (isExtra) {
      const updatedExtra = extraColumns.filter(c => c !== col)
      await supabase.from('projects').update({ extra_columns: updatedExtra, column_order: updatedOrder }).eq('id', projectId)
      setExtraColumns(updatedExtra)
    } else {
      const updatedHidden = [...hiddenColumns, col]
      await supabase.from('projects').update({ hidden_columns: updatedHidden, column_order: updatedOrder }).eq('id', projectId)
      setHiddenColumns(updatedHidden)
    }
    setOrderedColumns(updatedOrder)
    setConfirmDeleteCol(null)
  }

  async function handleColumnDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = orderedColumns.indexOf(active.id as string)
    const newIndex = orderedColumns.indexOf(over.id as string)
    const newOrder = arrayMove(orderedColumns, oldIndex, newIndex)
    setOrderedColumns(newOrder)
    await supabase.from('projects').update({ column_order: newOrder }).eq('id', projectId)
  }

  // Fix: use functional setState so we always read the latest extra data (prevents stale closure bug)
  function updateExtraField(participantId: string, col: string, value: string) {
    setParticipants(prev => {
      const p = prev.find(p => p.id === participantId)
      if (!p) return prev
      const updatedExtra = { ...(p.extra ?? {}), [col]: value }
      void supabase.from('participants').update({ extra: updatedExtra }).eq('id', participantId)
      return prev.map(p => p.id === participantId ? { ...p, extra: updatedExtra } : p)
    })
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
    setTasks(prev => prev.map(t => t.id === id ? { ...t, erledigt: !erledigt } : t))
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  function startEditTask(task: Task) {
    setEditingTaskId(task.id)
    setEditingTask({
      aufgabe: task.aufgabe,
      beschreibung: task.beschreibung ?? '',
      verantwortliche: task.verantwortliche ?? '',
      deadline: task.deadline ?? '',
    })
  }

  async function saveEditTask() {
    if (!editingTaskId || !editingTask.aufgabe.trim()) return
    await supabase.from('tasks').update({
      aufgabe: editingTask.aufgabe.trim(),
      beschreibung: editingTask.beschreibung.trim() || null,
      verantwortliche: editingTask.verantwortliche.trim() || null,
      deadline: editingTask.deadline || null,
    }).eq('id', editingTaskId)
    setTasks(prev => prev.map(t => t.id === editingTaskId ? {
      ...t,
      aufgabe: editingTask.aufgabe.trim(),
      beschreibung: editingTask.beschreibung.trim() || null,
      verantwortliche: editingTask.verantwortliche.trim() || null,
      deadline: editingTask.deadline || null,
    } : t))
    setEditingTaskId(null)
  }

  // Participants
  async function addParticipant() {
    const name = ((newParticipant.name as string) ?? '').trim()
    if (!name) return
    const fields: Record<string, unknown> = { project_id: projectId, sort_order: participants.length }
    for (const col of orderedColumns) {
      if (templateColSet.has(col)) {
        if (BOOL_COLS.has(col)) {
          fields[col] = newParticipant[col] ?? false
        } else {
          const val = ((newParticipant[col] as string) ?? '').trim()
          fields[col] = val || null
        }
      }
    }
    const extraObj: Record<string, string> = {}
    for (const col of orderedColumns) {
      if (!templateColSet.has(col)) {
        const val = (newParticipantExtra[col] ?? '').trim()
        if (val) extraObj[col] = val
      }
    }
    if (Object.keys(extraObj).length > 0) fields.extra = extraObj
    await supabase.from('participants').insert(fields)
    setNewParticipant({})
    setNewParticipantExtra({})
    setShowParticipantForm(false)
    loadAll()
  }

  async function updateParticipant(id: string, field: string, value: string | boolean | null) {
    await supabase.from('participants').update({ [field]: value }).eq('id', id)
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  async function deleteParticipant(id: string) {
    await supabase.from('participants').delete().eq('id', id)
    setParticipants(prev => prev.filter(p => p.id !== id))
  }

  // Zeitplan
  async function addZeitplanEintrag() {
    if (!newZeitplan.programmpunkt.trim()) return
    const { data } = await supabase.from('zeitplan_eintraege').insert({
      project_id: projectId,
      uhrzeit: newZeitplan.uhrzeit.trim() || null,
      datum: newZeitplan.datum.trim() || null,
      programmpunkt: newZeitplan.programmpunkt.trim(),
      ort: newZeitplan.ort.trim() || null,
      verantwortlich: newZeitplan.verantwortlich.trim() || null,
      bemerkung: newZeitplan.bemerkung.trim() || null,
    }).select().single()
    if (!data) return
    const sorted = sortByUhrzeit([...zeitplan, data as ZeitplanEintrag])
    setZeitplan(sorted)
    sorted.forEach((entry, idx) => {
      void supabase.from('zeitplan_eintraege').update({ sort_order: idx }).eq('id', entry.id)
    })
    setNewZeitplan(EMPTY_ZEITPLAN)
    setShowZeitplanForm(false)
  }

  function updateZeitplanField(id: string, field: string, value: string) {
    setZeitplan(prev => {
      const e = prev.find(e => e.id === id)
      if (!e) return prev
      void supabase.from('zeitplan_eintraege').update({ [field]: value || null }).eq('id', id)
      return prev.map(e => e.id === id ? { ...e, [field]: value } : e)
    })
  }

  function updateZeitplanExtra(id: string, col: string, value: string) {
    setZeitplan(prev => {
      const e = prev.find(e => e.id === id)
      if (!e) return prev
      const updatedExtra = { ...(e.extra ?? {}), [col]: value }
      void supabase.from('zeitplan_eintraege').update({ extra: updatedExtra }).eq('id', id)
      return prev.map(e => e.id === id ? { ...e, extra: updatedExtra } : e)
    })
  }

  async function addZeitplanColumn() {
    const name = newZeitplanColName.trim()
    if (!name) return
    const updatedExtra = [...zeitplanExtraColumns, name]
    const updatedOrder = [...zeitplanOrderedColumns, name]
    await supabase.from('projects').update({ zeitplan_extra_columns: updatedExtra, zeitplan_column_order: updatedOrder }).eq('id', projectId)
    setZeitplanExtraColumns(updatedExtra)
    setZeitplanOrderedColumns(updatedOrder)
    setNewZeitplanColName('')
    setShowAddZeitplanCol(false)
  }

  async function removeZeitplanColumn(col: string, isExtra: boolean) {
    const updatedOrder = zeitplanOrderedColumns.filter(c => c !== col)
    if (isExtra) {
      const updatedExtra = zeitplanExtraColumns.filter(c => c !== col)
      await supabase.from('projects').update({ zeitplan_extra_columns: updatedExtra, zeitplan_column_order: updatedOrder }).eq('id', projectId)
      setZeitplanExtraColumns(updatedExtra)
    } else {
      const updatedHidden = [...zeitplanHiddenColumns, col]
      await supabase.from('projects').update({ zeitplan_hidden_columns: updatedHidden, zeitplan_column_order: updatedOrder }).eq('id', projectId)
      setZeitplanHiddenColumns(updatedHidden)
    }
    setZeitplanOrderedColumns(updatedOrder)
    setConfirmDeleteZeitplanCol(null)
  }

  async function handleZeitplanDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeId = active.id as string
    const overId = over.id as string
    if (activeId.startsWith('zcol-') && overId.startsWith('zcol-')) {
      const colA = activeId.slice(5)
      const colB = overId.slice(5)
      const oldIdx = zeitplanOrderedColumns.indexOf(colA)
      const newIdx = zeitplanOrderedColumns.indexOf(colB)
      if (oldIdx === -1 || newIdx === -1) return
      const newOrder = arrayMove(zeitplanOrderedColumns, oldIdx, newIdx)
      setZeitplanOrderedColumns(newOrder)
      await supabase.from('projects').update({ zeitplan_column_order: newOrder }).eq('id', projectId)
    } else if (activeId.startsWith('zrow-') && overId.startsWith('zrow-')) {
      const rowAId = activeId.slice(5)
      const rowBId = overId.slice(5)
      const oldIdx = zeitplan.findIndex(e => e.id === rowAId)
      const newIdx = zeitplan.findIndex(e => e.id === rowBId)
      if (oldIdx === -1 || newIdx === -1) return
      const newOrder = arrayMove(zeitplan, oldIdx, newIdx)
      setZeitplan(newOrder)
      newOrder.forEach((entry, idx) => {
        void supabase.from('zeitplan_eintraege').update({ sort_order: idx }).eq('id', entry.id)
      })
    }
  }

  async function deleteZeitplanEintrag(id: string) {
    await supabase.from('zeitplan_eintraege').delete().eq('id', id)
    setZeitplan(prev => prev.filter(e => e.id !== id))
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
    await supabase.storage.from('project-files').remove([filePath])
    await supabase.from('project_files').delete().eq('id', id)
    setConfirmDeleteFileId(null)
    loadAll()
  }

  if (!project) return <div className="p-6 text-gray-500">Laden…</div>

  const templateColSet = new Set(
    (TEMPLATE_COLS[project.participant_template ?? 'meeting'] ?? TEMPLATE_COLS.meeting) as string[]
  )
  const zeitplanBaseColSet = new Set(ZEITPLAN_BASE_COLS)
  const sortedParticipants = [...participants].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'de')
  )

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {confirmDeleteFileId && (() => {
        const file = files.find(f => f.id === confirmDeleteFileId)
        return file ? (
          <ConfirmDialog
            message={`"${file.file_name}" wird unwiderruflich gelöscht.`}
            onConfirm={() => deleteFile(file.id, file.file_path)}
            onCancel={() => setConfirmDeleteFileId(null)}
          />
        ) : null
      })()}
      {confirmDeleteProject && (
        <ConfirmDialog
          message={`„${project.name}" und alle Inhalte werden unwiderruflich gelöscht.`}
          onConfirm={deleteProject}
          onCancel={() => setConfirmDeleteProject(false)}
        />
      )}
      {confirmDeleteCol && (
        <ConfirmDialog
          message={`Spalte „${confirmDeleteCol.col}" ausblenden? Die eingetragenen Daten bleiben gespeichert, sind aber nicht mehr sichtbar.`}
          onConfirm={() => removeColumn(confirmDeleteCol.col, confirmDeleteCol.isExtra)}
          onCancel={() => setConfirmDeleteCol(null)}
        />
      )}
      {confirmDeleteZeitplanCol && (
        <ConfirmDialog
          message={`Spalte „${confirmDeleteZeitplanCol.col}" ausblenden? Die Daten bleiben gespeichert.`}
          onConfirm={() => removeZeitplanColumn(confirmDeleteZeitplanCol.col, confirmDeleteZeitplanCol.isExtra)}
          onCancel={() => setConfirmDeleteZeitplanCol(null)}
        />
      )}
      {confirmDeleteParticipantId && (() => {
        const p = participants.find(p => p.id === confirmDeleteParticipantId)
        return p ? (
          <ConfirmDialog
            message={`„${p.name}" aus der Liste entfernen?`}
            onConfirm={() => { deleteParticipant(p.id); setConfirmDeleteParticipantId(null) }}
            onCancel={() => setConfirmDeleteParticipantId(null)}
          />
        ) : null
      })()}
      {confirmDeleteZeitplanRowId && (() => {
        const e = zeitplan.find(e => e.id === confirmDeleteZeitplanRowId)
        return e ? (
          <ConfirmDialog
            message={`Eintrag „${e.programmpunkt || e.uhrzeit || 'Zeile'}" löschen?`}
            onConfirm={() => { deleteZeitplanEintrag(e.id); setConfirmDeleteZeitplanRowId(null) }}
            onCancel={() => setConfirmDeleteZeitplanRowId(null)}
          />
        ) : null
      })()}

      <div className="flex items-center gap-3 mb-6">
        <Link href="/projekte" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
          {project.description && <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>}
        </div>
        <button
          onClick={() => setConfirmDeleteProject(true)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto max-w-full">
        {[
          { key: 'aufgaben', label: `Aufgaben (${tasks.filter(t => !t.erledigt).length})`, short: `Aufgaben` },
          ...(project.has_participant_list ? [{ key: 'teilnehmer', label: `Teilnehmer*innen (${participants.length})`, short: `Personen` }] : []),
          { key: 'zeitplan', label: `Zeitplan (${zeitplan.length})`, short: `Zeitplan` },
          { key: 'dateien', label: `Dateien (${files.length})`, short: `Dateien` },
        ].map(({ key, label, short }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{short}</span>
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
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
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
                    <tr key={task.id} id={`task-${task.id}`} className={`hover:bg-gray-50 scroll-mt-4 target:bg-blue-50 transition-colors ${task.erledigt ? 'opacity-50' : ''}`}>
                      {editingTaskId === task.id ? (
                        <>
                          <td className="px-4 py-2"></td>
                          <td className="px-2 py-2">
                            <input autoFocus value={editingTask.aufgabe} onChange={e => setEditingTask({ ...editingTask, aufgabe: e.target.value })}
                              className="w-full px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none" />
                          </td>
                          <td className="px-2 py-2 hidden sm:table-cell">
                            <input value={editingTask.beschreibung} onChange={e => setEditingTask({ ...editingTask, beschreibung: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none" placeholder="Beschreibung" />
                          </td>
                          <td className="px-2 py-2 hidden md:table-cell">
                            <input value={editingTask.verantwortliche} onChange={e => setEditingTask({ ...editingTask, verantwortliche: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none" placeholder="Verantwortliche*r" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="date" value={editingTask.deadline} onChange={e => setEditingTask({ ...editingTask, deadline: e.target.value })}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none" />
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex gap-1">
                              <button onClick={saveEditTask} className="p-1 text-green-600 hover:text-green-700"><Check size={15} /></button>
                              <button onClick={() => setEditingTaskId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={15} /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
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
                            <div className="flex gap-1">
                              <button onClick={() => startEditTask(task)} className="p-1 text-gray-300 hover:text-blue-500"><Pencil size={14} /></button>
                              <button onClick={() => deleteTask(task.id)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </>
                      )}
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
          <div className="flex items-center justify-between mb-3">
            {/* Teilnehmerzähler */}
            <span className="text-sm text-gray-500">
              {participants.length} {participants.length === 1 ? 'Person' : 'Personen'} ·{' '}
              {participants.filter(p => p.anwesend).length} anwesend
            </span>
            <button
              onClick={() => setShowParticipantForm(!showParticipantForm)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={16} /> Person hinzufügen
            </button>
          </div>

          {showParticipantForm && (
            <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {orderedColumns.map(col => {
                  const label = templateColSet.has(col) ? (COL_LABELS[col] ?? col) : col
                  if (templateColSet.has(col) && BOOL_COLS.has(col)) {
                    return (
                      <div key={col} className="flex items-center gap-2 pt-5">
                        <input
                          type="checkbox"
                          id={`new-p-${col}`}
                          checked={!!(newParticipant[col])}
                          onChange={e => setNewParticipant(prev => ({ ...prev, [col]: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={`new-p-${col}`} className="text-sm text-gray-700">{label}</label>
                      </div>
                    )
                  }
                  return (
                    <div key={col}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {label}{col === 'name' ? ' *' : ''}
                      </label>
                      <input
                        type="text"
                        value={templateColSet.has(col) ? ((newParticipant[col] as string) ?? '') : (newParticipantExtra[col] ?? '')}
                        onChange={e => templateColSet.has(col)
                          ? setNewParticipant(prev => ({ ...prev, [col]: e.target.value }))
                          : setNewParticipantExtra(prev => ({ ...prev, [col]: e.target.value }))}
                        autoFocus={col === 'name'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={col === 'name' ? 'Name' : '—'}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <button onClick={addParticipant} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Hinzufügen</button>
                <button onClick={() => { setShowParticipantForm(false); setNewParticipant({}); setNewParticipantExtra({}) }} className="px-3 py-2 text-gray-600 text-sm">Abbrechen</button>
              </div>
            </div>
          )}

          {participants.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <Users size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Noch keine Teilnehmer*innen</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColumnDragEnd}>
              <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
                <table className="text-sm min-w-max w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <SortableContext items={orderedColumns} strategy={horizontalListSortingStrategy}>
                        {orderedColumns.map(col => (
                          <SortableColHeader
                            key={col}
                            col={col}
                            label={templateColSet.has(col) ? (COL_LABELS[col] ?? col) : col}
                            onDelete={() => setConfirmDeleteCol({ col, isExtra: !templateColSet.has(col) })}
                          />
                        ))}
                      </SortableContext>
                      <th className="px-2 py-2 w-8">
                        {showAddCol ? (
                          <div className="flex items-center gap-1">
                            <input autoFocus value={newColName} onChange={e => setNewColName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') addExtraColumn(); if (e.key === 'Escape') setShowAddCol(false) }}
                              className="w-20 px-1 py-0.5 border border-blue-400 rounded text-xs focus:outline-none"
                              placeholder="Name" />
                            <button onClick={addExtraColumn} className="text-green-600"><Check size={12} /></button>
                            <button onClick={() => setShowAddCol(false)} className="text-gray-400"><X size={12} /></button>
                          </div>
                        ) : (
                          <button onClick={() => setShowAddCol(true)} className="p-1 text-gray-400 hover:text-blue-500 rounded">
                            <Plus size={13} />
                          </button>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedParticipants.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        {orderedColumns.map(col => (
                          <td key={col} className="px-1 py-1">
                            {templateColSet.has(col) ? (
                              BOOL_COLS.has(col) ? (
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
                                  size={Math.max(3, String(p[col as keyof Participant] ?? '').length)}
                                  className="px-1.5 py-0.5 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm focus:outline-none bg-transparent"
                                  placeholder="—"
                                />
                              )
                            ) : (
                              <input
                                type="text"
                                value={(p.extra ?? {})[col] ?? ''}
                                onChange={e => updateExtraField(p.id, col, e.target.value)}
                                size={Math.max(3, ((p.extra ?? {})[col] ?? '').length)}
                                className="px-1.5 py-0.5 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm focus:outline-none bg-transparent"
                                placeholder="—"
                              />
                            )}
                          </td>
                        ))}
                        <td className="px-1 py-1">
                          <button onClick={() => setConfirmDeleteParticipantId(p.id)} className="p-1 text-gray-300 hover:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DndContext>
          )}
        </div>
      )}

      {/* Zeitplan Tab */}
      {tab === 'zeitplan' && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setShowZeitplanForm(!showZeitplanForm)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={16} /> Eintrag hinzufügen
            </button>
          </div>

          {showZeitplanForm && (
            <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Datum</label>
                  <input
                    type="date"
                    value={newZeitplan.datum}
                    onChange={e => setNewZeitplan({ ...newZeitplan, datum: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Uhrzeit</label>
                  <input
                    type="text"
                    value={newZeitplan.uhrzeit}
                    onChange={e => setNewZeitplan({ ...newZeitplan, uhrzeit: e.target.value })}
                    placeholder="z.B. 09:00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Programmpunkt *</label>
                  <input
                    type="text"
                    value={newZeitplan.programmpunkt}
                    onChange={e => setNewZeitplan({ ...newZeitplan, programmpunkt: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') addZeitplanEintrag() }}
                    placeholder="Was findet statt?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ort / Raum</label>
                  <input
                    type="text"
                    value={newZeitplan.ort}
                    onChange={e => setNewZeitplan({ ...newZeitplan, ort: e.target.value })}
                    placeholder="z.B. Aula"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Verantwortlich</label>
                  <input
                    type="text"
                    value={newZeitplan.verantwortlich}
                    onChange={e => setNewZeitplan({ ...newZeitplan, verantwortlich: e.target.value })}
                    placeholder="Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bemerkung</label>
                  <textarea
                    value={newZeitplan.bemerkung}
                    onChange={e => setNewZeitplan({ ...newZeitplan, bemerkung: e.target.value })}
                    placeholder="Optional"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={addZeitplanEintrag}
                  disabled={!newZeitplan.programmpunkt.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Hinzufügen
                </button>
                <button
                  onClick={() => { setShowZeitplanForm(false); setNewZeitplan(EMPTY_ZEITPLAN) }}
                  className="px-3 py-2 text-gray-600 text-sm"
                >
                  Abbrechen
                </button>
                {newZeitplan.uhrzeit && (
                  <span className="text-xs text-gray-400 ml-1">Wird nach Uhrzeit einsortiert</span>
                )}
              </div>
            </div>
          )}

          {zeitplan.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <Calendar size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Noch keine Zeitplaneinträge</p>
              <button onClick={() => setShowZeitplanForm(true)} className="mt-3 text-sm text-blue-600 hover:text-blue-700">
                Ersten Eintrag hinzufügen
              </button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleZeitplanDragEnd}>
              <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
                <table className="text-sm min-w-max w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-5 px-1 py-2"></th>
                      <SortableContext items={zeitplanOrderedColumns.map(c => `zcol-${c}`)} strategy={horizontalListSortingStrategy}>
                        {zeitplanOrderedColumns.map(col => (
                          <SortableZeitplanColHeader
                            key={col}
                            col={col}
                            label={zeitplanBaseColSet.has(col) ? (ZEITPLAN_COL_LABELS[col] ?? col) : col}
                            onDelete={() => setConfirmDeleteZeitplanCol({ col, isExtra: !zeitplanBaseColSet.has(col) })}
                          />
                        ))}
                      </SortableContext>
                      <th className="px-2 py-2 w-8">
                        {showAddZeitplanCol ? (
                          <div className="flex items-center gap-1">
                            <input autoFocus value={newZeitplanColName} onChange={e => setNewZeitplanColName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') addZeitplanColumn(); if (e.key === 'Escape') setShowAddZeitplanCol(false) }}
                              className="w-20 px-1 py-0.5 border border-blue-400 rounded text-xs focus:outline-none"
                              placeholder="Name" />
                            <button onClick={addZeitplanColumn} className="text-green-600"><Check size={12} /></button>
                            <button onClick={() => setShowAddZeitplanCol(false)} className="text-gray-400"><X size={12} /></button>
                          </div>
                        ) : (
                          <button onClick={() => setShowAddZeitplanCol(true)} className="p-1 text-gray-400 hover:text-blue-500 rounded">
                            <Plus size={13} />
                          </button>
                        )}
                      </th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <SortableContext items={zeitplan.map(e => `zrow-${e.id}`)} strategy={verticalListSortingStrategy}>
                      {zeitplan.map(entry => (
                        <SortableZeitplanRow key={entry.id} id={entry.id}>
                          {zeitplanOrderedColumns.map(col => (
                            <td key={col} className={`px-1 py-1${col === 'bemerkung' ? ' min-w-[220px]' : ''}`}>
                              {zeitplanBaseColSet.has(col) ? (
                                col === 'bemerkung' ? (
                                  <textarea
                                    value={(entry[col as keyof ZeitplanEintrag] as string) ?? ''}
                                    onChange={e => updateZeitplanField(entry.id, col, e.target.value)}
                                    style={{ fieldSizing: 'content' } as React.CSSProperties}
                                    className="px-1.5 py-0.5 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm focus:outline-none bg-transparent resize-none w-full min-h-[1.5rem]"
                                    placeholder="—"
                                  />
                                ) : col === 'uhrzeit' ? (
                                  <div className="flex flex-col">
                                    <input
                                      type="text"
                                      value={(entry.uhrzeit as string) ?? ''}
                                      onChange={e => updateZeitplanField(entry.id, 'uhrzeit', e.target.value)}
                                      size={Math.max(3, String(entry.uhrzeit ?? '').length)}
                                      className="px-1.5 py-0.5 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm focus:outline-none bg-transparent"
                                      placeholder="—"
                                    />
                                    {entry.datum && (
                                      <span className="px-1.5 text-[10px] text-gray-400 leading-tight">
                                        {new Date(entry.datum + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                <input
                                  type="text"
                                  value={(entry[col as keyof ZeitplanEintrag] as string) ?? ''}
                                  onChange={e => updateZeitplanField(entry.id, col, e.target.value)}
                                  size={Math.max(3, String(entry[col as keyof ZeitplanEintrag] ?? '').length)}
                                  className="px-1.5 py-0.5 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm focus:outline-none bg-transparent"
                                  placeholder="—"
                                />
                                )
                              ) : (
                                <input
                                  type="text"
                                  value={(entry.extra ?? {})[col] ?? ''}
                                  onChange={e => updateZeitplanExtra(entry.id, col, e.target.value)}
                                  size={Math.max(3, ((entry.extra ?? {})[col] ?? '').length)}
                                  className="px-1.5 py-0.5 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm focus:outline-none bg-transparent"
                                  placeholder="—"
                                />
                              )}
                            </td>
                          ))}
                          <td className="px-2 py-2 w-8"></td>
                          <td className="px-1 py-1">
                            <button onClick={() => setConfirmDeleteZeitplanRowId(entry.id)} className="p-1 text-gray-300 hover:text-red-500">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </SortableZeitplanRow>
                      ))}
                    </SortableContext>
                  </tbody>
                </table>
              </div>
            </DndContext>
          )}
        </div>
      )}

      {/* Dateien Tab */}
      {tab === 'dateien' && (
        <div>
          <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl">
            <label className="block text-sm font-medium text-gray-700 mb-2">Datei hochladen (PDF oder Word, max. 10 MB)</label>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={e => { setUploadFile(e.target.files?.[0] ?? null); setUploadError('') }}
                className="flex-1 text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:border file:border-gray-300 file:rounded-lg file:text-sm file:bg-white file:text-gray-700 hover:file:bg-gray-50"
              />
              <button
                onClick={uploadProjectFile}
                disabled={!uploadFile || uploading}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
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
                    onClick={() => setConfirmDeleteFileId(file.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500"
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
