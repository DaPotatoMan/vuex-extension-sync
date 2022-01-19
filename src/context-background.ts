import type { Runtime } from 'webextension-polyfill'
import type { MutationPayload, Store } from 'vuex'

import { toRaw } from 'vue'
import { checkConnectId, handleConnection, log, removeConnectId } from './utils'

const bgPrefix = 'BACKGROUND_'

class BackgroundScript {
  private store: Store<unknown>
  private connections: Runtime.Port[] = []

  constructor(store: Store<unknown>) {
    this.store = store
    this.connections = []

    this.store.subscribe((mutation) => {
      for (let i = 0; i < this.connections.length; i++) {
        const connection = this.connections[i]
        let mutationType = mutation.type
        if (mutationType.indexOf(connection.name) === 0)
          continue

        if (checkConnectId(mutationType))
          mutationType = removeConnectId(mutationType)

        this.sendMutation(connection, { ...mutation, type: bgPrefix + mutationType })
      }
    })

    handleConnection((connection) => {
      this.onConnection(connection)
    })
  }

  onConnection(connection: Runtime.Port) {
    this.bindMutation(connection)

    connection.onDisconnect.addListener((conn) => {
      this.onDisconnect(conn)
      this.unbindMutation(connection)
    })

    connection.onMessage.addListener((message) => {
      this.onMessage(connection, message)
    })

    this.connections.push(connection)

    connection.postMessage({
      type: '@@STORE_INITIAL_STATE',
      data: toRaw(this.store.state),
    })
  }

  bindMutation(connection: Runtime.Port) {
    const connectName = connection.name
    const { _mutations: mutations } = this.store
    Object.entries(mutations).forEach(([type, funcList]) => {
      const isF = this.connections.some((conn) => {
        return type.indexOf(conn.name) === 0
      })

      if (!isF)
        mutations[connectName + type] = funcList
    })
  }

  unbindMutation(connection: Runtime.Port) {
    const connectName = connection.name
    const { _mutations: mutations } = this.store
    Object.entries(mutations).forEach(([type]) => {
      if (type.indexOf(connectName) === 0)
        delete mutations[type]
    })
  }

  onDisconnect(connection: Runtime.Port) {
    for (let i = this.connections.length - 1; i >= 0; i--) {
      if (this.connections[i].name === connection.name) {
        this.connections.splice(i, 1)
        log('disconnect', connection.name)
      }
    }
  }

  onMessage(connection: Runtime.Port, message: any) {
    if (message.type !== '@@STORE_SYNC_MUTATION')
      return

    this.store.commit(message.data.type, message.data.payload)
  }

  sendMutation(connection: Runtime.Port, mutation: MutationPayload) {
    connection.postMessage({
      type: '@@STORE_SYNC_MUTATION',
      data: mutation,
    })
  }
}

export default BackgroundScript
