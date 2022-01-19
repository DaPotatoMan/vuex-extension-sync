import type { MutationPayload, Store } from 'vuex'
import type { Runtime } from 'webextension-polyfill'

import { connectToBackground, genConnectId, log } from './utils'

const bgPrefix = 'BACKGROUND_'

class ContentScript {
  private store: Store<unknown>
  private connection?: Runtime.Port
  private scriptId: string
  private initialized = false
  private pendingMutations: MutationPayload[] = []

  constructor(store: Store<unknown>) {
    this.store = store
    this.scriptId = genConnectId()

    this.bindMutation()

    this.connection = connectToBackground(`${this.scriptId}`)

    this.connection.onMessage.addListener((message) => {
      this.onMessage(message)
    })

    this.store.subscribe((mutation) => {
      if (!this.initialized) {
        this.pendingMutations.push(mutation)
        return
      }
      if (mutation.type.includes(bgPrefix))
        return

      this.sendMutation({ ...mutation, type: this.scriptId + mutation.type })
    })
  }

  bindMutation() {
    const { _mutations: mutations } = this.store
    Object.entries(mutations).forEach(([type, funcList]) => {
      mutations[bgPrefix + type] = funcList
    })
  }

  onMessage(message: any) {
    log(message, this.initialized)

    if (message.type === '@@STORE_INITIAL_STATE') {
      this.store.replaceState(message.data)
      this.initialized = true
      this.processPendingMutations()
    }
    else if (message.type === '@@STORE_SYNC_MUTATION') {
      // Don't commit any mutation from other contexts before the initial state sync
      if (!this.initialized)
        return

      if (Reflect.has(this.store._mutations, message.data.type))
        this.store.commit(message.data.type, message.data.payload)
    }
  }

  sendMutation(mutation: MutationPayload) {
    this.connection?.postMessage({
      type: '@@STORE_SYNC_MUTATION',
      data: mutation,
    })
  }

  processPendingMutations() {
    if (!this.pendingMutations.length)
      return

    for (let i = 0; i < this.pendingMutations.length; i++) {
      this.store.commit(this.pendingMutations[i].type, this.pendingMutations[i].payload)
      this.pendingMutations.splice(i, 1)
    }
  }
}

export default ContentScript
