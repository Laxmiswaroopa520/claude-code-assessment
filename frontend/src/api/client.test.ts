import { describe, expect, it, vi } from 'vitest'
import { mockFetch, problem } from '../test/fetchMock'
import { ApiError, download, request, toApiError, toFieldKey } from './client'
import { buildExpenseQuery } from './expenses'

describe('api/client', () => {
  it('parses ValidationProblemDetails into field errors keyed case-insensitively → ApiError', async () => {
    const response = new Response(
      JSON.stringify({ title: 'One or more validation errors occurred.', status: 400, errors: { Amount: ['Amount must be greater than 0.'], '$.date': ['Bad date'] } }),
      { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
    )

    const error = await toApiError(response)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.fieldError('amount')).toBe('Amount must be greater than 0.')
    expect(error.fieldError('Date')).toBe('Bad date')
    expect(error.isBudgetRejection).toBe(false)
  })

  it('422 hard-budget problem → isBudgetRejection with detail and extensions', async () => {
    mockFetch([{ method: 'POST', path: '/api/expenses', response: problem(422, 'Budget exceeded', { detail: 'Hard budget for Food would be exceeded.', limit: 100 }) }])

    const promise = request('POST', '/api/expenses', { title: 'x' })

    await expect(promise).rejects.toMatchObject({ status: 422, isBudgetRejection: true, detail: 'Hard budget for Food would be exceeded.' })
    const error = await promise.catch((caught: unknown) => caught)
    expect(error instanceof ApiError ? error.problem?.limit : undefined).toBe(100)
  })

  it('non-JSON error body → falls back to status text', async () => {
    const error = await toApiError(new Response('boom', { status: 500, statusText: 'Internal Server Error' }))

    expect(error.title).toBe('Internal Server Error')
    expect(error.fieldErrors).toEqual({})
  })

  it('network failure → ApiError with status 0', async () => {
    const failing = async (): Promise<Response> => {
      throw new TypeError('Failed to fetch')
    }
    vi.stubGlobal('fetch', failing)

    await expect(request('GET', '/api/categories')).rejects.toMatchObject({ status: 0 })
  })

  it('204 response → resolves undefined', async () => {
    mockFetch([{ method: 'DELETE', path: '/api/expenses/1', response: { status: 204 } }])

    await expect(request('DELETE', '/api/expenses/1')).resolves.toBeUndefined()
  })

  it('download reads the file name from Content-Disposition', async () => {
    mockFetch([
      {
        path: /\/api\/reports\/monthly/,
        response: { text: 'Date,Title,Category,Amount\r\n', headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=expenses-2026-10.csv; filename*=UTF-8\'\'expenses-2026-10.csv' } },
      },
    ])

    const file = await download('/api/reports/monthly?month=2026-10&format=csv', 'fallback.csv')

    expect(file.fileName).toBe('expenses-2026-10.csv')
    expect(await file.blob.text()).toContain('Date,Title,Category,Amount')
  })

  it('buildExpenseQuery omits empty values and keeps the rest → query string', () => {
    const query = buildExpenseQuery({ q: '  taxi ', categoryId: 2, from: undefined, minAmount: 10, sortBy: 'amount', sortDir: 'asc', page: 1, pageSize: 10 })

    expect(query).toBe('?q=taxi&categoryId=2&minAmount=10&sortBy=amount&sortDir=asc&page=1&pageSize=10')
  })

  it('toFieldKey normalises server keys → camelCase', () => {
    expect(toFieldKey('CategoryId')).toBe('categoryId')
    expect(toFieldKey('$.amount')).toBe('amount')
  })
})
