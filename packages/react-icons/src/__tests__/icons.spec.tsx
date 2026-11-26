import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Icon, icons, Plus, createIcon } from '../index'

describe('react-icons', () => {
  it('渲染内置图标并继承尺寸与样式', () => {
    const html = renderToStaticMarkup(<Plus size={16} className="custom" data-testid="plus" />)
    expect(html).toContain('width="16"')
    expect(html).toContain('height="16"')
    expect(html).toContain('class="custom"')
    expect(html).toContain('<path')
  })

  it('按名称查找图标，未知名称回退 question', () => {
    expect(icons['zoom-in']).toBeTruthy()
    const html = renderToStaticMarkup(<Icon name={'not-exists' as any} />)
    expect(html).toContain('viewBox="0 0 24 24"')
    expect(html).toContain('<circle')
  })

  it('createIcon 支持自定义内容', () => {
    const Custom = createIcon({ displayName: 'Custom', children: <path d="M2 2h20v20H2z" /> })
    expect(Custom.displayName).toBe('Custom')
    expect(renderToStaticMarkup(<Custom />)).toContain('d="M2 2h20v20H2z"')
  })
})
