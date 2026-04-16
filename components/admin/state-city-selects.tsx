"use client"

import { useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type StateRow = { id: number; title: string }
type CityRow = { id: number; title: string }

export function StateCitySelects(props: {
  stateId: string
  cityId: string
  onStateChange: (stateId: string) => void
  onCityChange: (cityId: string) => void
  disabled?: boolean
  idPrefix?: string
}) {
  const { stateId, cityId, onStateChange, onCityChange, disabled, idPrefix = "addr" } = props
  const [states, setStates] = useState<StateRow[]>([])
  const [cities, setCities] = useState<CityRow[]>([])

  useEffect(() => {
    void (async () => {
      try {
        const raw = await apiService.getStates()
        const data = laravelInnerData<StateRow[]>(raw)
        setStates(Array.isArray(data) ? data : [])
      } catch {
        setStates([])
      }
    })()
  }, [])

  useEffect(() => {
    if (!stateId) {
      setCities([])
      return
    }
    void (async () => {
      try {
        const raw = await apiService.getCities({ state: Number(stateId) })
        const data = laravelInnerData<CityRow[]>(raw)
        setCities(Array.isArray(data) ? data : [])
      } catch {
        setCities([])
      }
    })()
  }, [stateId])

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-state`}>Estado</Label>
        <Select value={stateId || undefined} onValueChange={onStateChange} disabled={disabled}>
          <SelectTrigger id={`${idPrefix}-state`}>
            <SelectValue placeholder="Seleccione o estado" />
          </SelectTrigger>
          <SelectContent>
            {states.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-city`}>Cidade</Label>
        <Select
          value={cityId || undefined}
          onValueChange={onCityChange}
          disabled={disabled || !stateId}
        >
          <SelectTrigger id={`${idPrefix}-city`}>
            <SelectValue placeholder={stateId ? "Seleccione a cidade" : "Primeiro o estado"} />
          </SelectTrigger>
          <SelectContent>
            {cities.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
