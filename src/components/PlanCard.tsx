import { IconCheck, IconX } from '@tabler/icons-react'

import type { PlanState, PlanStepStatus, ToolDecision } from '../types'

interface PlanCardProps {
  plan: PlanState
  onDecide?: (planId: string, decision: ToolDecision) => void
}

const STEP_ICON: Record<PlanStepStatus, string> = {
  pending: '○',
  running: '◐',
  done: '✓',
  failed: '✕',
  skipped: '–',
}

const STATUS_LABEL: Record<PlanState['status'], string> = {
  'awaiting-approval': 'Awaiting approval',
  approved: 'Approved — running',
  rejected: 'Rejected',
}

export const PlanCard = ({ plan, onDecide }: PlanCardProps) => {
  const pending = plan.status === 'awaiting-approval'
  return (
    <div className={`nb-plan-card nb-plan-card--${plan.status}`}>
      <div className="nb-plan-card__header">
        <span className="nb-plan-card__title">Proposed plan</span>
        <span className="nb-plan-card__status">
          {STATUS_LABEL[plan.status]}
        </span>
      </div>
      <ol className="nb-plan-card__steps">
        {plan.steps.map((step, i) => (
          <li
            key={`${plan.id}-${i}`}
            className={`nb-plan-step nb-plan-step--${step.status}`}
          >
            <span className="nb-plan-step__icon">{STEP_ICON[step.status]}</span>
            <span className="nb-plan-step__title">{step.title}</span>
            {step.note && (
              <span className="nb-plan-step__note">— {step.note}</span>
            )}
          </li>
        ))}
      </ol>
      {pending && onDecide && (
        <div className="nb-plan-card__actions">
          <button
            type="button"
            className="nb-plan-card__btn nb-plan-card__btn--approve"
            onClick={() => onDecide(plan.id, 'approve')}
          >
            <IconCheck size={14} /> Approve plan
          </button>
          <button
            type="button"
            className="nb-plan-card__btn nb-plan-card__btn--reject"
            onClick={() => onDecide(plan.id, 'reject')}
          >
            <IconX size={14} /> Reject
          </button>
        </div>
      )}
    </div>
  )
}
