"use client"

import { useCallback, useMemo, useState } from "react"
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
import { FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DashboardOrdersYearlyPayload } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

function formatInt(n: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n))
}

type LocalTooltipProps = {
  active?: boolean
  label?: string
  payload?: Array<{ dataKey: string; value: number; color: string; name: string }>
}

function ChartTooltip({
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
      <p className="mb-2 font-semibold text-sm text-foreground">{label}</p>
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

function computeStatsVisiveis(
  chartData: Array<Record<string, string | number>>,
  anos: number[],
  anosVisiveis: Set<number>
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
  const anos = payload?.anos ?? []
  const [hiddenYears, setHiddenYears] = useState<Record<number, boolean>>({})
  const [showMediaLine, setShowMediaLine] = useState(true)

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

  const stats = useMemo(() => computeStatsVisiveis(chartData, anos, anosVisiveis), [chartData, anos, anosVisiveis])
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

  if (!payload || anos.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Pedidos por ano</CardTitle>
            <p className="text-sm text-muted-foreground">Comparativo mensal (Jan–Dez).</p>
          </div>
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">Sem dados para montar o gráfico.</p>
        </CardContent>
      </Card>
    )
  }

  const showRefLine = Boolean(showMediaLine && stats && stats.nCelulas > 0 && stats.mediaMensalCelula >= 0)

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Pedidos por ano</CardTitle>
        <p className="text-sm text-muted-foreground">
          Comparativo mensal (Jan–Dez). Cada cor é um ano; clique na legenda para ocultar ou exibir a linha.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
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
              <p className="text-[10px] text-muted-foreground truncate" title={stats.maxDetalhe}>
                {stats.maxDetalhe}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Ano com mais pedidos</p>
              <p className="text-lg font-semibold tabular-nums">
                {stats.anoMaiorTotal.ano}{" "}
                <span className="text-sm font-normal text-muted-foreground">({formatInt(stats.anoMaiorTotal.total)})</span>
              </p>
            </div>
          </div>
        )}

        <div className="h-64 sm:h-80 w-full min-w-0 [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50">
          {anosVisiveis.size === 0 ? (
            <div className="flex h-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
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
                    <ChartTooltip
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
                      : "border-border bg-background hover:bg-muted/50"
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
            <input type="checkbox" checked={showMediaLine} onChange={(e) => setShowMediaLine(e.target.checked)} />
            Linha de média ({mediaRef != null ? formatInt(mediaRef) : "—"})
          </label>
        </div>
      </CardContent>
    </Card>
  )
}
