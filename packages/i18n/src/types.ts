export type ILocaleMessages = Record<string, any>

export type ILocales = Record<string, ILocaleMessages>

export interface II18nProps {
  language?: string
  fallbackLanguage?: string
  locales?: ILocales
}

export type I18nVariables = Record<string, string | number | boolean | null | undefined>
