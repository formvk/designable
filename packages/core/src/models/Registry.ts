import type { I18n } from '@formvk/designable-i18n'
import { createI18n } from '@formvk/designable-i18n'
import { shallowRef } from '@formvk/reactive'
import { each } from '@formvk/shared'

import { isBehaviorHost, isBehaviorList } from '../externals'
import type {
  IBehavior,
  IBehaviorLike,
  IDesignerBehaviorStore,
  IDesignerBehaviors,
  IDesignerIcons,
  IDesignerIconsStore,
  IDesignerLocales,
} from '../types'
import type { TreeNode } from './TreeNode'

export interface IRegistryProps {
  language?: string
  fallbackLanguage?: string
  locales?: IDesignerLocales
  icons?: IDesignerIcons
}

const reSortBehaviors = (target: IBehavior[], sources: IDesignerBehaviors) => {
  const findTargetBehavior = (behavior: IBehavior) => target.includes(behavior)
  const findSourceBehavior = (name: string) => {
    for (let key in sources) {
      const { Behavior = [] } = sources[key]
      for (let i = 0; i < Behavior.length; i++) {
        if (Behavior[i].name === name) return Behavior[i]
      }
    }
  }
  each(sources, item => {
    if (!item) return
    if (!isBehaviorHost(item)) return
    const { Behavior = [] } = item
    each(Behavior, behavior => {
      if (findTargetBehavior(behavior)) return
      const name = behavior.name
      if (behavior.extends) {
        each(behavior.extends, dep => {
          const behavior = findSourceBehavior(dep)
          if (!behavior) throw new Error(`No ${dep} behavior that ${name} depends on`)
          if (!findTargetBehavior(behavior)) {
            target.unshift(behavior)
          }
        })
      }
      target.push(behavior)
    })
  })
}

/**
 * 引擎级注册表：每个 Engine 持有独立实例。
 *
 * 承载 behaviors / icons / i18n，替代旧的模块级 GlobalRegistry。
 */
export class Registry {
  i18n: I18n

  behaviors: IDesignerBehaviorStore = shallowRef([])

  icons: IDesignerIconsStore = shallowRef({})

  constructor(props: IRegistryProps = {}) {
    this.i18n = createI18n({
      language: props.language,
      fallbackLanguage: props.fallbackLanguage,
      locales: props.locales,
    })
    if (props.icons) {
      this.registerDesignerIcons(props.icons)
    }
  }

  setDesignerLanguage(lang: string) {
    this.i18n.setLanguage(lang)
  }

  getDesignerLanguage() {
    return this.i18n.getLanguage()
  }

  getDesignerMessage(token: string, locales?: IDesignerLocales) {
    return this.i18n.getMessage(token, locales)
  }

  registerDesignerLocales(...packages: IDesignerLocales[]) {
    this.i18n.registerLocales(...packages)
  }

  setDesignerBehaviors(behaviors: IBehaviorLike[]) {
    this.behaviors.value = behaviors.reduce<IBehavior[]>((buf, behavior) => {
      if (isBehaviorHost(behavior)) {
        return buf.concat(behavior.Behavior || [])
      } else if (isBehaviorList(behavior)) {
        return buf.concat(behavior)
      }
      return buf
    }, [])
  }

  getDesignerBehaviors(node: TreeNode) {
    return this.behaviors.value.filter(pattern => pattern.selector(node))
  }

  registerDesignerIcons(map: IDesignerIcons) {
    this.icons.value = {
      ...this.icons.value,
      ...map,
    }
  }

  getDesignerIcon(name: string) {
    return this.icons.value[name]
  }

  registerDesignerBehaviors(...packages: IDesignerBehaviors[]) {
    const results: IBehavior[] = []
    packages.forEach(sources => {
      reSortBehaviors(results, sources)
    })
    if (results.length) {
      this.behaviors.value = results
    }
  }
}
