# i18n API

`@formvk/designable-i18n` 提供与框架无关的国际化内核。设计器 UI 文案与节点文案分别使用两个 `I18n` 实例：
前者在 `@formvk/designable-react` 的 `Designer` / `ConfigProvider` 内创建，后者是 `engine.registry.i18n`。

## I18n

```ts
class I18n {
  readonly fallbackLanguage: string
  @shallowRef accessor language: string
  @shallowRef accessor locales: ILocales

  constructor(props?: II18nProps)

  getLanguage(): string
  getLocale(language?: string): ILocaleMessages | undefined

  registerLocales(...packages: ILocales[]): void
  registerLocale(language: string, messages: ILocaleMessages): void
  setLanguage(nextLanguage: string): void

  getMessage(token: string, explicitLocales?: ILocales, defaultMessage?: string): any
  t(token: string, variables?: I18nVariables, defaultMessage?: string): string

  subscribe(subscriber: () => void): () => void
  dispose(): void
}

createI18n(props?: II18nProps): I18n
```

`language` 与 `locales` 是响应式字段，`setLanguage` / `registerLocale(s)` 标记为 `@action`。`subscribe` 用于
命令式监听，返回注销函数；`dispose` 清空全部订阅。

## 类型

```ts
interface II18nProps {
  language?: string
  fallbackLanguage?: string
  locales?: ILocales
}

type ILocaleMessages = Record<string, any>
type ILocales = Record<string, ILocaleMessages>
type I18nVariables = Record<string, string | number | boolean | null | undefined>
```

`locales` 的键是语言代码，值可以是嵌套对象：

```ts
const i18n = createI18n({
  language: 'zh-CN',
  fallbackLanguage: 'en-US',
  locales: {
    'zh-CN': { common: { save: '保存' } },
    'en-US': { common: { save: 'Save' } },
  },
})

i18n.t('common.save') // 保存
i18n.t('greeting', { name: 'Ada' }, 'Hello') // 变量插值
```

## t 的查找顺序

1. 当前语言。
2. `fallbackLanguage`。
3. 任意包含该 token 的语言。
4. `defaultMessage`。
5. token 本身。

命中后使用 `formatMessage` 做变量替换，缺失变量保持 `{name}` 原样。

## 方法说明

| 方法                                           | 说明                                       |
| ---------------------------------------------- | ------------------------------------------ |
| `getMessage(token, locales?, defaultMessage?)` | 按当前语言解析并返回原始值（可为任意类型） |
| `t(token, variables?, defaultMessage?)`        | 解析 + 变量插值，返回字符串                |
| `registerLocale(language, messages)`           | 合并单个语言的文案                         |
| `registerLocales(...packages)`                 | 批量合并多个语言的文案                     |
| `setLanguage(nextLanguage)`                    | 切换当前语言，触发依赖更新                 |
| `subscribe(subscriber)`                        | 监听语言或文案变化，返回注销函数           |
| `dispose()`                                    | 清空全部订阅                               |

`registerLocale` 与 `registerLocales` 按语言深度合并，同名 token 后注册的覆盖先注册的。

## 工具函数

```ts
formatMessage(message: string, variables?: I18nVariables): string

lowerSnake(str: string): string
mergeLocales(target: any, source: any): any
getBrowserLanguage(): string

findLocale(
  locales: ILocales | undefined,
  isoCode: string
): ILocaleMessages | undefined

getISOCode(language: string, locales: ILocales): string
resolveMessage(locale: ILocaleMessages | undefined, token: string): any
```

| 函数                 | 说明                                                 |
| -------------------- | ---------------------------------------------------- |
| `formatMessage`      | 将 `{name}` 占位符替换为变量值，支持任意嵌套 key     |
| `lowerSnake`         | 语言代码归一化：`zh-CN` → `zh-cn`，`en_US` → `en-us` |
| `mergeLocales`       | 深度合并两份 `ILocales`                              |
| `getBrowserLanguage` | 读取浏览器语言，失败时返回 `'en-US'`                 |
| `findLocale`         | 在 `locales` 中按归一化后的语言代码查找              |
| `getISOCode`         | 从 `locales` 中找出与给定语言最匹配的键              |
| `resolveMessage`     | 按点分 token（如 `common.save`）从语言包中取值       |

## React 侧绑定

| API                                           | 说明                                          |
| --------------------------------------------- | --------------------------------------------- |
| `useI18n(): I18n`                             | 当前 `Designer` 的 UI i18n 实例               |
| `useLocale(): string`                         | 当前语言                                      |
| `useText()`                                   | 返回 `(token, defaultMessage?) => string`     |
| `TextWidget`                                  | 渲染 token、多语言对象或 children，见组件参考 |
| `Designer locale / fallbackLocale / messages` | 配置 UI 文案与初始语言                        |
| `engine.registry.setDesignerLanguage(lang)`   | 切换节点文案语言（独立于 UI 语言）            |

`TextWidget` 的取值优先级为 token → children → defaultMessage；`token` 与 `defaultMessage` 都支持
`{ 'zh-CN': '保存', 'en-US': 'Save' }` 形式的对象，按当前语言做大小写不敏感匹配。

完整的配置步骤见[国际化](/guide/how-to/i18n)。
