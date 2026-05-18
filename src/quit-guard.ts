// ⚠️ 副作用：闭包内持有可变状态 (lastSignal)
/** 创建双击退出守卫。返回 true 表示应该退出 */
export function createQuitGuard(thresholdMs: number): () => boolean {
  let lastSignal = 0

  return (): boolean => {
    const now = Date.now()
    if (lastSignal !== 0 && now - lastSignal < thresholdMs) {
      return true
    }
    lastSignal = now
    return false
  }
}
