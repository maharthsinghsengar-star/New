import { cn } from '../../lib/utils'
import { getFinish } from '../../data/finishes'
import { Bottle } from './Bottle'
import { CapVisual, DockVisual, PodsVisual } from './Accessories'

const ACCESSORIES = { cap: CapVisual, dock: DockVisual, pods: PodsVisual }

/**
 * Renders the right visual for a product. If the product has an `image`
 * (real photography), that is shown instead of the vector render.
 */
export function ProductVisual({ product, finish, className, bottleClassName, accessoryClassName, animated = false }) {
  const selected = finish ?? product.finishes[0]
  const title = `${product.name} in ${getFinish(selected).name}`

  if (product.image) {
    return (
      <div className={cn('flex h-full w-full items-center justify-center', className)}>
        <img src={product.image} alt={title} className="h-full w-full object-contain" loading="lazy" />
      </div>
    )
  }

  const { type, model, base, sleeve } = product.visual
  const Accessory = ACCESSORIES[type]

  return (
    <div className={cn('flex h-full w-full items-center justify-center', className)}>
      {type === 'bottle' ? (
        <Bottle
          model={model}
          finish={sleeve ? base : selected}
          sleeve={sleeve ? selected : null}
          animated={animated}
          title={title}
          className={cn('h-[88%] w-auto', bottleClassName)}
        />
      ) : (
        <Accessory finish={selected} title={title} className={cn('h-auto w-[86%]', accessoryClassName)} />
      )}
    </div>
  )
}
