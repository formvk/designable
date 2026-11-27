import { createBehavior, createResource } from '@formvk/designable-core'
import type { IDesignerComponents } from '@formvk/designable-react'
import type { CSSProperties, ReactNode } from 'react'

interface IDemoProps {
  title?: string
  style?: CSSProperties
  className?: string
  children?: ReactNode
  // 透传引擎注入的 DOM 属性（如 data-designer-node-id）
  [key: string]: any
}

const locale = (zhCN: string, enUS: string) => ({ 'zh-CN': zhCN, 'en-US': enUS })

const RootComponent = (props: IDemoProps) => {
  const { children, style, className, ...rest } = props
  return (
    <div {...rest} className={['demo-root', className].filter(Boolean).join(' ')} style={style}>
      {children}
    </div>
  )
}

const ContainerComponent = (props: IDemoProps) => {
  const { children, title, style, className, ...rest } = props
  return (
    <section {...rest} className={['demo-container', className].filter(Boolean).join(' ')} style={style}>
      {title ? <div className="demo-container-title">{title}</div> : null}
      {children}
    </section>
  )
}

const CardComponent = (props: IDemoProps) => {
  const { children, title, style, className, ...rest } = props
  return (
    <article {...rest} className={['demo-card', className].filter(Boolean).join(' ')} style={style}>
      {title ? <div className="demo-card-title">{title}</div> : null}
      {children}
    </article>
  )
}

const TextComponent = (props: IDemoProps) => {
  const { title, style, ...rest } = props
  return (
    <span {...rest} className="demo-text" style={style} data-content-editable="title" spellCheck={false}>
      {title || '文本内容'}
    </span>
  )
}

const ButtonComponent = (props: IDemoProps) => {
  const { title, style, ...rest } = props
  return (
    <button {...rest} type="button" className="demo-button" style={style} onClick={event => event.preventDefault()}>
      {title || '按钮'}
    </button>
  )
}

const RootBehavior = createBehavior({
  name: 'Root',
  selector: 'Root',
  designerProps: {
    droppable: true,
  },
  designerLocales: {
    'zh-CN': { title: '根节点' },
    'en-US': { title: 'Root' },
  },
})

const ContainerBehavior = createBehavior({
  name: 'Container',
  selector: 'Container',
  designerProps: {
    droppable: true,
  },
  designerLocales: {
    'zh-CN': { title: '容器' },
    'en-US': { title: 'Container' },
  },
})

const CardBehavior = createBehavior({
  name: 'Card',
  selector: 'Card',
  designerProps: {
    droppable: true,
  },
  designerLocales: {
    'zh-CN': { title: '卡片' },
    'en-US': { title: 'Card' },
  },
})

const TextBehavior = createBehavior({
  name: 'Text',
  selector: 'Text',
  designerLocales: {
    'zh-CN': { title: '文本' },
    'en-US': { title: 'Text' },
  },
})

const ButtonBehavior = createBehavior({
  name: 'Button',
  selector: 'Button',
  designerLocales: {
    'zh-CN': { title: '按钮' },
    'en-US': { title: 'Button' },
  },
})

export const components: IDesignerComponents = {
  Root: Object.assign(RootComponent, { Behavior: RootBehavior }),
  Container: Object.assign(ContainerComponent, { Behavior: ContainerBehavior }),
  Card: Object.assign(CardComponent, { Behavior: CardBehavior }),
  Text: Object.assign(TextComponent, { Behavior: TextBehavior }),
  Button: Object.assign(ButtonComponent, { Behavior: ButtonBehavior }),
}

export const resources = [
  ...createResource(
    'Layouts',
    {
      title: locale('容器', 'Container'),
      icon: 'node',
      elements: [{ componentName: 'Container', props: { title: '容器' } }],
    },
    {
      title: locale('卡片', 'Card'),
      icon: 'outline',
      elements: [{ componentName: 'Card', props: { title: '卡片' } }],
    }
  ),
  ...createResource(
    'Displays',
    {
      title: locale('文本', 'Text'),
      icon: 'code',
      elements: [{ componentName: 'Text', props: { title: '文本内容' } }],
    },
    {
      title: locale('按钮', 'Button'),
      icon: 'plus',
      elements: [{ componentName: 'Button', props: { title: '按钮' } }],
    }
  ),
]
