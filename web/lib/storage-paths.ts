export function isOwnedStoragePath(
  path: unknown,
  userId: string,
  root: 'course-pdfs' | 'course-layouts',
): path is string {
  if (typeof path !== 'string') return false
  const prefix = `${root}/${userId}/`
  if (!path.startsWith(prefix)) return false
  const tail = path.slice(prefix.length)
  if (!tail) return false
  return tail.split('/').every(segment => segment !== '' && segment !== '.' && segment !== '..')
}
