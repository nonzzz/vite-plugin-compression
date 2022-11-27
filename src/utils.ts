export const len = <T>(source?: T[] | string) => source.length

// [path][base].ext
export const replaceFileName = (staticPath: string, rule: string | ((id: string) => string)) => {
  const series = staticPath.split('/')
  const base = '/' + series.pop()
  const fileNameTempalte = typeof rule === 'function' ? rule(staticPath) : rule
  const path = series.filter((_, idx) => idx === len(series) - 1).join('/')
  return fileNameTempalte.replace(/\[path\]/, path).replace(/\[base\]/, base)
}
