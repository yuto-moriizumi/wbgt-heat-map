import { beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'

// Setup MSW server without default handlers
const server = setupServer()

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Close server after all tests
afterAll(() => server.close())

// Reset handlers after each test for test isolation
afterEach(() => server.resetHandlers())

export { server }