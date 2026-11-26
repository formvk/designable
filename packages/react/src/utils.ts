import classNames from 'classnames'

export type ClassValue = Parameters<typeof classNames>[number]

/**
 * className 合并，复用 classnames。
 */
export const cx = (...values: ClassValue[]): string => classNames(...values)
