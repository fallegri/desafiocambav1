// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readJsonBody, withApi } from './http.js'

function makeRequest(body) {
  return { method: 'POST', headers: {}, body, url: '/api/test', query: {}, socket: {} }
}

function makeResponse() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value
    },
    end(raw) {
      this.payload = raw ? JSON.parse(raw) : null
    },
  }
}

describe('readJsonBody', () => {
  it('accepts an already parsed object', async () => {
    await expect(readJsonBody(makeRequest({ action: 'approve' }))).resolves.toEqual({
      action: 'approve',
    })
  })

  it('parses a JSON string body', async () => {
    await expect(readJsonBody(makeRequest('{"count":3}'))).resolves.toEqual({ count: 3 })
  })

  it('rejects malformed JSON with a 400', async () => {
    await expect(readJsonBody(makeRequest('{action:approve}'))).rejects.toMatchObject({
      status: 400,
    })
  })

  it('maps the runtime body getter error to a 400 too', async () => {
    // Vercel's Node runtime parses the body eagerly: reading `req.body` throws
    // on malformed JSON, and that must never surface as a 500.
    const request = {
      method: 'POST',
      headers: {},
      url: '/api/test',
      query: {},
      socket: {},
      get body() {
        const error = new Error('Invalid JSON')
        error.statusCode = 400
        throw error
      },
    }

    await expect(readJsonBody(request)).rejects.toMatchObject({ status: 400 })
  })

  it('turns a throwing body into a clean 400 response through withApi', async () => {
    const handler = withApi(async (req) => readJsonBody(req))
    const request = {
      method: 'POST',
      headers: {},
      url: '/api/test',
      query: {},
      socket: {},
      get body() {
        throw new Error('Invalid JSON')
      },
    }
    const res = makeResponse()

    await handler(request, res)

    expect(res.statusCode).toBe(400)
    expect(res.payload.error).toBe('El cuerpo debe ser un objeto JSON válido')
  })
})
