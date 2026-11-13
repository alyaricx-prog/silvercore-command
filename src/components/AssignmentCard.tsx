'use client'
import type { Assignment, Profile } from '@/lib/types'

const PRIORITY_STYLES: Record<string, string> = {
  low:    'bg-gray-700 text-gray-300',
  normal: 'bg-blue-900 text-blue-300',
  high:   'bg-amber-900 text-amber-300',
  urgent: 'bg-red-900 text-red-300',
}

const STATUS_STYLES: Record<string, string> = {
  pending:     'bg-gray-700 text-gray-300',
  acknowledged:'bg-blue-900 text-blue-300',
  in_progress: 'bg-purple-900 text-purple-300',
  completed:   'bg-green-900 text-green-300',
  cancelled:   'bg-red-900/40 text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
  pending:     'Pending',
  acknowledged:'Acknowledged',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
}

type Props = {
  assignment: Assignment
  assignee?: Profile | null
  onStatusChange?: (id: string, status: Assignment['status']) => void
  onLogDeal?: (id: string) => void
  isEmployee?: boolean
}

export default function AssignmentCard({ assignment, assignee, onStatusChange, onLogDeal, isEmployee }: Props) {
  const due = assignment.due_at ? new Date(assignment.due_at) : null
  const overdue = due && due < new Date() && assignment.status !== 'completed' && assignment.status !== 'cancelled'

  const nextStatus: Record<string, Assignment['status']> = {
    pending: 'acknowledged',
    acknowledged: 'in_progress',
    in_progress: 'completed',
  }
  const next = nextStatus[assignment.status]

  const nextLabel: Record<string, string> = {
    pending: 'Acknowledge',
    acknowledged: 'Start',
    in_progress: 'Complete',
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm leading-snug">{assignment.title}</h3>
        <div className="flex gap-1.5 shrink-0">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide ${PRIORITY_STYLES[assignment.priority]}`}>
            {assignment.priority}
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[assignment.status]}`}>
            {STATUS_LABEL[assignment.status]}
          </span>
        </div>
      </div>

      {assignment.description && (
        <p className="text-xs text-gray-400 leading-relaxed">{assignment.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{assignee ? assignee.full_name : '—'}</span>
        {due && (
          <span className={overdue ? 'text-red-400 font-medium' : ''}>
            {overdue ? '⚠ ' : ''}Due {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {isEmployee && assignment.status !== 'completed' && assignment.status !== 'cancelled' && (
        <div className="flex gap-2 pt-1">
          {next && onStatusChange && (
            <button
              onClick={() => onStatusChange(assignment.id, next)}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium py-2 rounded-lg transition"
            >
              {nextLabel[assignment.status]}
            </button>
          )}
          {assignment.status === 'in_progress' && onLogDeal && (
            <button
              onClick={() => onLogDeal(assignment.id)}
              className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs font-medium py-2 rounded-lg transition"
            >
              Log Deal
            </button>
          )}
        </div>
      )}
    </div>
  )
}
