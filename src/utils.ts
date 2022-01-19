import type { Runtime } from 'webextension-polyfill'
import browser from 'webextension-polyfill'

/** Browser Extenion Utils */
export const isBackgroundScript = async(context: Window) => {
  return browser.runtime.getBackgroundPage()
    .then(i => context === i)
    .catch(() => false)
}

export const connectToBackground = (name: string) => browser.runtime.connect(browser.runtime.id, { name })
export const handleConnection = (callback: (port: Runtime.Port) => void) => browser.runtime.onConnect.addListener(callback)

/** ID utils */
export function genConnectId() {
  return `@@${Math.random().toString(36).substr(2, 9)}@@`
}

export function checkConnectId(str: string) {
  return /^@@[0-9,a-z,A_Z]{9}@@[0-9,a-z,A-Z]+/.test(str)
}

export function removeConnectId(str: string) {
  const matches = str.match(/^@@[0-9,a-z,A-Z]{9}@@([0-9,a-z,A-Z]+)/)!
  return matches?.[1]
}

// Misc
export function log(...args: any[]) {
  console.log(`[${new Date().toLocaleTimeString()}]`, ...args)
}
