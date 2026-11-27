import DefaultTheme from 'vitepress/theme'

import PlaygroundReact from './PlaygroundReact.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('PlaygroundReact', PlaygroundReact)
  },
}
