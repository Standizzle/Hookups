// Best-effort, fast location snapshot — never blocks the caller for long.
// Used symmetrically on every PIN submission (login + consent confirm) so
// that behavior is identical whether or not the PIN turns out to be a
// duress PIN; the client never learns which case it is.
export function getQuickLocation(timeoutMs = 2000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    const timer = setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}
