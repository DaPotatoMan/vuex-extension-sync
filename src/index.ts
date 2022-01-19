import type { Store } from 'vuex'

import { isBackgroundScript } from './utils'
import BackgroundScript from './context-background'
import ContentScript from './context-content_script'

export default () => {
  return (store: Store<unknown>) => {
    isBackgroundScript(window).then((isBackground) => {
      if (isBackground) return new BackgroundScript(store)
      return new ContentScript(store)
    })
  }
}
