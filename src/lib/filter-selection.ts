export type FilterSelection = string | string[]
export function selectedFilterValues(value?: FilterSelection): string[] {
 return Array.isArray(value) ? value : value ? [value] : []
}
export function matchesFilterSelection(value: string | undefined, selection?: FilterSelection): boolean {
 const selected=selectedFilterValues(selection)
 return selected.length===0 || (value!==undefined && selected.includes(value))
}
export function hasFilterSelection(value:unknown):boolean {
 return Array.isArray(value) ? value.length>0 : value!==undefined && value!=='' && value!=='all'
}
