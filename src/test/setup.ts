// Vitest setup: adds jest-dom matchers (toBeInTheDocument, etc.) so component
// tests can assert on the DOM. The `/vitest` entry extends Vitest's `expect`
// directly, so this works without enabling global test APIs. Wired in via
// vite.config.ts `setupFiles`.
import "@testing-library/jest-dom/vitest";
