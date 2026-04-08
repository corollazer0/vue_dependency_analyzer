import { ref } from 'vue'

export function useNativeBridge() {
  const isNative = ref(typeof window !== 'undefined' && !!(window as any).NativeApp)
  const isAndroid = ref(typeof window !== 'undefined' && !!(window as any).AndroidBridge)
  const isIOS = ref(typeof window !== 'undefined' && !!(window as any).iOSBridge)

  function openCamera() { return (window as any).NativeApp.openCamera() }
  function takePhoto() { return (window as any).AndroidBridge.takePhoto() }
  function requestBiometric() { return (window as any).NativeApp.requestBiometric() }
  function registerPush(token: string) { (window as any).NativeApp.registerPush(token) }
  function requestPushPermission() { (window as any).iOSBridge.requestPushPermission() }
  function share(title: string, url: string) { (window as any).NativeApp.share(title, url) }
  function shareContent(data: string) { (window as any).AndroidBridge.shareContent(data) }
  function getDeviceInfo() { return (window as any).NativeApp.getDeviceInfo() }
  function hapticFeedback() { (window as any).NativeApp.hapticFeedback() }
  function openDeepLink(url: string) { (window as any).AndroidBridge.openDeepLink(url) }
  function showNativeToast(msg: string) { (window as any).iOSBridge.showToast(msg) }

  return { isNative, isAndroid, isIOS, openCamera, takePhoto, requestBiometric, registerPush, requestPushPermission, share, shareContent, getDeviceInfo, hapticFeedback, openDeepLink, showNativeToast }
}
