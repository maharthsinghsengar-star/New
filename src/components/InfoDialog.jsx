import { useState } from 'react'
import { X } from 'lucide-react'
import { useUI } from '../context/contexts'
import { SUPPORT_TOPICS } from '../data/support'
import { Button } from './ui/Button'
import { Eyebrow } from './ui/Eyebrow'
import { Modal } from './ui/Modal'

export function InfoDialog() {
  const { infoTopic, closeInfo } = useUI()
  // Keep the last topic rendered while the dialog animates out.
  const [shown, setShown] = useState(infoTopic)
  if (infoTopic && infoTopic !== shown) setShown(infoTopic)
  const topic = SUPPORT_TOPICS[shown]

  return (
    <Modal open={Boolean(infoTopic)} onClose={closeInfo} labelledBy="info-title" className="sm:max-w-xl">
      {topic && (
        <div className="relative p-6 sm:p-10">
          <button
            type="button"
            onClick={closeInfo}
            aria-label="Close"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-white/10 text-white/70 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X className="size-5" />
          </button>
          <Eyebrow dot="electric">Support</Eyebrow>
          <h2 id="info-title" className="mt-5 pr-10 font-display text-3xl font-semibold tracking-tight">
            {topic.title}
          </h2>
          <p className="mt-3 text-white/60">{topic.intro}</p>
          <dl className="mt-8 space-y-6">
            {topic.sections.map((section) => (
              <div key={section.heading} className="border-l-2 border-white/10 pl-5">
                <dt className="font-medium text-white">{section.heading}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-white/60">{section.body}</dd>
              </div>
            ))}
          </dl>
          <Button className="mt-10 w-full sm:w-auto" onClick={closeInfo}>
            Got it
          </Button>
        </div>
      )}
    </Modal>
  )
}
