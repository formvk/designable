import type { Root } from 'react-dom/client'

export const mountPlayground = async (container: HTMLElement): Promise<Root> => {
  const [{ createElement }, { createRoot }, { App }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('../../../playground/react/src/entry'),
  ])
  const root = createRoot(container)
  root.render(createElement(App))
  return root
}
