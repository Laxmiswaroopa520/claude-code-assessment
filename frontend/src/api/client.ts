import type { ProblemDetails } from '../types/api'

/** Base URL for the API. Empty in development so the Vite proxy forwards /api to http://localhost:5200 (FR-19 AC4). */
const baseUrl: string = import.meta.env.VITE_API_URL ?? ''

/** A non-2xx API response, parsed from application/problem+json when possible. */
export class ApiError extends Error {
  readonly status: number
  readonly title: string
  readonly detail: string | undefined
  /** Field errors keyed by lower-camel-case field name, e.g. { amount: ['Amount must be greater than 0.'] }. */
  readonly fieldErrors: Record<string, string[]>
  readonly problem: ProblemDetails | undefined

  constructor(status: number, title: string, detail: string | undefined, fieldErrors: Record<string, string[]>, problem?: ProblemDetails) {
    super(detail ?? title)
    this.name = 'ApiError'
    this.status = status
    this.title = title
    this.detail = detail
    this.fieldErrors = fieldErrors
    this.problem = problem
  }

  /** True for a hard-budget rejection (HTTP 422). */
  get isBudgetRejection(): boolean {
    return this.status === 422
  }

  /** The first message for a field, matched case-insensitively ("Amount" and "amount" are the same field). */
  fieldError(field: string): string | undefined {
    return this.fieldErrors[toFieldKey(field)]?.[0]
  }
}

/** "CategoryId" → "categoryId", "$.amount" → "amount". */
export function toFieldKey(field: string): string {
  const name = field.startsWith('$.') ? field.slice(2) : field
  return name.length === 0 ? name : name[0].toLowerCase() + name.slice(1)
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  return typeof value === 'object' && value !== null
}

/** Turns any failed response into an ApiError, reading ProblemDetails when the body is JSON. */
export async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDetails | undefined
  try {
    const body: unknown = await response.json()
    problem = isProblemDetails(body) ? body : undefined
  } catch {
    problem = undefined
  }

  const fieldErrors: Record<string, string[]> = {}
  if (problem?.errors) {
    for (const [field, messages] of Object.entries(problem.errors)) {
      const key = toFieldKey(field)
      fieldErrors[key] = [...(fieldErrors[key] ?? []), ...messages]
    }
  }

  const title = problem?.title ?? (response.statusText || `Request failed with status ${response.status}`)
  return new ApiError(response.status, title, problem?.detail, fieldErrors, problem)
}

async function send(path: string, init: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, init)
  } catch {
    throw new ApiError(0, 'The API could not be reached. Is the backend running on port 5200?', undefined, {})
  }

  if (!response.ok) {
    throw await toApiError(response)
  }

  return response
}

/** Sends a JSON request and returns the parsed body (undefined for 204). */
export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, headers: { Accept: 'application/json' } }
  if (body !== undefined) {
    init.headers = { Accept: 'application/json', 'Content-Type': 'application/json' }
    init.body = JSON.stringify(body)
  }

  const response = await send(path, init)
  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export interface DownloadedFile {
  blob: Blob
  fileName: string
}

/** Downloads a file and reads its name from Content-Disposition. */
export async function download(path: string, fallbackName: string): Promise<DownloadedFile> {
  const response = await send(path, { method: 'GET' })
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
  const fileName = match ? decodeURIComponent(match[1]) : fallbackName
  return { blob: await response.blob(), fileName }
}

/** Builds "?a=1&b=x" from defined, non-empty values. */
export function toQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value))
    }
  }

  const text = search.toString()
  return text.length > 0 ? `?${text}` : ''
}
