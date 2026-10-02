import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// React Testing Library does not unmount between tests on its own outside of
// its own globals setup; without this every suite leaks DOM into the next.
afterEach(() => {
  cleanup();
});

// jsdom implements neither the Pointer Capture API nor ResizeObserver, and the
// Radix primitives the admin forms are built from call both on open. Without
// these a <Select> throws instead of rendering its options.
if (typeof window !== "undefined") {
  const proto = window.Element.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
  proto.scrollIntoView ??= () => {};

  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
