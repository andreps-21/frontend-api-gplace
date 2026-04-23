"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps as RechartsTooltipProps,
  ReferenceLine,
  LabelList,
} from "recharts"
import { Calendar, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type DashboardOrdersYearlyPayload,
  type DashboardOrdersDailyPayload,
  apiService,
} from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const CORES_ANO = [
  "var(--primary)",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
  "#22c55e",
]

const MEDIA_STROKE = "var(--muted-foreground)"
const LINEA_MES = "var(--primary)"

const NOMES_MES: Record<number, string> = {
  1: "Janeiro",
  2: "Fevereiro",
  3: "Março",
  4: "Abril",
  5: "Maio",
  6: "Junho",
  7: "Julho",
  8: "Agosto",
  9: "Setembro",
  10: "Outubro",
  11: "Novembro",
  12: "Dezembro",
}

function formatInt(n: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n))
}

type LocalTooltipProps = {
  active?: boolean
  label?: string
  payload?: Array<{ dataKey: string; value: number; color: string; name: string }>
}

function ChartTooltipAnual({
  active,
  label,
  payload,
  anosVisiveis,
  mediaRef,
}: LocalTooltipProps & { anosVisiveis: Set<number>; mediaRef: number | null }) {
  if (!active || !payload?.length) return null
  const items = payload.filter((p) => {
    const y = Number(p.dataKey)
    return Number.isFinite(y) && anosVisiveis.has(y)
  })
  if (items.length === 0) return null
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-md">
      <p className="mb-2 text-sm font-semibold text-foreground">{label}</p>
      <ul className="space-y-1 text-sm">
        {items.map((entry) => (
          <li key={entry.dataKey} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium tabular-nums">{formatInt(Number(entry.value))}</span>
          </li>
        ))}
      </ul>
      {mediaRef != null && mediaRef > 0 && (
        <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
          Média (meses × anos visíveis): <span className="font-medium text-foreground">{formatInt(mediaRef)}</span>
        </p>
      )}
    </div>
  )
}

type StatsVisiveis = {
  somaGrafico: number
  mediaMensalCelula: number
  maxVal: number
  maxDetalhe: string
  anoMaiorTotal: { ano: number; total: number }
  nCelulas: number
}

function computeStatsAnual(
  chartData: Array<Record<string, string | number>>,
  anos: number[],
  anosVisiveis: Set<number>,
): StatsVisiveis | null {
  const vy = anos.filter((a) => anosVisiveis.has(a))
  if (vy.length === 0 || chartData.length === 0) return null

  let soma = 0
  let maxVal = -Infinity
  let maxDetalhe = ""

  for (const row of chartData) {
    for (const y of vy) {
      const v = Number(row[String(y)] ?? 0)
      soma += v
      if (v > maxVal) {
        maxVal = v
        maxDetalhe = `${row.label} ${y}`
      }
    }
  }

  const nCelulas = 12 * vy.length
  const mediaMensalCelula = nCelulas > 0 ? soma / nCelulas : 0

  const porAno = vy.map((y) => ({
    ano: y,
    total: chartData.reduce((acc, row) => acc + Number(row[String(y)] ?? 0), 0),
  }))
  const anoMaiorTotal = porAno.reduce((a, b) => (a.total >= b.total ? a : b), porAno[0])

  return {
    somaGrafico: soma,
    mediaMensalCelula,
    maxVal: maxVal === -Infinity ? 0 : maxVal,
    maxDetalhe,
    anoMaiorTotal,
    nCelulas,
  }
}

