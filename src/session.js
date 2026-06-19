export const ensureSessionId = () => {
  const params = new URLSearchParams(window.location.search)
  let id = params.get('s')
  if (!id) {
    id = crypto.randomUUID()
    params.set('s', id)
    const query = params.toString()
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?${query}${window.location.hash}`,
    )
  }
  return id
}
