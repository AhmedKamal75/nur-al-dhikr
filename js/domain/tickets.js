/** Independent opaque ownership tickets. Invalidations never rewind or reuse. */
export function createTickets() {
  let ticket = {};
  return {
    current: () => ticket,
    mint: () => (ticket = {}),
    isCurrent: (candidate) => candidate === ticket,
  };
}
