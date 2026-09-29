import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Unmount rendered components between tests (no vitest globals, so do it explicitly)
afterEach(() => cleanup());
