import { expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

// Setup MSW server without default handlers
const server = setupServer()

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Close server after all tests
afterAll(() => server.close())

// Reset handlers after each test for test isolation
afterEach(() => server.resetHandlers())

export { server }
