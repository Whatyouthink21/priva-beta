import { forwardRef } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { prefetch } from '../routes'

/** A Link that prefetches its lazy route chunk on hover / focus / touch, and
 *  scrolls to the top on the way in (a bare router does not). */
export const SmartLink = forwardRef<HTMLAnchorElement, LinkProps>(function SmartLink({ onMouseEnter, ...rest }, ref) {
  return (
    <Link
      ref={ref}
      {...rest}
      onMouseEnter={(e) => {
        prefetch(rest.to.toString())
        onMouseEnter?.(e)
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== 'mouse') prefetch(rest.to.toString())
        rest.onPointerDown?.(e)
      }}
      onFocus={(e) => {
        prefetch(rest.to.toString())
        rest.onFocus?.(e)
      }}
    />
  )
})
