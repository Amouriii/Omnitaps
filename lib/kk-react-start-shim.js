// Shim so that Koffee Kulture components can import useServerFn without
// pulling in the full @tanstack/react-start runtime.
export function useServerFn(fn) {
  return ({ data } = {}) => fn(data);
}
