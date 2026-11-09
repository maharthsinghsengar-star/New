import { useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CircleAlert, CircleCheck, LoaderCircle, Mail } from 'lucide-react'
import { EASE } from '../lib/motion'
import { cn } from '../lib/utils'
import { validateEmail } from '../lib/validation'
import { Button } from './ui/Button'

export function Newsletter() {
  const inputId = useId()
  const errorId = useId()
  const inputRef = useRef(null)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [status, setStatus] = useState('idle') // idle | loading | success
  const [subscribed, setSubscribed] = useState('')

  const handleChange = (event) => {
    setEmail(event.target.value)
    if (attempted) setError(validateEmail(event.target.value))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const message = validateEmail(email)
    setAttempted(true)
    setError(message)
    if (message) {
      inputRef.current?.focus()
      return
    }
    setStatus('loading')
    // Simulated request — swap for your email provider's API when going live.
    setTimeout(() => {
      setSubscribed(email.trim())
      setEmail('')
      setAttempted(false)
      setStatus('success')
    }, 900)
  }

  return (
    <div>
      <h3 className="font-display text-lg font-semibold tracking-tight">Join the ritual</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-white/55">
        Product drops, hydration science and early access — once a month, never spam.
      </p>

      <AnimatePresence mode="wait" initial={false}>
        {status === 'success' ? (
          <motion.div
            key="success"
            role="status"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="mt-5 flex max-w-md items-start gap-3 rounded-2xl border border-electric-400/30 bg-electric-500/10 p-4"
          >
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-electric-300" />
            <div className="min-w-0">
              <p className="font-medium">You’re on the list.</p>
              <p className="mt-0.5 break-words text-sm text-white/60">
                We’ll send updates to <span className="text-white">{subscribed}</span>.
              </p>
              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="mt-2 text-sm text-electric-300 underline-offset-4 hover:underline"
              >
                Use a different email
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            noValidate
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="mt-5 max-w-md"
          >
            <label htmlFor={inputId} className="sr-only">
              Email address
            </label>
            <div
              className={cn(
                'flex items-center gap-2 rounded-full border bg-white/[0.03] p-1.5 pl-4 transition-colors duration-300 focus-within:border-electric-400/70 focus-within:bg-white/[0.05]',
                error ? 'border-ember-500/70' : 'border-white/12',
              )}
            >
              <Mail className="size-4 shrink-0 text-white/40" aria-hidden="true" />
              <input
                ref={inputRef}
                id={inputId}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck="false"
                placeholder="you@example.com"
                value={email}
                onChange={handleChange}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? errorId : undefined}
                className="w-0 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/35 focus-visible:outline-none"
              />
              <Button type="submit" size="sm" className="shrink-0" disabled={status === 'loading'}>
                {status === 'loading' ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" /> Joining
                  </>
                ) : (
                  <>
                    Subscribe <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
            <AnimatePresence>
              {error && (
                <motion.p
                  id={errorId}
                  role="alert"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-2.5 flex items-center gap-1.5 pl-4 text-sm text-ember-400"
                >
                  <CircleAlert className="size-4 shrink-0" /> {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
