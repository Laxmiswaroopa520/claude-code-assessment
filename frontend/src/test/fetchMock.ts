import { vi } from 'vitest'

/** A recorded fetch call. `body` is the parsed JSON request body, if any. */
export interface FetchCall {
  method: string
  url: string
  body: unknown
}

export interface MockResponse {
  status?: number
  body?: unknown
  /** Raw text body (used for CSV); `body` is JSON-encoded instead. */
  text?: string
  headers?: Record<string, string>
}

export interface MockRoute {
  method?: string
  /** Exact path (query ignored) or a regular expression tested against the full URL. */
  path: string | RegExp
  response: MockResponse | ((call: FetchCall) => MockResponse)
  /** Used once, then removed; once-routes are matched before permanent ones. */
  once?: boolean
}

export function problem(status: number, title: string, extra: Record<string, unknown> = {}): MockResponse {
  return {
    status,
    body: { type: 'about:blank', title, status, traceId: '00-test', ...extra },
    headers: { 'Content-Type': 'application/problem+json' },
  }
}

function matches(route: MockRoute, call: FetchCall): boolean {
  if ((route.method ?? 'GET') !== call.method) {
    return false
  }

  return typeof route.path === 'string' ? call.url.split('?')[0] === route.path : route.path.test(call.url)
}

function toResponse(mock: MockResponse): Response {
  const status = mock.status ?? 200
  if (status === 204) {
    return new Response(null, { status })
  }

  if (mock.text !== undefined) {
    return new Response(mock.text, { status, headers: mock.headers })
  }

  return new Response(JSON.stringify(mock.body ?? null), {
    status,
    headers: mock.headers ?? { 'Content-Type': 'application/json' },
  })
}

/** Replaces global fetch with an in-memory router. Unmatched requests get a 404 ProblemDetails. */
export function mockFetch(routes: MockRoute[]): { calls: FetchCall[]; add: (route: MockRoute) => void } {
  const active: MockRoute[] = [...routes]
  const calls: FetchCall[] = []

  const fake = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = (init?.method ?? 'GET').toUpperCase()
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    const call: FetchCall = { method, url, body }
    calls.push(call)

    const once = active.findIndex((route) => route.once === true && matches(route, call))
    const index = once >= 0 ? once : active.findIndex((route) => route.once !== true && matches(route, call))
    if (index < 0) {
      return toResponse(problem(404, `No mock for ${method} ${url}`))
    }

    const route = active[index]
    if (route.once === true) {
      active.splice(index, 1)
    }

    return toResponse(typeof route.response === 'function' ? route.response(call) : route.response)
  })

  vi.stubGlobal('fetch', fake)
  return { calls, add: (route: MockRoute) => active.push(route) }
}
