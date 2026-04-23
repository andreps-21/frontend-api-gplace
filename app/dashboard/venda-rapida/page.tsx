"use client"

import { useCallback, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatMoneyCentsMask, formatPtBrMoney, numMoney } from "@/lib/money-cents-mask"
import { cn } from "@/lib/utils"
import { Image, ScanLine, ShoppingCart, Store } from "lucide-react"
import { toast } from "sonner"

type LinhaVendaRapida = {
  id: string
  codigo: string
  descricao: string
  qtd: number
  vlrUnit: number
  total: number
  un: string
}

const fmtMoney = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtQty = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })

let draftSeq = 1

function novoIdLinha() {
  return `vr-${Date.now()}-${draftSeq++}`
}

export default function VendaRapidaPage() {
  const [codigoVenda] = useState(() => String(10_000 + Math.floor(Math.random() * 89_000)))
  const [tipo, setTipo] = useState<"venda" | "devolucao">("venda")
  const [forma, setForma] = useState<"direta" | "consignada">("direta")

  const [barcode, setBarcode] = useState("")
  const [precoText, setPrecoText] = useState("0,00")
  const [qtdText, setQtdText] = useState("1")
  const [un, setUn] = useState("UN")

  const [linhas, setLinhas] = useState<LinhaVendaRapida[]>([])
  const [selecionada, setSelecionada] = useState<string | null>(null)

  const [clienteCod, setClienteCod] = useState("")
  const [clienteNome, setClienteNome] = useState("")
  const [vendedorCod, setVendedorCod] = useState("")
  const [vendedorNome, setVendedorNome] = useState("")

  const [descontoText, setDescontoText] = useState(() => formatPtBrMoney(0))
  const [acrescimoText, setAcrescimoText] = useState(() => formatPtBrMoney(0))
  const desconto = useMemo(() => numMoney(descontoText), [descontoText])
  const acrescimo = useMemo(() => numMoney(acrescimoText), [acrescimoText])
  /** Preenchido futuramente com URL do catálogo (lookup por código de barras). */
  const [imagemProdutoUrl] = useState<string | null>(null)

  const precoNum = useMemo(() => {
    const t = precoText.replace(/\./g, "").replace(",", ".")
    const n = parseFloat(t)
    return Number.isFinite(n) ? n : 0
  }, [precoText])

  const qtdNum = useMemo(() => {
    const t = qtdText.replace(/\./g, "").replace(",", ".")
    const n = parseFloat(t)
    return Number.isFinite(n) ? n : 0
  }, [qtdText])

  const bruto = useMemo(() => linhas.reduce((s, l) => s + l.total, 0), [linhas])
  const totalVenda = useMemo(() => {
    const s = bruto - desconto + acrescimo
    return Math.max(0, s)
  }, [bruto, desconto, acrescimo])

  const inserirLinha = useCallback(() => {
    if (!barcode.trim()) {
      toast.message("Informe o código de barras ou ref.", { description: "F12 — pesquisa código interno (em breve)." })
      return
    }
    if (qtdNum <= 0) {
      toast.error("Quantidade inválida.")
      return
    }
    if (precoNum < 0) {
      toast.error("Preço inválido.")
      return
    }
    const total = Math.round(precoNum * qtdNum * 100) / 100
    const linha: LinhaVendaRapida = {
      id: novoIdLinha(),
      codigo: barcode.trim(),
      descricao: `Produto ${barcode.trim().slice(0, 18)}${barcode.length > 18 ? "…" : ""}`,
      qtd: qtdNum,
      vlrUnit: precoNum,
      total,
      un: un.trim() || "UN",
    }
    setLinhas((prev) => [linha, ...prev])
    setSelecionada(linha.id)
    setBarcode("")
    setPrecoText("0,00")
    setQtdText("1")
  }, [barcode, precoNum, qtdNum, un])

  const excluirSelecionada = useCallback(() => {
    if (!selecionada) {
      toast.message("Selecione uma linha na grade.")
      return
    }
    setLinhas((prev) => prev.filter((l) => l.id !== selecionada))
    setSelecionada(null)
  }, [selecionada])

  const reiniciar = useCallback(() => {
    setLinhas([])
    setSelecionada(null)
    setClienteCod("")
    setClienteNome("")
    setDescontoText(formatPtBrMoney(0))
    setAcrescimoText(formatPtBrMoney(0))
    setBarcode("")
    setPrecoText("0,00")
    setQtdText("1")
    setTipo("venda")
    setForma("direta")
    toast.success("Rascunho limpo.")
  }, [])

  const finalizar = useCallback(() => {
    if (linhas.length === 0) {
      toast.error("Inclua ao menos um produto.")
      return
    }
    toast.info("Integração com a API em fase seguinte", {
      description: `Total: R$ ${fmtMoney(totalVenda)} — ${linhas.length} itens`,
    })
  }, [linhas.length, totalVenda])

  const hint = "text-[10px] text-muted-foreground"

  return (
    <div className="flex w-full min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden text-sm text-foreground">
      <div className="mx-auto flex w-full min-h-0 max-w-none flex-1 flex-col gap-2.5">
        <div className="shrink-0 space-y-1.5">
          <div className="flex min-w-0 gap-2.5 sm:gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 sm:h-11 sm:w-11"
              aria-hidden
            >
              <ShoppingCart className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0 py-0.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Venda Rápida</h1>
            </div>
          </div>

          <Card className="p-2.5 sm:p-3.5">
          <div className="space-y-3 sm:space-y-3.5">
            <div className="flex w-full min-h-0 min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-3.5">
              <div className="flex w-full min-w-0 min-h-0 flex-1 flex-col gap-3 sm:min-w-0 sm:min-h-0 sm:flex-row sm:items-stretch sm:gap-0 sm:pl-0 sm:pr-0">
                <div className="mx-auto w-full max-w-[17rem] self-stretch sm:mx-0 sm:flex sm:min-h-0 sm:min-w-0 sm:max-w-[17rem] sm:shrink-0 sm:basis-[17rem] sm:w-[17rem] sm:flex-col sm:pr-0">
                  <div className="mb-1.5 flex h-6 w-full min-w-0 items-center">
                    <Label className="text-xs font-normal leading-none text-muted-foreground">Imagem do produto</Label>
                  </div>
                  <div
                    className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col [container-type:size] sm:min-h-0 sm:w-full sm:items-stretch sm:justify-start"
                  >
                    <div
                      className="relative z-10 flex aspect-square min-h-36 w-full min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-muted/40
                        sm:max-w-full sm:shrink-0 sm:aspect-auto sm:self-start
                        sm:h-[min(100cqw,100cqh)] sm:min-h-12 sm:min-w-12
                        sm:w-[min(100cqw,100cqh)]"
                      role="img"
                      aria-label={
                        imagemProdutoUrl
                          ? "Pré-visualização do produto"
                          : "Imagem do produto — a carregar ao consultar o código"
                      }
                    >
                      {imagemProdutoUrl ? (
                        <img
                          src={imagemProdutoUrl}
                          alt=""
                          className="h-full w-full min-h-0 min-w-0 object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-full w-full min-h-0 min-w-0 flex-col items-center justify-center gap-2 p-3 text-center">
                          <Image
                            className="h-10 w-10 text-muted-foreground/45 sm:h-12 sm:w-12"
                            strokeWidth={1.15}
                            aria-hidden
                          />
                          <span className="text-[10px] leading-tight text-muted-foreground sm:text-xs">
                            Aguarda código
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative z-[1] flex min-w-0 w-full flex-1 flex-col gap-2 sm:min-w-0 sm:-ml-16 sm:pl-0">
                  <div className="min-w-0 w-full">
                    <div className="mb-1.5 flex h-6 w-full min-w-0 items-center justify-between gap-2">
                      <Label className="text-xs leading-none text-muted-foreground">Código da venda</Label>
                      <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
                        Rascunho
                      </Badge>
                    </div>
                    <div
                      className="flex h-12 w-full items-center rounded-md border border-input bg-muted/30 px-3 font-mono text-lg font-bold leading-none tabular-nums text-foreground sm:text-xl"
                      aria-live="polite"
                    >
                      {codigoVenda}
                    </div>
                  </div>

                  <div className="flex min-w-0 w-full min-h-0 flex-col gap-2">
                    <div className="flex min-w-0 w-full min-h-0 flex-col gap-0.5">
                      <fieldset className="m-0 w-full min-w-0 min-h-0 border-0 p-0">
                        <legend className="sr-only">Tipo de operação</legend>
                        <div className="flex w-full min-w-0 min-h-0 flex-col gap-0.5">
                          <span className="text-xs font-normal leading-tight text-muted-foreground">
                            Tipo de operação
                          </span>
                          <div
                            className="flex h-12 w-full items-stretch overflow-hidden rounded-md border border-input bg-muted/30"
                            role="radiogroup"
                            aria-label="Tipo de operação (venda ou devolução)"
                          >
                            <div className="grid h-full min-h-0 w-full grid-cols-2">
                              <label
                                htmlFor="vr-tipo-venda"
                                className={cn(
                                  "flex h-full min-h-12 cursor-pointer items-center justify-center gap-2 border-r border-border/50 px-2 text-sm font-medium transition-colors",
                                  tipo === "venda"
                                    ? "bg-primary/10 text-foreground"
                                    : "text-muted-foreground hover:bg-muted/40",
                                )}
                              >
                                <input
                                  id="vr-tipo-venda"
                                  type="radio"
                                  name="venda-rapida-tipo"
                                  className="h-4 w-4 shrink-0 accent-primary"
                                  checked={tipo === "venda"}
                                  onChange={() => setTipo("venda")}
                                />
                                <span>Venda</span>
                              </label>
                              <label
                                htmlFor="vr-tipo-devolucao"
                                className={cn(
                                  "flex h-full min-h-12 cursor-pointer items-center justify-center gap-2 px-2 text-sm font-medium transition-colors",
                                  tipo === "devolucao"
                                    ? "bg-primary/10 text-foreground"
                                    : "text-muted-foreground hover:bg-muted/40",
                                )}
                              >
                                <input
                                  id="vr-tipo-devolucao"
                                  type="radio"
                                  name="venda-rapida-tipo"
                                  className="h-4 w-4 shrink-0 accent-primary"
                                  checked={tipo === "devolucao"}
                                  onChange={() => setTipo("devolucao")}
                                />
                                <span>Devolução</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </fieldset>
                    </div>
                    <div className="flex min-w-0 w-full min-h-0 flex-col gap-0.5">
                      <fieldset className="m-0 w-full min-w-0 min-h-0 border-0 p-0">
                        <legend className="sr-only">Forma de venda</legend>
                        <div className="flex w-full min-w-0 min-h-0 flex-col gap-0.5">
                          <span className="text-xs font-normal leading-tight text-muted-foreground">Forma de venda</span>
                          <div
                            className="flex h-12 w-full items-stretch overflow-hidden rounded-md border border-input bg-muted/30"
                            role="radiogroup"
                            aria-label="Forma de venda (direta ou consignada)"
                          >
                            <div className="grid h-full min-h-0 w-full grid-cols-2">
                              <label
                                htmlFor="vr-forma-direta"
                                className={cn(
                                  "flex h-full min-h-12 cursor-pointer items-center justify-center gap-2 border-r border-border/50 px-2 text-sm font-medium transition-colors",
                                  forma === "direta"
                                    ? "bg-primary/10 text-foreground"
                                    : "text-muted-foreground hover:bg-muted/40",
                                )}
                              >
                                <input
                                  id="vr-forma-direta"
                                  type="radio"
                                  name="venda-rapida-forma"
                                  className="h-4 w-4 shrink-0 accent-primary"
                                  checked={forma === "direta"}
                                  onChange={() => setForma("direta")}
                                />
                                <span>Direta</span>
                              </label>
                              <label
                                htmlFor="vr-forma-consignada"
                                className={cn(
                                  "flex h-full min-h-12 cursor-pointer items-center justify-center gap-2 px-2 text-sm font-medium transition-colors",
                                  forma === "consignada"
                                    ? "bg-primary/10 text-foreground"
                                    : "text-muted-foreground hover:bg-muted/40",
                                )}
                              >
                                <input
                                  id="vr-forma-consignada"
                                  type="radio"
                                  name="venda-rapida-forma"
                                  className="h-4 w-4 shrink-0 accent-primary"
                                  checked={forma === "consignada"}
                                  onChange={() => setForma("consignada")}
                                />
                                <span>Consignada</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </fieldset>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex w-full min-w-0 min-h-0 flex-1 flex-col gap-2 sm:min-w-0">
                <div className="min-w-0 w-full">
                  <div className="mb-1.5 flex min-h-6 w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                    <Label
                      className="text-xs font-normal leading-none text-muted-foreground"
                      htmlFor="vr-barcode"
                    >
                      Código de barras/Produto
                    </Label>
                    <span className={cn(hint, "leading-tight")}>
                      F12 — pesquisa código interno (a definir)
                    </span>
                  </div>
                  <div className="relative w-full">
                    <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:left-3.5 sm:h-5 sm:w-5" />
                    <Input
                      id="vr-barcode"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && inserirLinha()}
                      placeholder="Leitura ou digitação"
                      className="h-12 w-full pl-10 pr-3 font-mono text-base leading-none sm:pl-11"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div className="flex min-w-0 w-full min-h-0 flex-col gap-2">
                  <div className="flex min-w-0 w-full min-h-0 flex-col gap-0.5">
                    <Label
                      className="text-xs font-normal leading-tight text-muted-foreground"
                      htmlFor="vr-preco"
                    >
                      Preço R$
                    </Label>
                    <Input
                      id="vr-preco"
                      value={precoText}
                      onChange={(e) => setPrecoText(e.target.value)}
                      className="h-12 w-full tabular-nums"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="grid min-w-0 w-full grid-cols-2 gap-2 sm:gap-x-3">
                    <div className="flex min-w-0 min-h-0 flex-col gap-0.5">
                      <Label
                        className="text-xs font-normal leading-tight text-muted-foreground"
                        htmlFor="vr-qtd"
                      >
                        Quantidade
                      </Label>
                      <Input
                        id="vr-qtd"
                        value={qtdText}
                        onChange={(e) => setQtdText(e.target.value)}
                        className="h-12 w-full"
                        inputMode="decimal"
                        onKeyDown={(e) => e.key === "Enter" && inserirLinha()}
                      />
                    </div>
                    <div className="flex min-w-0 min-h-0 flex-col gap-0.5">
                      <Label
                        className="text-xs font-normal leading-tight text-muted-foreground"
                        htmlFor="vr-un"
                      >
                        Un.
                      </Label>
                      <Input
                        id="vr-un"
                        value={un}
                        onChange={(e) => setUn(e.target.value.toUpperCase())}
                        className="h-12 w-full font-mono"
                        maxLength={4}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5">
          <div className="grid min-h-0 min-w-0 grid-cols-1 items-stretch gap-3 lg:grid-cols-2">
            <Card className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden p-0">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 gap-y-2 space-y-0 border-b border-border py-2.5 pl-3 pr-2.5 sm:pl-4 sm:pr-4">
                <CardTitle className="text-base">Itens</CardTitle>
                <div className="flex w-full min-w-0 items-center justify-end gap-2 sm:ml-auto sm:w-auto sm:gap-3">
                  <p className="whitespace-nowrap text-xs text-muted-foreground sm:text-sm">
                    Total de itens:{" "}
                    <span className="font-medium tabular-nums text-foreground">{linhas.length}</span>
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 shrink-0 text-xs"
                    onClick={inserirLinha}
                  >
                    Incluir (Enter)
                  </Button>
                </div>
              </CardHeader>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="hidden w-full overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-[100px] text-right">Qtd</TableHead>
                        <TableHead className="w-[104px] text-right">Vlr. unit.</TableHead>
                        <TableHead className="w-[104px] text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linhas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-muted-foreground sm:py-10">
                            Nenhum item. Informe o código, preço e quantidade; Enter ou &quot;Incluir&quot;.
                          </TableCell>
                        </TableRow>
                      ) : (
                        linhas.map((l) => (
                          <TableRow
                            key={l.id}
                            onClick={() => setSelecionada(l.id)}
                            className={cn(
                              "cursor-pointer",
                              selecionada === l.id ? "bg-muted/60" : "hover:bg-muted/30"
                            )}
                          >
                            <TableCell className="max-w-[160px] truncate py-2 font-mono text-xs text-muted-foreground">
                              {l.codigo}
                            </TableCell>
                            <TableCell className="py-2 text-sm font-semibold text-foreground">
                              {l.descricao}
                            </TableCell>
                            <TableCell className="py-2 text-right text-sm tabular-nums text-muted-foreground">
                              {fmtQty(l.qtd)} {l.un}
                            </TableCell>
                            <TableCell className="py-2 text-right text-sm font-medium tabular-nums text-foreground">
                              {fmtMoney(l.vlrUnit)}
                            </TableCell>
                            <TableCell className="py-2 text-right text-sm font-semibold tabular-nums text-foreground">
                              {fmtMoney(l.total)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="p-2 md:hidden">
                  {linhas.length === 0 ? (
                    <p className="px-2 py-8 text-center text-sm text-muted-foreground">Sem itens no carrinho.</p>
                  ) : (
                    <ul className="space-y-2">
                      {linhas.map((l) => (
                        <li key={l.id}>
                          <button
                            type="button"
                            onClick={() => setSelecionada(l.id)}
                            className={cn(
                              "w-full rounded-lg border p-3 text-left transition-colors",
                              selecionada === l.id ? "border-primary/40 bg-muted/50" : "border-border bg-card hover:bg-muted/20"
                            )}
                          >
                            <p className="text-sm font-semibold text-foreground">{l.descricao}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Ref. {l.codigo}</p>
                            <p className="mt-2 text-sm font-medium tabular-nums text-foreground">
                              {fmtQty(l.qtd)} {l.un} × R$ {fmtMoney(l.vlrUnit)} = R$ {fmtMoney(l.total)}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Card>

            <div className="flex h-full min-h-0 min-w-0 flex-col gap-2.5">
              <Card className="w-full min-w-0">
                <CardContent className="p-2.5 sm:p-3.5">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Total itens (R$)</p>
                  <p className="pt-0.5 font-mono font-semibold tabular-nums text-foreground">
                    {bruto < 0 ? "−" : ""}R$ {fmtMoney(Math.abs(bruto))}
                  </p>
                </CardContent>
              </Card>
              <Card className="w-full min-w-0 border-primary/30 shadow-sm ring-1 ring-primary/20">
                <CardContent className="p-2.5 sm:p-3.5">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Total da venda (R$)</p>
                  <p className="pt-0.5 font-mono text-2xl font-semibold tabular-nums text-foreground">
                    {totalVenda < 0 ? "−" : ""}R$ {fmtMoney(Math.abs(totalVenda))}
                  </p>
                </CardContent>
              </Card>
              <div className="grid w-full min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                <Card className="w-full min-w-0">
                  <CardContent className="p-2.5 sm:p-3.5">
                    <div className="flex min-w-0 w-full min-h-0 flex-col gap-0.5">
                      <Label
                        className="text-xs font-normal leading-tight text-muted-foreground"
                        htmlFor="vr-desconto"
                      >
                        Desconto (R$)
                      </Label>
                      <Input
                        id="vr-desconto"
                        inputMode="numeric"
                        className="h-12 w-full tabular-nums"
                        placeholder="0,00"
                        value={descontoText}
                        onChange={(e) => setDescontoText(formatMoneyCentsMask(e.target.value))}
                        onBlur={() => setDescontoText((t) => formatMoneyCentsMask(t))}
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card className="w-full min-w-0">
                  <CardContent className="p-2.5 sm:p-3.5">
                    <div className="flex min-w-0 w-full min-h-0 flex-col gap-0.5">
                      <Label
                        className="text-xs font-normal leading-tight text-muted-foreground"
                        htmlFor="vr-acrescimo"
                      >
                        Acréscimo (R$)
                      </Label>
                      <Input
                        id="vr-acrescimo"
                        inputMode="numeric"
                        className="h-12 w-full tabular-nums"
                        placeholder="0,00"
                        value={acrescimoText}
                        onChange={(e) => setAcrescimoText(formatMoneyCentsMask(e.target.value))}
                        onBlur={() => setAcrescimoText((t) => formatMoneyCentsMask(t))}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        <Card className="shrink-0 py-0">
          <CardContent className="px-2 py-1.5 sm:px-2.5 sm:py-2">
            <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-1.5">
              <div>
                <div className="flex min-w-0 flex-row items-end gap-1.5 sm:gap-2">
                  <div className="flex w-20 shrink-0 flex-col gap-0.5 sm:w-24 sm:max-w-[6.75rem]">
                    <Label className="text-[10px] leading-none text-muted-foreground">Código</Label>
                    <Input
                      value={clienteCod}
                      onChange={(e) => setClienteCod(e.target.value)}
                      className="h-7 w-full min-w-0 px-2 font-mono text-xs"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Label className="text-[10px] leading-none text-muted-foreground">Cliente (F3)</Label>
                    <Input
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                      className="h-7 w-full min-w-0 px-2 text-xs"
                    />
                  </div>
                </div>
              </div>
              <div>
                <div className="flex min-w-0 flex-row items-end gap-1.5 sm:gap-2">
                  <div className="flex w-20 shrink-0 flex-col gap-0.5 sm:w-24 sm:max-w-[6.75rem]">
                    <Label className="text-[10px] leading-none text-muted-foreground">Código</Label>
                    <Input
                      value={vendedorCod}
                      onChange={(e) => setVendedorCod(e.target.value)}
                      className="h-7 w-full min-w-0 px-2 font-mono text-xs"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Label className="text-[10px] leading-none text-muted-foreground">vendedor (F2)</Label>
                    <Input
                      value={vendedorNome}
                      onChange={(e) => setVendedorNome(e.target.value)}
                      className="h-7 w-full min-w-0 px-2 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex shrink-0 flex-col gap-2.5 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={reiniciar} title="F5">
              Iniciar (F5)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTipo("devolucao")}
              title="F4"
            >
              Devolução (F4)
            </Button>
            <Button type="button" variant="outline" size="sm" className="opacity-50" disabled>
              Importa consig.
            </Button>
            <Button type="button" variant="outline" size="sm" className="opacity-50" disabled>
              Pesquisar (F7)
            </Button>
            <Button type="button" variant="outline" size="sm" className="opacity-50" disabled>
              Alterar (F9)
            </Button>
            <Button type="button" variant="outline" size="sm" className="opacity-50" disabled>
              Imprimir
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={excluirSelecionada} title="F11">
              Excluir (F11)
            </Button>
            <Button type="button" size="default" onClick={finalizar} className="gap-2 font-semibold" title="F10">
              Finalizar (F10)
            </Button>
            <div className="ml-0 flex items-center gap-2 pl-0 sm:ml-2 sm:border-l sm:border-border sm:pl-2">
              <Store className="h-4 w-4 text-muted-foreground" aria-hidden />
              <Button type="button" variant="secondary" size="sm" disabled>
                Opções
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
