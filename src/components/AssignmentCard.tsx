'use client'
import type { Assignment, Profile } from '@/lib/types'

const PRIORITY_STYLES: Record<string, string> = {
  low:    'bg-gray-700/60 text-gray-300',
  normal: 'bg-blue-900/60 text-blue-300',
  high:   'bg-amber-900/60 text-amber-300',
  urgent: 'bg-red-900/60 text-red-300',
}

const STATUS_STYLES: Record<string, string> = {
  pending:      'bg-gray-700/60 text-gray-300',
  acknowledged: 'bg-blue-900/60 text-blue-300',
  in_progress:  'bg-purple-900/60 text-purple-300',
  completed:    'bg-green-900/60 text-green-300',
  cancelled:    'bg-red-900/30 text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
  pending:      'Pending',
  acknowledged: 'Acknowledged',
  in_progress:  'In Progress',
  completed:    'Completed',
  cancelled:    'Cancelled',
}

type Props = {
  assignment: Assignment
  assignee?: Profile | null
  onStatusChange?: (id: string, status: Assignment['status']) => void
  onLogDeal?: (id: string) => void
  onCheckIn?: (id: string) => void
  isEmployee?: boolean
}

export default function AssignmentCard({
  assignment, assignee, onStatusChange, onLogDeal, onCheckIn, isEmployee
}: Props) {
  const due     = assignment.due_at ? new Date(assignment.due_at) : null
  const overdue = due && due < new Date()
    && assignment.status !== 'completed'
    && assignment.status !== 'cancelled'

  const nextStatus: Record<string, Assignment['status']> = {
    pending:     'acknowledged',
    acknowledged:'in_progress',
    in_progress: 'completed',
  }
  const nextLabel: Record<string, string> = {
    pending:     'Acknowledge',
    acknowledged:'Start',
    in_progress: 'Complete',
  }
  const next = nextStatus[assignment.status]

  const isActive = assignment.status !== 'completed' && assignment.status !== 'cancelled'

  return (
    <div className="bg-card border border-rim rounded-xl p-4 space-y-3">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm leading-snug text-hi">{assignment.title}</h3>
        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide ${PRIORITY_STYLES[assignment.priority]}`}>
            {assignment.priority}
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[assignment.status]}`}>
            {STATUS_LABEL[assignment.status]}
          </span>
        </div>
      </div>

      {/* Description */}
      {assignment.description && (
        <p className="text-xs text-lo leading-relaxed">{assignment.description}</p>
      )}

      {/* Meta row */}
      <div className="flex items-center justify-between text-xs text-dim">
        <span>{assignee ? assignee.full_name : '—'}</span>
        {due && (
          <span className={overdue ? 'text-red-400 font-medium' : ''}>
            {overdue ? '⚠ ' : ''}Due {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Employee actions */}
      {isEmployee && isActive && (
        <div className="flex gap-2 pt-1">
          {next && onStatusChange && (
            <button
              onClick={() => onStatusChange(assignment.id, next)}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium py-2 rounded-lg transition"
            >
              {nextLabel[assignment.status]}
            </button>
          )}
          {assignment.status === 'in_progress' && onCheckIn && (
            <button
              onClick={() => onCheckIn(assignment.id)}
              className="px-3 bg-well border border-rim hover:border-rim2 text-lo text-xs font-medium py-2 rounded-lg transition"
              title="Check in"
            >
              📍
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
