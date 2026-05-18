import { describe, it, expect } from "vitest"
import { ok, err, map, flatMap, mapError, match } from "../src/result"

describe("result", () => {
  describe("ok", () => {
    it("should create ok result", () => {
      const r = ok(42)
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.value).toBe(42)
    })
  })

  describe("err", () => {
    it("should create err result", () => {
      const r = err("failed")
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBe("failed")
    })
  })

  describe("map", () => {
    it("should transform ok value", () => {
      const r = map(ok(2), x => x * 3)
      expect(match(r, v => v, () => -1)).toBe(6)
    })

    it("should pass through err", () => {
      const r = map(err<string>("oops"), (x: string) => x.toUpperCase())
      expect(r.ok).toBe(false)
    })
  })

  describe("flatMap", () => {
    it("should chain ok results", () => {
      const r = flatMap(ok(5), x => ok(x + 1))
      expect(match(r, v => v, () => -1)).toBe(6)
    })

    it("should short-circuit on err", () => {
      const r = flatMap(err<string>("fail"), (x: string) => ok(x + 1))
      expect(r.ok).toBe(false)
    })

    it("should propagate inner err", () => {
      const r = flatMap(ok(5), () => err<number>(0))
      expect(r.ok).toBe(false)
    })
  })

  describe("mapError", () => {
    it("should transform err", () => {
      const r = mapError(err(404), e => `Error: ${e}`)
      expect(match(r, () => "ok", e => e)).toBe("Error: 404")
    })

    it("should pass through ok", () => {
      const r = mapError(ok(1), e => String(e))
      expect(match(r, v => v, () => -1)).toBe(1)
    })
  })

  describe("match", () => {
    it("should call onOk for ok", () => {
      expect(match(ok("hi"), v => v.toUpperCase(), e => e)).toBe("HI")
    })

    it("should call onErr for err", () => {
      expect(match(err("no"), v => v, e => e.toUpperCase())).toBe("NO")
    })
  })
})
