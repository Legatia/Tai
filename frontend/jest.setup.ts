import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock EventSource for Surflux SSE tests
class MockEventSource {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;

    close = jest.fn();
}

global.EventSource = MockEventSource as any;

// Mock fetch for API tests
global.fetch = jest.fn();

// Mock scrollIntoView for DOM elements
Element.prototype.scrollIntoView = jest.fn();

// Reset mocks between tests
beforeEach(() => {
    jest.clearAllMocks();
});