export function OrdersYearlyChart({ payload }: { payload?: DashboardOrdersYearlyPayload | null }) {
  const { user } = useAuth()
  const now = new Date()
  const anos = payload?.anos ?? []

  const [viewMode, setViewMode] = useState<"annual" | "monthly">("annual")
  const [hiddenYears, setHiddenYears] = useState<Record<number, boolean>>({})
  const [showMediaLine, setShowMediaLine] = useState(true)

  const [selYear, setSelYear] = useState(() => now.getFullYear())
  const [selMonth, setSelMonth] = useState(() => now.getMonth() + 1)
  const [dailyPayload, setDailyPayload] = useState<DashboardOrdersDailyPayload | null>(null)
  const [dailyLoading, setDailyLoading] = useState(false)
  const [dailyErr, setDailyErr] = useState<string | null>(null)

  const toggleAno = useCallback((ano: number) => {
    setHiddenYears((prev) => ({ ...prev, [ano]: !prev[ano] }))
  }, [])

  const anosVisiveis = useMemo(() => {
    const s = new Set<number>()
    for (const a of anos) if (!hiddenYears[a]) s.add(a)
    return s
  }, [anos, hiddenYears])

  const chartData = useMemo(() => {
    if (!payload?.meses?.length) return []
    return payload.meses.map((row) => {
      const point: Record<string, string | number> = { label: row.label, mes: row.mes }
      for (const ano of anos) point[String(ano)] = row.totais[String(ano)] ?? 0
      return point
    })
  }, [payload?.meses, anos])

  const stats = useMemo(() => computeStatsAnual(chartData, anos, anosVisiveis), [chartData, anos, anosVisiveis])
  const mediaRef = stats && stats.nCelulas > 0 ? stats.mediaMensalCelula : null

  const maxY = useMemo(() => {
    let m = 0
    for (const row of chartData) {
      for (const ano of anos) {
        if (!anosVisiveis.has(ano)) continue
        const v = Number(row[String(ano)] ?? 0)
        if (v > m) m = v
      }
    }
    if (showMediaLine && mediaRef != null && mediaRef > m) m = mediaRef
    return m > 0 ? Math.ceil(m * 1.08) : 1
  }, [chartData, anos, anosVisiveis, showMediaLine, mediaRef])

  const anosOrdenadosAsc = useMemo(() => [...anos].sort((a, b) => a - b), [anos])

  useEffect(() => {
    if (viewMode !== "monthly") return
    let cancel = false
    void (async () => {
      setDailyLoading(true)
      setDailyErr(null)
      try {
        const p: { year: number; month: number; seller_id?: number } = {
          year: selYear,
          month: selMonth,
        }
        if (user?.role === "vendedor" && user.id) p.seller_id = user.id
        const raw = await apiService.getDashboardOrdersDaily(p)
        const inner = laravelInnerData<DashboardOrdersDailyPayload>(raw)
        if (!cancel) setDailyPayload(inner)
      } catch (e) {
        if (!cancel) {
          setDailyPayload(null)
          setDailyErr(e instanceof Error ? e.message : "Erro ao carregar pedidos do mês")
        }
      } finally {
        if (!cancel) setDailyLoading(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [viewMode, selYear, selMonth, user?.role, user?.id])

  const chartDataMensal = useMemo(
    () => (dailyPayload?.dias?.length ? dailyPayload.dias : []),
    [dailyPayload],
  )

  const statsMensal = useMemo(() => {
    if (chartDataMensal.length === 0) return null
    const soma = chartDataMensal.reduce((a, d) => a + d.total, 0)
    const n = chartDataMensal.length
    const mediaDia = n > 0 ? soma / n : 0
    let maxVal = 0
    let diaPico = 1
    for (const d of chartDataMensal) {
      if (d.total > maxVal) {
        maxVal = d.total
        diaPico = d.dia
      }
    }
    return { soma, mediaDia, maxVal, diaPico, n }
  }, [chartDataMensal])

  const maxYMensal = useMemo(() => {
    if (chartDataMensal.length === 0) return 1
    let m = 0
    for (const d of chartDataMensal) if (d.total > m) m = d.total
    if (statsMensal && showMediaLine && statsMensal.mediaDia > m) m = statsMensal.mediaDia
    return m > 0 ? Math.ceil(m * 1.08) : 1
  }, [chartDataMensal, statsMensal, showMediaLine])

  const yearOptions = useMemo(() => {
    const y = now.getFullYear()
    return Array.from({ length: 12 }, (_, i) => y - i)
  }, [now])

  const tituloMensal =
    dailyPayload != null
      ? `${NOMES_MES[dailyPayload.month] ?? ""} de ${dailyPayload.year}`
      : `${NOMES_MES[selMonth] ?? ""} de ${selYear}`

  const showRefLine = Boolean(showMediaLine && stats && stats.nCelulas > 0 && stats.mediaMensalCelula >= 0)
  const showRefMensal = Boolean(
    viewMode === "monthly" && showMediaLine && statsMensal && statsMensal.n > 0,
  )

  const anualVazio = !payload || anos.length === 0

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <CardTitle className="text-base">Pedidos</CardTitle>
            <p className="text-sm text-muted-foreground">
              Comparativo anual (Jan–Dez por ano) ou, opcionalmente, pedidos por dia num mês seleccionado.
            </p>
          </div>
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
        </div>
        <div
          className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-center"
          role="tablist"
          aria-label="Modo de visualização do gráfico"
        >
          <div className="grid grid-cols-2 gap-1 rounded-md border border-border p-0.5 sm:inline-flex sm:w-auto">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "annual" ? "secondary" : "ghost"}
              className="flex-1 sm:flex-initial"
              onClick={() => setViewMode("annual")}
            >
              Por ano
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "monthly" ? "secondary" : "ghost"}
              className="flex-1 gap-1.5 sm:flex-initial"
              onClick={() => setViewMode("monthly")}
            >
              <Calendar className="h-3.5 w-3.5" />
              Mensal (dias)
            </Button>
          </div>
        </div>

        {viewMode === "monthly" && (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="grid gap-1.5 sm:w-40">
              <Label className="text-xs text-muted-foreground">Mês</Label>
              <Select value={String(selMonth)} onValueChange={(v) => setSelMonth(parseInt(v, 10))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {NOMES_MES[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 sm:w-32">
              <Label className="text-xs text-muted-foreground">Ano</Label>
              <Select value={String(selYear)} onValueChange={(v) => setSelYear(parseInt(v, 10))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {viewMode === "annual" && (
          <>
            {anualVazio ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Sem dados para montar o gráfico anual.</p>
            ) : (
              <>
                {stats && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Soma no gráfico</p>
                      <p className="text-lg font-semibold tabular-nums">{formatInt(stats.somaGrafico)}</p>
                      <p className="text-[10px] text-muted-foreground">Anos visíveis × 12 meses</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Média (mensal)</p>
                      <p className="text-lg font-semibold tabular-nums">{formatInt(stats.mediaMensalCelula)}</p>
                      <p className="text-[10px] text-muted-foreground">Média por célula mês/ano</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Maior valor</p>
                      <p className="text-lg font-semibold tabular-nums">{formatInt(stats.maxVal)}</p>
                      <p className="truncate text-[10px] text-muted-foreground" title={stats.maxDetalhe}>
                        {stats.maxDetalhe}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Ano com mais pedidos</p>
                      <p className="text-lg font-semibold tabular-nums">
                        {stats.anoMaiorTotal.ano}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          ({formatInt(stats.anoMaiorTotal.total)})
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                <div className="h-64 w-full min-w-0 sm:h-80 [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50">
                  {anosVisiveis.size === 0 ? (
                    <div className="flex h-full min-h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                      Selecione ao menos um ano na legenda para exibir o gráfico.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 28, right: 12, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                          tickLine={false}
                          axisLine={{ className: "stroke-border" }}
                        />
                        <YAxis
                          domain={[0, maxY]}
                          tickFormatter={(v) => formatInt(v)}
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                          tickLine={false}
                          axisLine={{ className: "stroke-border" }}
                          width={48}
                        />
                        <Tooltip
                          content={(props: RechartsTooltipProps<number, string>) => (
                            <ChartTooltipAnual
                              active={props.active}
                              label={props.label != null ? String(props.label) : undefined}
                              payload={props.payload as LocalTooltipProps["payload"]}
                              anosVisiveis={anosVisiveis}
                              mediaRef={mediaRef != null && mediaRef > 0 ? mediaRef : null}
                            />
                          )}
                        />
                        {showRefLine && stats && (
                          <ReferenceLine
                            y={stats.mediaMensalCelula}
                            stroke={MEDIA_STROKE}
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            label={{
                              value: `Média ${formatInt(stats.mediaMensalCelula)}`,
                              position: "insideTopRight",
                              fontSize: 10,
                              fill: MEDIA_STROKE,
                            }}
                          />
                        )}
                        {anosOrdenadosAsc.map((ano, idx) => {
                          if (!anosVisiveis.has(ano)) return null
                          const stroke = CORES_ANO[idx % CORES_ANO.length]
                          return (
                            <Line
                              key={ano}
                              type="monotone"
                              dataKey={String(ano)}
                              name={String(ano)}
                              stroke={stroke}
                              strokeWidth={3}
                              dot={{ r: 3, strokeWidth: 1.5 }}
                              activeDot={{ r: 5 }}
                              isAnimationActive
                              animationDuration={1800}
                              animationEasing="ease-out"
                              animationBegin={idx * 200}
                            >
                              <LabelList
                                dataKey={String(ano)}
                                position="top"
                                offset={6}
                                className="fill-foreground"
                                fontSize={10}
                                formatter={(v: string | number) => formatInt(Number(v ?? 0))}
                              />
                            </Line>
                          )
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2 text-sm">
                    {anosOrdenadosAsc.map((ano, idx) => {
                      const hidden = Boolean(hiddenYears[ano])
                      const color = CORES_ANO[idx % CORES_ANO.length]
                      return (
                        <button
                          key={ano}
                          type="button"
                          onClick={() => toggleAno(ano)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 transition-colors",
                            hidden
                              ? "border-dashed border-muted-foreground/40 bg-muted/30 opacity-60"
                              : "border-border bg-background hover:bg-muted/50",
                          )}
                          title={hidden ? "Clique para exibir esta linha" : "Clique para ocultar esta linha"}
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: hidden ? "var(--muted-foreground)" : color }}
                          />
                          <span className={cn("text-muted-foreground", hidden && "line-through")}>{ano}</span>
                        </button>
                      )
                    })}
                  </div>

                  <label className="flex select-none items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={showMediaLine}
                      onChange={(e) => setShowMediaLine(e.target.checked)}
                    />
                    Linha de média ({mediaRef != null ? formatInt(mediaRef) : "—"})
                  </label>
                </div>
              </>
            )}
          </>
        )}

        {viewMode === "monthly" && (
          <>
            {dailyErr && <p className="text-sm text-destructive">{dailyErr}</p>}

            {statsMensal && !dailyLoading && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{tituloMensal}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Total no mês</p>
                    <p className="text-lg font-semibold tabular-nums">{formatInt(statsMensal.soma)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Média diária</p>
                    <p className="text-lg font-semibold tabular-nums">{formatInt(statsMensal.mediaDia)}</p>
                    <p className="text-[10px] text-muted-foreground">Soma ÷ {statsMensal.n} dias</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Máx. num dia</p>
                    <p className="text-lg font-semibold tabular-nums">{formatInt(statsMensal.maxVal)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Dia de pico</p>
                    <p className="text-lg font-semibold tabular-nums">Dia {statsMensal.diaPico}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="h-64 w-full min-w-0 sm:h-80 [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50">
              {dailyLoading ? (
                <div className="flex h-full min-h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                  A carregar {tituloMensal}…
                </div>
              ) : !chartDataMensal.length ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Sem dados de pedidos neste mês.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartDataMensal} margin={{ top: 24, right: 12, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                      minTickGap={4}
                      className="text-muted-foreground"
                      tickLine={false}
                      axisLine={{ className: "stroke-border" }}
                    />
                    <YAxis
                      domain={[0, maxYMensal]}
                      tickFormatter={(v) => formatInt(v)}
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                      tickLine={false}
                      axisLine={{ className: "stroke-border" }}
                      width={44}
                    />
                    <Tooltip
                      content={({ active, label, payload }) => {
                        if (!active || !payload?.[0]) return null
                        const n = Number(payload[0].value)
                        return (
                          <div className="rounded-lg border border-border bg-popover p-2 shadow-md text-sm">
                            <p className="font-semibold text-foreground">Dia {label}</p>
                            <p className="text-muted-foreground">
                              Pedidos: <span className="font-medium text-foreground">{formatInt(n)}</span>
                            </p>
                          </div>
                        )
                      }}
                    />
                    {showRefMensal && statsMensal && (
                      <ReferenceLine
                        y={statsMensal.mediaDia}
                        stroke={MEDIA_STROKE}
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        label={{
                          value: `Média/dia ${formatInt(statsMensal.mediaDia)}`,
                          position: "insideTopRight",
                          fontSize: 10,
                          fill: MEDIA_STROKE,
                        }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Pedidos"
                      stroke={LINEA_MES}
                      strokeWidth={2.5}
                      dot={{ r: 2, strokeWidth: 1.5 }}
                      activeDot={{ r: 4 }}
                    >
                      <LabelList
                        dataKey="total"
                        position="top"
                        offset={4}
                        className="fill-foreground"
                        fontSize={9}
                        formatter={(v: string | number) => formatInt(Number(v ?? 0))}
                      />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <label className="flex select-none items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={showMediaLine}
                onChange={(e) => setShowMediaLine(e.target.checked)}
                disabled={!statsMensal}
              />
              Linha de média diária ({statsMensal ? formatInt(statsMensal.mediaDia) : "—"})
            </label>
          </>
        )}
      </CardContent>
    </Card>
  )
}
