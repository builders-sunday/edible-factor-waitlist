// Progressive enhancement for the landing page's primary actions.
// The links and buttons work even when this module or the CDN is unavailable.
import { animate } from 'https://cdn.jsdelivr.net/npm/motion@12.23.26/+esm'

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const controls = document.querySelectorAll('.pill-cta, .pill-glass')

for (const control of controls) {
  let animation

  const setPressed = (pressed) => {
    if (reducedMotion.matches) return
    animation?.stop()
    animation = animate(
      control,
      { scale: pressed ? 0.96 : 1 },
      { type: 'spring', stiffness: 560, damping: 36 }
    )
  }

  control.addEventListener('pointerdown', () => setPressed(true))
  control.addEventListener('pointerup', () => setPressed(false))
  control.addEventListener('pointercancel', () => setPressed(false))
  control.addEventListener('pointerleave', () => setPressed(false))
  control.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') setPressed(true)
  })
  control.addEventListener('keyup', (event) => {
    if (event.key === 'Enter' || event.key === ' ') setPressed(false)
  })
  control.addEventListener('blur', () => setPressed(false))
}

reducedMotion.addEventListener('change', () => {
  if (!reducedMotion.matches) return
  for (const control of controls) {
    animate(control, { scale: 1 }, { duration: 0 })
  }
})
