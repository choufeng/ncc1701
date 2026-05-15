import { describe, it, expect } from "vitest"
import { createQuitGuard } from "../src/quit-guard"

describe("createQuitGuard", () => {
  it("returns false on first signal", () => {
    const guard = createQuitGuard(1000)
    expect(guard()).toBe(false)
  })

  it("returns true on second signal within threshold", () => {
    const guard = createQuitGuard(1000)
    guard() // first
    expect(guard()).toBe(true) // second, immediately
  })

  it("returns false if second signal after threshold", () => {
    const guard = createQuitGuard(0) // 0ms threshold → already expired
    guard() // first
    expect(guard()).toBe(false) // second, after threshold
  })
})
