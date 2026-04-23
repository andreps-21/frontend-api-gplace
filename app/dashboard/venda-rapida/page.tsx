"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { laravelInnerData, laravelValidationErrorText } from "@/lib/laravel-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatMoneyCentsMask, formatPtBrMoney, numMoney } from "@/lib/money-cents-mask"
import { apiService, ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Image, Loader2, Printer, ScanLine, ShoppingCart, Store, Users, UserCircle2 } from "lucide-react"
import { toast } from "sonner"

type LinhaVendaRapida = {
  id: string
  productId: number
  /** SKU para exibição na grade (ou «—» se vazio). */
  sku: string
  descricao: string
  qtd: number
  vlrUnit: number
  total: number
  un: string
}

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }

type VrProductSuggestRow = {
  id: number
  commercial_name: string
  reference: string
  sku: string
}

const fmtMoney = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtQty = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })

let draftSeq = 1

function novoIdLinha() {
  return `vr-${Date.now()}-${draftSeq++}`
}

/** Resposta paginada Laravel: `{ message, data: { data: T[] } }` via `apiService`. */
function paginatedRows<T>(apiEnvelope: unknown): T[] {
  if (!apiEnvelope || typeof apiEnvelope !== "object") return []
  const top = apiEnvelope as { data?: { data?: T[] } }
  if (Array.isArray(top.data?.data)) return top.data!.data!
  return []
}

function onlyDigits(s: string) {
  return s.replace(/\D/g, "")
}

/** CPF: 000.000.000-00 · CNPJ: 00.000.000/0000-00 */
function formatCpfCnpjMask(digits: string) {
  const x = onlyDigits(digits).slice(0, 14)
  if (x.length === 0) return ""
  if (x.length <= 11) {
    if (x.length <= 3) return x
    if (x.length <= 6) return `${x.slice(0, 3)}.${x.slice(3)}`
    if (x.length <= 9) return `${x.slice(0, 3)}.${x.slice(3, 6)}.${x.slice(6)}`
    return `${x.slice(0, 3)}.${x.slice(3, 6)}.${x.slice(6, 9)}-${x.slice(9, 11)}`
  }
  if (x.length <= 2) return x
  if (x.length <= 5) return `${x.slice(0, 2)}.${x.slice(2)}`
  if (x.length <= 8) return `${x.slice(0, 2)}.${x.slice(2, 5)}.${x.slice(5)}`
  if (x.length <= 12) return `${x.slice(0, 2)}.${x.slice(2, 5)}.${x.slice(5, 8)}/${x.slice(8, 12)}`
  return `${x.slice(0, 2)}.${x.slice(2, 5)}.${x.slice(5, 8)}/${x.slice(8, 12)}-${x.slice(12, 14)}`
}

function isValidCpf(digits: string) {
  const d = onlyDigits(digits).slice(0, 11)
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false
  const nums = d.split("").map((c) => Number(c))
  const calcDv1 = () => {
    let sum = 0
    for (let i = 0; i < 9; i++) sum += nums[i] * (10 - i)
    const mod = sum % 11
    return mod < 2 ? 0 : 11 - mod
  }
  const calcDv2 = () => {
    let sum = 0
    for (let i = 0; i < 10; i++) sum += nums[i] * (11 - i)
    const mod = sum % 11
    return mod < 2 ? 0 : 11 - mod
  }
  return nums[9] === calcDv1() && nums[10] === calcDv2()
}

/** Fixo: (00) 0000-0000 · móvel (9 após DDD): (00) 00000-0000 */
function formatPhoneBrMask(digits: string) {
  const d = onlyDigits(digits).slice(0, 11)
  if (d.length === 0) return ""
  if (d.length <= 2) return `(${d}`
  const ddd = d.slice(0, 2)
  const rest = d.slice(2)
  if (rest.length === 0) return `(${ddd}) `
  const isMobile = rest[0] === "9"
  if (isMobile) {
    if (rest.length <= 5) return `(${ddd}) ${rest}`
    return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`
  }
  if (rest.length <= 4) return `(${ddd}) ${rest}`
  return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4, 8)}`
}

type ApiCustomerRow = {
  id: number
  name?: string
  nif?: string
  person?: { name?: string; nif?: string }
}

function mapCustomerRowFromApi(c: ApiCustomerRow): { id: number; name: string; nif?: string } {
  const name = (c.person?.name ?? c.name ?? "").trim() || "—"
  const nif = c.person?.nif ?? c.nif
  return { id: c.id, name, nif }
}

type SnapshotVendaImpressao = {
  codigoVenda: string
  clienteNome: string
  clienteNif?: string
  linhas: LinhaVendaRapida[]
  desconto: number
  acrescimo: number
  total: number
  formaPagamento: string
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function fmtNifExibir(nif?: string) {
  if (!nif?.trim()) return ""
  const d = onlyDigits(nif)
  if (d.length === 11 || d.length === 14) return formatCpfCnpjMask(d)
  return nif.trim()
}

function imprimirResumoVendaHtml(s: SnapshotVendaImpressao) {
  const fM = (n: number) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fQ = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })
  const nifE = s.clienteNif ? fmtNifExibir(s.clienteNif) : ""
  const rows = s.linhas
    .map(
      (l) =>
        `<tr><td>${escHtml(l.descricao)}</td><td style="text-align:right;white-space:nowrap">${fQ(l.qtd)} ${escHtml(l.un)}</td><td style="text-align:right;white-space:nowrap">R$ ${fM(l.total)}</td></tr>`,
    )
    .join("")
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Comprovante de venda</title>
<style>
@page { margin: 12mm; }
 body{font-family:ui-sans-serif,system-ui,sans-serif;padding:12px;font-size:14px;max-width:42rem;margin:0 auto;}
 h1{font-size:18px;margin:0 0 8px;}
 table{border-collapse:collapse;width:100%;margin:10px 0;font-size:13px;}
 th,td{border-bottom:1px solid #e5e5e5;padding:6px 4px;vertical-align:top;}
 th{font-size:11px;font-weight:600;color:#555;text-transform:uppercase;}
 .tot{margin-top:10px;text-align:right;}
 .row{display:flex;justify-content:space-between;gap:8px;margin:4px 0;font-size:13px;}
 .muted{color:#666;font-size:12px;}
</style></head><body>
<h1>Resumo da venda</h1>
<p class="muted">Código da venda: ${escHtml(s.codigoVenda)}</p>
<p><strong>Cliente</strong> ${escHtml(s.clienteNome)}${nifE ? ` · ${escHtml(nifE)}` : ""}</p>
<table><thead><tr><th>Produto</th><th>Qtd</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
<div class="row"><span>Desconto</span><span>R$ ${fM(s.desconto)}</span></div>
<div class="row"><span>Acréscimo</span><span>R$ ${fM(s.acrescimo)}</span></div>
<div class="tot"><strong>Total: R$ ${fM(s.total)}</strong></div>
<p class="muted" style="margin-top:8px">Forma de pagamento: ${escHtml(s.formaPagamento)}</p>
</body></html>`
  const w = window.open("", "_blank", "noopener,noreferrer")
  if (!w) {
    return false
  }
  w.document.write(html)
  w.document.close()
  w.focus()
  const run = () => {
    try {
      w.print()
    } catch {
      /* empty */
    }
  }
  if (w.document.readyState === "complete") {
    setTimeout(run, 100)
  } else {
    w.onload = () => setTimeout(run, 100)
  }
  setTimeout(() => {
    try {
      w.close()
    } catch {
      /* empty */
    }
  }, 500)
  return true
}

export default function VendaRapidaPage() {
  const [codigoVenda, setCodigoVenda] = useState("—")
  const [tipo, setTipo] = useState<"venda" | "devolucao">("venda")
  const [forma, setForma] = useState<"direta" | "consignada">("direta")

  const [queryProduto, setQueryProduto] = useState("")
  const [showProductSuggestions, setShowProductSuggestions] = useState(false)
  const [productSuggestions, setProductSuggestions] = useState<VrProductSuggestRow[]>([])
  const [productSuggestLoading, setProductSuggestLoading] = useState(false)
  /** Índice realçado na lista (setas; Enter aplica este item se a lista estiver aberta). */
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0)
  const [productMenuRect, setProductMenuRect] = useState({ top: 0, left: 0, width: 0 })
  const productNameFieldWrapRef = useRef<HTMLDivElement>(null)
  const productSuggestDebounceRef = useRef<number | null>(null)
  const productSuggestReqId = useRef(0)
  const [precoText, setPrecoText] = useState("0,00")
  const [qtdText, setQtdText] = useState("1")
  const [un, setUn] = useState("UN")

  const [linhas, setLinhas] = useState<LinhaVendaRapida[]>([])
  const [selecionada, setSelecionada] = useState<string | null>(null)

  const [clienteId, setClienteId] = useState<number | null>(null)
  const [vendedorId, setVendedorId] = useState<number | null>(null)

  const [descontoText, setDescontoText] = useState(() => formatPtBrMoney(0))
  const [acrescimoText, setAcrescimoText] = useState(() => formatPtBrMoney(0))
  const desconto = useMemo(() => numMoney(descontoText), [descontoText])
  const acrescimo = useMemo(() => numMoney(acrescimoText), [acrescimoText])
  const [imagemProdutoUrl, setImagemProdutoUrl] = useState<string | null>(null)

  const [resolvendo, setResolvendo] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [paymentMethodId, setPaymentMethodId] = useState<string>("")
  const [paymentOptions, setPaymentOptions] = useState<Array<{ id: number; description: string }>>([])

  const [dialogClienteOpen, setDialogClienteOpen] = useState(false)
  const [dialogVendedorOpen, setDialogVendedorOpen] = useState(false)
  const [buscaCliente, setBuscaCliente] = useState("")
  const [buscaVendedor, setBuscaVendedor] = useState("")
  const [listaClientes, setListaClientes] = useState<Array<{ id: number; name: string; nif?: string }>>([])
  const [listaVendedores, setListaVendedores] = useState<Array<{ id: number; name: string; nif?: string }>>([])

  /** Modal de cliente ao finalizar a venda (CPF, busca ou cadastro rápido). */
  const [dialogClienteVendaOpen, setDialogClienteVendaOpen] = useState(false)
  const [buscaClienteVenda, setBuscaClienteVenda] = useState("")
  const [listaClienteVenda, setListaClienteVenda] = useState<Array<{ id: number; name: string; nif?: string }>>([])
  const [loadingClienteVenda, setLoadingClienteVenda] = useState(false)
  const [novoClienteNome, setNovoClienteNome] = useState("")
  const [novoClienteCpf, setNovoClienteCpf] = useState("")
  const [novoClienteTelefone, setNovoClienteTelefone] = useState("")
  const [criandoCliente, setCriandoCliente] = useState(false)
  /** Formulário de cadastro dentro do painel (como o produto). */
  const [clienteVendaNovoInline, setClienteVendaNovoInline] = useState(false)

  /** Resumo + pergunta de impressão após escolher o cliente. */
  const [dialogResumoVendaOpen, setDialogResumoVendaOpen] = useState(false)
  const [resumoClienteVenda, setResumoClienteVenda] = useState<{
    id: number
    name: string
    nif?: string
  } | null>(null)
  const skipReabrirClienteAposResumo = useRef(false)

  const formaPagamentoLabel = useMemo(() => {
    const id = Number(paymentMethodId)
    if (!Number.isFinite(id)) return "—"
    return paymentOptions.find((p) => p.id === id)?.description ?? "—"
  }, [paymentMethodId, paymentOptions])

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

  const carregarProximoCodigo = useCallback(async () => {
    try {
      const r = (await apiService.getAdminQuickSaleNextCode()) as { data?: { code?: string } }
      if (r.data?.code) setCodigoVenda(r.data.code)
    } catch {
      setCodigoVenda(String(10_000 + Math.floor(Math.random() * 89_000)))
    }
  }, [])

  useEffect(() => {
    void carregarProximoCodigo()
  }, [carregarProximoCodigo])

  useEffect(() => {
    void (async () => {
      try {
        const r = (await apiService.getPaymentMethods()) as unknown as {
          data?: Array<{ id: number; description?: string; name?: string }>
        }
        const list = (Array.isArray(r.data) ? r.data : []).map((pm) => ({
          id: pm.id,
          description: pm.description ?? pm.name ?? `Pagamento #${pm.id}`,
        }))
        setPaymentOptions(list)
        if (list.length > 0) setPaymentMethodId(String(list[0].id))
      } catch {
        /* silencioso */
      }
    })()
  }, [])

  useEffect(() => {
    if (!dialogClienteOpen) return
    const t = setTimeout(() => {
      void (async () => {
        try {
          const r = await apiService.getAdminCustomers({ search: buscaCliente, per_page: 30, page: 1 })
          const raw = paginatedRows<ApiCustomerRow>(r as object)
          setListaClientes(raw.map(mapCustomerRowFromApi))
        } catch {
          setListaClientes([])
        }
      })()
    }, 300)
    return () => clearTimeout(t)
  }, [buscaCliente, dialogClienteOpen])

  useEffect(() => {
    if (!dialogVendedorOpen) return
    const t = setTimeout(() => {
      void (async () => {
        try {
          const r = await apiService.getAdminSalesmen({ search: buscaVendedor, per_page: 30, page: 1 })
          const raw = paginatedRows<ApiCustomerRow>(r as object)
          setListaVendedores(raw.map(mapCustomerRowFromApi))
        } catch {
          setListaVendedores([])
        }
      })()
    }, 300)
    return () => clearTimeout(t)
  }, [buscaVendedor, dialogVendedorOpen])

  const searchClienteVendaParam = useMemo(() => {
    const t = buscaClienteVenda.trim()
    if (t.length < 2) return ""
    if (/[a-zA-Z\u00C0-\u017F]/.test(t)) return t
    const d = onlyDigits(t).slice(0, 11)
    if (d.length === 11 && !isValidCpf(d)) return ""
    return d.length >= 2 ? d : ""
  }, [buscaClienteVenda])

  useEffect(() => {
    if (!dialogClienteVendaOpen) return
    const t = setTimeout(() => {
      void (async () => {
        const q = searchClienteVendaParam
        if (q.length < 2) {
          setListaClienteVenda([])
          return
        }
        setLoadingClienteVenda(true)
        try {
          const r = await apiService.getAdminCustomers({ search: q, per_page: 30, page: 1 })
          const raw = paginatedRows<ApiCustomerRow>(r as object)
          setListaClienteVenda(raw.map(mapCustomerRowFromApi))
        } catch {
          setListaClienteVenda([])
        } finally {
          setLoadingClienteVenda(false)
        }
      })()
    }, 300)
    return () => clearTimeout(t)
  }, [searchClienteVendaParam, dialogClienteVendaOpen])

  useEffect(() => {
    if (!dialogClienteVendaOpen) return
    setClienteVendaNovoInline(false)
  }, [searchClienteVendaParam, dialogClienteVendaOpen])

  const updateProductMenuPosition = useCallback(() => {
    const el = productNameFieldWrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setProductMenuRect({
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 220),
    })
  }, [])

  useLayoutEffect(() => {
    if (!showProductSuggestions) return
    updateProductMenuPosition()
  }, [
    showProductSuggestions,
    queryProduto,
    productSuggestions.length,
    productSuggestLoading,
    updateProductMenuPosition,
  ])

  useEffect(() => {
    if (!showProductSuggestions) return
    const onScrollOrResize = () => updateProductMenuPosition()
    window.addEventListener("scroll", onScrollOrResize, true)
    window.addEventListener("resize", onScrollOrResize)
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true)
      window.removeEventListener("resize", onScrollOrResize)
    }
  }, [showProductSuggestions, updateProductMenuPosition])

  useEffect(() => {
    const q = queryProduto.trim()
    if (q.length < 2) {
      setProductSuggestions([])
      setProductSuggestLoading(false)
      return
    }
    if (productSuggestDebounceRef.current) window.clearTimeout(productSuggestDebounceRef.current)
    productSuggestDebounceRef.current = window.setTimeout(() => {
      productSuggestDebounceRef.current = null
      const reqId = ++productSuggestReqId.current
      setProductSuggestLoading(true)
      void (async () => {
        try {
          const raw = await apiService.getAdminProducts({
            search: q,
            per_page: 15,
            page: 1,
          })
          if (productSuggestReqId.current !== reqId) return
          const inner = laravelInnerData<Paginator<Record<string, unknown>>>(raw)
          const rows = (inner?.data ?? [])
            .map((r) => ({
              id: Number(r.id),
              commercial_name: String(r.commercial_name ?? ""),
              reference: String(r.reference ?? ""),
              sku: String(r.sku ?? ""),
            }))
            .filter((r) => Number.isFinite(r.id))
          setProductSuggestions(rows)
        } catch {
          if (productSuggestReqId.current === reqId) setProductSuggestions([])
        } finally {
          if (productSuggestReqId.current === reqId) setProductSuggestLoading(false)
        }
      })()
    }, 320)
    return () => {
      if (productSuggestDebounceRef.current) {
        window.clearTimeout(productSuggestDebounceRef.current)
        productSuggestDebounceRef.current = null
      }
    }
  }, [queryProduto])

  useEffect(() => {
    if (productSuggestions.length === 0) {
      setActiveSuggestionIndex(0)

      return
    }
    setActiveSuggestionIndex((i) => Math.min(i, productSuggestions.length - 1))
  }, [productSuggestions])

  const selecionarSugestaoProduto = useCallback(
    (p: VrProductSuggestRow) => {
      setQueryProduto(p.commercial_name)
      setShowProductSuggestions(false)
      setResolvendo(true)
      void (async () => {
        try {
          const res = (await apiService.resolveAdminProduct(String(p.id))) as {
            data?: {
              id: number
              commercial_name: string
              um: string
              image_url: string | null
              price: number
              sku?: string | null
            }
          }
          const d = res.data
          if (!d?.id) return
          const vlr = precoNum > 0 ? precoNum : d.price
          const total = Math.round(vlr * qtdNum * 100) / 100
          const unidade = (un.trim() || d.um || "UN").slice(0, 4)
          const skuLabel = d.sku != null && String(d.sku).trim() !== "" ? String(d.sku).trim() : "—"
          const linha: LinhaVendaRapida = {
            id: novoIdLinha(),
            productId: d.id,
            sku: skuLabel,
            descricao: d.commercial_name,
            qtd: qtdNum,
            vlrUnit: vlr,
            total,
            un: unidade,
          }
          setImagemProdutoUrl(d.image_url)
          setLinhas((prev) => [linha, ...prev])
          setSelecionada(linha.id)
          setQueryProduto("")
          setProductSuggestions([])
          setPrecoText("0,00")
          setQtdText("1")
        } catch (err) {
          const msg = (err as ApiError)?.message ?? "Produto não encontrado."
          toast.error(msg)
        } finally {
          setResolvendo(false)
        }
      })()
    },
    [precoNum, qtdNum, un],
  )

  const inserirLinha = useCallback(async () => {
    if (tipo === "devolucao") {
      toast.error("Devolução ainda não integrada — use Venda.")
      return
    }
    if (!queryProduto.trim()) {
      toast.message("Informe a descrição, SKU, referência ou leia o código de barras.", {
        description: "Comece a escrever o nome para ver sugestões (como no cadastro de produto).",
      })
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
    setResolvendo(true)
    setShowProductSuggestions(false)
    try {
      const res = (await apiService.resolveAdminProduct(queryProduto.trim())) as {
        data?: {
          id: number
          commercial_name: string
          um: string
          image_url: string | null
          price: number
          sku?: string | null
        }
      }
      const p = res.data
      if (!p?.id) {
        throw new Error("Resposta inválida da API.")
      }
      const vlr = precoNum > 0 ? precoNum : p.price
      const total = Math.round(vlr * qtdNum * 100) / 100
      const unidade = (un.trim() || p.um || "UN").slice(0, 4)
      const skuLabel = p.sku != null && String(p.sku).trim() !== "" ? String(p.sku).trim() : "—"
      const linha: LinhaVendaRapida = {
        id: novoIdLinha(),
        productId: p.id,
        sku: skuLabel,
        descricao: p.commercial_name,
        qtd: qtdNum,
        vlrUnit: vlr,
        total,
        un: unidade,
      }
      setImagemProdutoUrl(p.image_url)
      setLinhas((prev) => [linha, ...prev])
      setSelecionada(linha.id)
      setQueryProduto("")
      setProductSuggestions([])
      setPrecoText("0,00")
      setQtdText("1")
    } catch (err) {
      const msg = (err as ApiError)?.message ?? "Produto não encontrado."
      toast.error(msg)
    } finally {
      setResolvendo(false)
    }
  }, [queryProduto, precoNum, qtdNum, tipo, un])

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
    setClienteId(null)
    setVendedorId(null)
    setDescontoText(formatPtBrMoney(0))
    setAcrescimoText(formatPtBrMoney(0))
    setQueryProduto("")
    setProductSuggestions([])
    setShowProductSuggestions(false)
    setPrecoText("0,00")
    setQtdText("1")
    setUn("UN")
    setTipo("venda")
    setForma("direta")
    setImagemProdutoUrl(null)
    if (paymentOptions[0]) setPaymentMethodId(String(paymentOptions[0].id))
    void carregarProximoCodigo()
    toast.success("Rascunho limpo.")
  }, [carregarProximoCodigo, paymentOptions])

  const executarVenda = useCallback(
    async (
      overrideCustomerId?: number,
      opts?: { imprimirApos?: boolean; clienteResumo?: { name: string; nif?: string } },
    ) => {
      const idCliente = overrideCustomerId ?? clienteId
      if (tipo === "devolucao") {
        toast.error("Devolução ainda não integrada com o servidor.")
        return
      }
      if (linhas.length === 0) {
        toast.error("Inclua ao menos um produto.")
        return
      }
      if (idCliente == null) {
        return
      }
      if (!paymentMethodId) {
        toast.error("Nenhuma forma de pagamento disponível para a loja.")
        return
      }
      setFinalizando(true)
      try {
        const items = linhas.map((l) => ({
          product_id: l.productId,
          quantity: l.qtd,
          value_unit: l.vlrUnit,
          total: l.total,
          um: l.un,
        }))
        await apiService.createAdminQuickSale({
          customer_id: idCliente,
          salesman_id: vendedorId ?? null,
          payment_method_id: Number(paymentMethodId),
          items,
          vl_discount: desconto,
          vl_surcharge: acrescimo,
        })
        // Não manter cliente na tela: cada "Finalizar" exige CPF / escolher de novo
        setClienteId(null)
        skipReabrirClienteAposResumo.current = true
        setDialogResumoVendaOpen(false)
        setResumoClienteVenda(null)

        if (opts?.imprimirApos) {
          const cr = opts.clienteResumo
          const snap: SnapshotVendaImpressao = {
            codigoVenda,
            clienteNome: (cr?.name ?? "").trim() || "—",
            clienteNif: cr?.nif,
            linhas: linhas.map((l) => ({ ...l })),
            desconto,
            acrescimo,
            total: totalVenda,
            formaPagamento: formaPagamentoLabel,
          }
          const ok = imprimirResumoVendaHtml(snap)
          if (!ok) {
            toast.error("Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.")
          }
        }

        toast.success("Venda registrada com sucesso.", {
          description: `Total R$ ${fmtMoney(totalVenda)} — ${linhas.length} itens`,
        })
        setLinhas([])
        setSelecionada(null)
        setImagemProdutoUrl(null)
        setQueryProduto("")
        setProductSuggestions([])
        setShowProductSuggestions(false)
        setPrecoText("0,00")
        setQtdText("1")
        setUn("UN")
        setDescontoText(formatPtBrMoney(0))
        setAcrescimoText(formatPtBrMoney(0))
        void carregarProximoCodigo()
      } catch (err) {
        const data = (err as { response?: { data?: { message?: string } } })?.response?.data
        const m = data?.message ?? (err as ApiError)?.message ?? "Não foi possível finalizar."
        toast.error(m)
      } finally {
        setFinalizando(false)
      }
    },
    [
      tipo,
      linhas,
      clienteId,
      paymentMethodId,
      vendedorId,
      desconto,
      acrescimo,
      totalVenda,
      carregarProximoCodigo,
      codigoVenda,
      formaPagamentoLabel,
    ],
  )

  const finalizar = useCallback(() => {
    if (tipo === "devolucao") {
      toast.error("Devolução ainda não integrada com o servidor.")
      return
    }
    if (linhas.length === 0) {
      toast.error("Inclua ao menos um produto.")
      return
    }
    // Sempre pede cliente/CPF — não reutilizar cliente de venda ou F3 anterior
    setClienteId(null)
    setBuscaClienteVenda("")
    setListaClienteVenda([])
    setNovoClienteNome("")
    setNovoClienteTelefone("")
    setDialogClienteVendaOpen(true)
  }, [linhas.length, tipo])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2" || e.key === "F3" || e.key === "F4" || e.key === "F5" || e.key === "F10" || e.key === "F11") {
        e.preventDefault()
        if (e.key === "F2") setDialogVendedorOpen(true)
        if (e.key === "F3") setDialogClienteOpen(true)
        if (e.key === "F4") setTipo("devolucao")
        if (e.key === "F5") reiniciar()
        if (e.key === "F10") void finalizar()
        if (e.key === "F11") excluirSelecionada()
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [reiniciar, finalizar, excluirSelecionada])

  const hint = "text-[10px] text-muted-foreground"

  const docDigitosClienteVenda = useMemo(() => onlyDigits(buscaClienteVenda), [buscaClienteVenda])
  const digitouLetrasClienteVenda = useMemo(() => /[a-zA-Z\u00C0-\u017F]/.test(buscaClienteVenda), [buscaClienteVenda])
  const cpfCompletoValido = useMemo(
    () => docDigitosClienteVenda.length === 11 && isValidCpf(docDigitosClienteVenda),
    [docDigitosClienteVenda],
  )
  const cpfCnpjJaNaListaVenda = useMemo(
    () => listaClienteVenda.some((c) => onlyDigits(c.nif || "") === docDigitosClienteVenda && docDigitosClienteVenda.length > 0),
    [docDigitosClienteVenda, listaClienteVenda],
  )
  const mostrarCadastroRapidoCliente = useMemo(
    () => {
      // CPF completo e válido, mas não encontrado.
      if (docDigitosClienteVenda.length === 11) return cpfCompletoValido && !cpfCnpjJaNaListaVenda

      // Nome digitado e sem resultados -> permitir cadastrar por nome (CPF/telefone opcionais).
      const nomeOk = digitouLetrasClienteVenda && buscaClienteVenda.trim().length >= 2
      return nomeOk && listaClienteVenda.length === 0 && !loadingClienteVenda
    },
    [
      buscaClienteVenda,
      cpfCompletoValido,
      cpfCnpjJaNaListaVenda,
      digitouLetrasClienteVenda,
      docDigitosClienteVenda.length,
      listaClienteVenda.length,
      loadingClienteVenda,
    ],
  )

  const productNameQueryOk = queryProduto.trim().length >= 2
  const listagemSugestoesAtiva =
    showProductSuggestions &&
    productNameQueryOk &&
    !productSuggestLoading &&
    productSuggestions.length > 0

  useLayoutEffect(() => {
    if (!listagemSugestoesAtiva) return
    const el = document.getElementById(`vr-sugestao-${activeSuggestionIndex}`)
    el?.scrollIntoView({ block: "nearest" })
  }, [activeSuggestionIndex, listagemSugestoesAtiva])
  const productSuggestionsPortal =
    showProductSuggestions &&
    productNameQueryOk &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        role="listbox"
        aria-label="Produtos com nome semelhante"
        className="fixed z-[200] overflow-y-auto overscroll-contain rounded-md border border-border bg-popover text-popover-foreground shadow-xl"
        style={{
          top: productMenuRect.top,
          left: productMenuRect.left,
          width: productMenuRect.width,
          maxHeight: "min(50vh, 320px)",
        }}
      >
        {productSuggestLoading ? (
          <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            A procurar…
          </div>
        ) : null}
        {!productSuggestLoading && productSuggestions.length === 0 ? (
          <div className="px-3 py-2.5 text-sm text-muted-foreground">Nenhum produto encontrado com esse nome.</div>
        ) : null}
        {productSuggestions.map((p, idx) => {
          const sub = [p.reference.trim() ? `Ref. ${p.reference}` : "", p.sku.trim() ? `SKU ${p.sku}` : ""]
            .filter(Boolean)
            .join(" · ")
          const isActive = idx === activeSuggestionIndex
          return (
            <button
              key={p.id}
              id={`vr-sugestao-${idx}`}
              type="button"
              role="option"
              aria-selected={isActive}
              className={cn(
                "flex h-auto min-h-0 w-full flex-col items-start justify-start gap-0.5 break-words px-3 py-2.5 text-left hover:bg-muted",
                isActive && "bg-muted",
                idx > 0 || productSuggestLoading ? "border-t border-border/60" : "",
              )}
              onMouseEnter={() => setActiveSuggestionIndex(idx)}
              onMouseDown={(e) => {
                e.preventDefault()
                selecionarSugestaoProduto(p)
              }}
            >
              <span className="text-sm font-medium text-popover-foreground">{p.commercial_name}</span>
              {sub ? <span className="text-xs text-muted-foreground">{sub}</span> : null}
            </button>
          )
        })}
      </div>,
      document.body,
    )

  return (
    <div className="flex h-full w-full min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden text-sm text-foreground">
      <div className="mx-auto flex h-full w-full min-h-0 max-w-none flex-1 flex-col gap-2.5">
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
                    <div className="mb-1.5 flex h-6 w-full min-w-0 items-center">
                      <Label className="text-xs leading-none text-muted-foreground">Código da venda</Label>
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
                        htmlFor="vr-produto"
                      >
                        Produto
                      </Label>
                      <span className={cn(hint, "leading-tight")}>
                        Setas ↑↓ percorrem a lista; Enter com lista aberta aplica o item realçado
                      </span>
                    </div>
                    <div ref={productNameFieldWrapRef} className="relative w-full min-w-0">
                      <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:left-3.5 sm:h-5 sm:w-5" />
                      <Input
                        id="vr-produto"
                        value={queryProduto}
                        onChange={(e) => {
                          const v = e.target.value
                          setQueryProduto(v)
                          setShowProductSuggestions(v.trim().length >= 2)
                        }}
                        onFocus={() => {
                          if (queryProduto.trim().length >= 2) setShowProductSuggestions(true)
                        }}
                        onBlur={() => {
                          window.setTimeout(() => setShowProductSuggestions(false), 180)
                        }}
                        onKeyDown={(e) => {
                          const listo =
                            showProductSuggestions &&
                            queryProduto.trim().length >= 2 &&
                            !productSuggestLoading &&
                            productSuggestions.length > 0
                          if (e.key === "ArrowDown" && listo) {
                            e.preventDefault()
                            setActiveSuggestionIndex((i) => (i + 1) % productSuggestions.length)
                            return
                          }
                          if (e.key === "ArrowUp" && listo) {
                            e.preventDefault()
                            setActiveSuggestionIndex(
                              (i) => (i - 1 + productSuggestions.length) % productSuggestions.length,
                            )
                            return
                          }
                          if (e.key === "Enter") {
                            if (listo) {
                              e.preventDefault()
                              const p = productSuggestions[activeSuggestionIndex]
                              if (p) selecionarSugestaoProduto(p)
                              return
                            }
                            void inserirLinha()
                            return
                          }
                          if (e.key === "Escape" && showProductSuggestions) {
                            e.preventDefault()
                            setShowProductSuggestions(false)
                          }
                        }}
                        placeholder="Comece a escrever a descrição, SKU ou leia o código de barras…"
                        className="h-12 w-full pl-10 pr-3 text-base font-normal leading-none sm:pl-11"
                        autoComplete="off"
                        disabled={resolvendo}
                      />
                      {productSuggestionsPortal}
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
                      disabled={resolvendo}
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
                        onKeyDown={(e) => e.key === "Enter" && void inserirLinha()}
                        disabled={resolvendo}
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

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 max-lg:overflow-y-auto max-lg:overscroll-y-contain lg:overflow-hidden">
          <div
            className="grid min-h-0 w-full min-w-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-3 lg:min-h-0 lg:grid-cols-2 lg:grid-rows-1 lg:items-stretch lg:gap-3 lg:[grid-template-columns:minmax(0,1fr)_minmax(0,1fr)]"
          >
            <Card className="flex h-full w-full min-w-0 min-h-[12rem] flex-col overflow-hidden p-0 lg:min-h-0">
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
                    onClick={() => void inserirLinha()}
                    disabled={resolvendo}
                  >
                    {resolvendo ? "…" : "Incluir (Enter)"}
                  </Button>
                </div>
              </CardHeader>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="hidden w-full overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">SKU</TableHead>
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
                            Nenhum item. Informe o produto (sugestões após 2 letras), preço e quantidade; Enter ou
                            &quot;Incluir&quot;.
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
                              {l.sku}
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
                            <p className="mt-1 text-xs text-muted-foreground">SKU: {l.sku}</p>
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
              <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
                <Card className="flex h-full w-full min-w-0 min-h-0 flex-1 flex-col overflow-hidden">
                  <CardContent className="flex h-full min-h-0 flex-1 flex-col p-2.5 sm:p-3.5">
                    <div className="flex w-full min-w-0 flex-col gap-0.5">
                      <Label
                        className="shrink-0 text-xs font-normal leading-tight text-muted-foreground"
                        htmlFor="vr-forma-pagamento"
                      >
                        Forma de pagamento
                      </Label>
                      <Select
                        value={paymentMethodId || undefined}
                        onValueChange={setPaymentMethodId}
                        disabled={paymentOptions.length === 0}
                      >
                        <SelectTrigger
                          id="vr-forma-pagamento"
                          className="h-12 w-full min-w-0 text-base font-normal leading-none data-[placeholder]:text-muted-foreground"
                        >
                          <SelectValue placeholder="Carregando…" />
                        </SelectTrigger>
                        <SelectContent
                          className="max-h-56 min-w-[var(--radix-select-trigger-width)]"
                          position="popper"
                          sideOffset={4}
                        >
                          {paymentOptions.map((pm) => (
                            <SelectItem key={pm.id} value={String(pm.id)}>
                              {pm.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="mt-auto flex w-full min-w-0 flex-col gap-2 sm:min-w-0 sm:flex-row sm:items-stretch sm:gap-2.5">
                <Card className="min-w-0 w-full flex-1 sm:min-w-0">
                  <CardContent className="px-2 py-1.5 sm:px-2.5 sm:py-2">
                    <div className="flex w-full min-w-0 min-h-0 flex-col gap-0">
                      <Label
                        className="shrink-0 text-[10px] font-normal leading-none text-muted-foreground"
                        htmlFor="vr-desconto"
                      >
                        Desconto (R$)
                      </Label>
                      <Input
                        id="vr-desconto"
                        inputMode="numeric"
                        className="h-9 w-full min-w-0 max-w-full px-2.5 py-1.5 text-sm tabular-nums"
                        placeholder="0,00"
                        value={descontoText}
                        onChange={(e) => setDescontoText(formatMoneyCentsMask(e.target.value))}
                        onBlur={() => setDescontoText((t) => formatMoneyCentsMask(t))}
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card className="min-w-0 w-full flex-1 sm:min-w-0">
                  <CardContent className="px-2 py-1.5 sm:px-2.5 sm:py-2">
                    <div className="flex w-full min-w-0 min-h-0 flex-col gap-0">
                      <Label
                        className="shrink-0 text-[10px] font-normal leading-none text-muted-foreground"
                        htmlFor="vr-acrescimo"
                      >
                        Acréscimo (R$)
                      </Label>
                      <Input
                        id="vr-acrescimo"
                        inputMode="numeric"
                        className="h-9 w-full min-w-0 max-w-full px-2.5 py-1.5 text-sm tabular-nums"
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

        <div className="relative z-10 flex shrink-0 flex-col gap-2.5 border-t border-border/50 bg-background pt-2 sm:flex-row sm:items-center sm:justify-between">
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
            <Button
              type="button"
              size="default"
              onClick={() => void finalizar()}
              className="gap-2 font-semibold"
              title="F10"
              disabled={finalizando}
            >
              {finalizando ? "A guardar…" : "Finalizar (F10)"}
            </Button>
            <div className="ml-0 flex items-center gap-2 pl-0 sm:ml-2 sm:border-l sm:border-border sm:pl-2">
              <Store className="h-4 w-4 text-muted-foreground" aria-hidden />
              <Button type="button" variant="secondary" size="sm" disabled>
                Opções
              </Button>
            </div>
          </div>
        </div>

        <Dialog
          open={dialogClienteOpen}
          onOpenChange={(o) => {
            setDialogClienteOpen(o)
            if (o) setBuscaCliente("")
          }}
        >
          <DialogContent className="max-h-[85dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Cliente
              </DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Nome ou CPF/CNPJ…"
              value={buscaCliente}
              onChange={(e) => setBuscaCliente(e.target.value)}
              className="mb-2"
              autoFocus
            />
            <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-1">
              {listaClientes.length === 0 ? (
                <li className="px-2 py-4 text-center text-sm text-muted-foreground">Nenhum resultado</li>
              ) : (
                listaClientes.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setClienteId(c.id)
                        setDialogClienteOpen(false)
                      }}
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.nif && <span className="ml-1 text-xs text-muted-foreground">{c.nif}</span>}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </DialogContent>
        </Dialog>

        <Dialog
          open={dialogVendedorOpen}
          onOpenChange={(o) => {
            setDialogVendedorOpen(o)
            if (o) setBuscaVendedor("")
          }}
        >
          <DialogContent className="max-h-[85dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCircle2 className="h-4 w-4" />
                Vendedor
              </DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Nome ou CPF…"
              value={buscaVendedor}
              onChange={(e) => setBuscaVendedor(e.target.value)}
              className="mb-2"
              autoFocus
            />
            <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-1">
              {listaVendedores.length === 0 ? (
                <li className="px-2 py-4 text-center text-sm text-muted-foreground">Nenhum resultado</li>
              ) : (
                listaVendedores.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setVendedorId(c.id)
                        setDialogVendedorOpen(false)
                      }}
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.nif && <span className="ml-1 text-xs text-muted-foreground">{c.nif}</span>}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </DialogContent>
        </Dialog>

        <Dialog
          open={dialogClienteVendaOpen}
          onOpenChange={(o) => {
            setDialogClienteVendaOpen(o)
            if (o) {
              setBuscaClienteVenda("")
              setListaClienteVenda([])
              setNovoClienteNome("")
              setNovoClienteCpf("")
              setNovoClienteTelefone("")
              setClienteVendaNovoInline(false)
            }
          }}
        >
          <DialogContent className="w-full max-w-xl gap-3 overflow-y-auto overflow-x-visible p-4 sm:p-5 max-h-[85dvh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-left">
                <Users className="h-4 w-4" />
                Cliente da venda
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Digite o CPF (até 11 dígitos) ou o nome. Ao completar 11 dígitos, validamos o CPF e mostramos se está cadastrado.
            </p>
            <div className="relative z-0 mt-2 pb-2">
              <Label className="text-xs text-muted-foreground" htmlFor="vr-cliente-venda-busca">
                CPF ou nome
              </Label>
              <Input
                id="vr-cliente-venda-busca"
                value={buscaClienteVenda}
                onChange={(e) => {
                  const v = e.target.value
                  if (/[a-zA-Z\u00C0-\u017F]/.test(v)) {
                    setBuscaClienteVenda(v)
                    return
                  }
                  const d = onlyDigits(v).slice(0, 11)
                  setBuscaClienteVenda(formatCpfCnpjMask(d))
                }}
                placeholder="000.000.000-00 ou nome"
                className="mt-0.5 h-11 pl-3 text-base"
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
              {searchClienteVendaParam.length >= 2 || (docDigitosClienteVenda.length === 11 && !cpfCompletoValido) ? (
                <div
                  className="absolute left-0 right-0 z-[200] mt-1 flex max-h-[min(45dvh,360px)] flex-col overflow-hidden overscroll-contain rounded-md border border-border bg-popover text-popover-foreground shadow-xl"
                  role="listbox"
                  aria-label="Clientes encontrados"
                >
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {docDigitosClienteVenda.length === 11 && !cpfCompletoValido ? (
                      <div className="px-3 py-2.5 text-sm text-destructive">
                        CPF inválido: <span className="font-mono">{formatCpfCnpjMask(docDigitosClienteVenda)}</span>
                      </div>
                    ) : null}
                    {loadingClienteVenda ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        A procurar clientes…
                      </div>
                    ) : (
                      <>
                        {listaClienteVenda.length > 0 ? (
                          <div className="divide-y divide-border/60">
                            {listaClienteVenda.map((c) => {
                              const nifR = c.nif?.trim() ? onlyDigits(c.nif) : ""
                              const nifExibir = nifR.length === 11 ? formatCpfCnpjMask(nifR) : (c.nif ?? "")
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  className="flex w-full min-h-0 flex-col items-start justify-start gap-0.5 break-words px-3 py-2.5 text-left hover:bg-muted"
                                  onClick={() => {
                                    setClienteVendaNovoInline(false)
                                    setResumoClienteVenda({ id: c.id, name: c.name, nif: c.nif })
                                    setDialogClienteVendaOpen(false)
                                    setDialogResumoVendaOpen(true)
                                  }}
                                >
                                  <span className="text-sm font-medium text-popover-foreground">{c.name}</span>
                                  {nifExibir ? <span className="text-xs text-muted-foreground">CPF: {nifExibir}</span> : null}
                                </button>
                              )
                            })}
                          </div>
                        ) : !loadingClienteVenda && !(docDigitosClienteVenda.length === 11 && !cpfCompletoValido) ? (
                          <div className="px-3 py-2.5 text-sm text-muted-foreground">
                            Nenhum cliente com este critério ainda.
                          </div>
                        ) : null}
                        {mostrarCadastroRapidoCliente && clienteVendaNovoInline ? (
                          <div className="space-y-3 border-t border-border/60 bg-muted/25 p-4 pb-5 sm:p-5 sm:pb-6">
                            <p className="text-xs text-muted-foreground">Preencha o que souber (campos opcionais).</p>
                            <div>
                              <Label className="text-xs text-muted-foreground" htmlFor="vr-novo-cliente-nome">
                                Nome
                              </Label>
                              <Input
                                id="vr-novo-cliente-nome"
                                value={novoClienteNome}
                                onChange={(e) => setNovoClienteNome(e.target.value)}
                                className="mt-0.5 h-9 text-sm"
                                maxLength={30}
                                autoComplete="name"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground" htmlFor="vr-novo-cliente-cpf">
                                CPF (opcional)
                              </Label>
                              <Input
                                id="vr-novo-cliente-cpf"
                                value={novoClienteCpf}
                                onChange={(e) => {
                                  const d = onlyDigits(e.target.value).slice(0, 11)
                                  setNovoClienteCpf(formatCpfCnpjMask(d))
                                }}
                                placeholder="000.000.000-00"
                                className="mt-0.5 h-9 text-sm"
                                maxLength={14}
                                inputMode="numeric"
                                autoComplete="off"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground" htmlFor="vr-novo-cliente-tel">
                                Telefone (opcional, com DDD)
                              </Label>
                              <Input
                                id="vr-novo-cliente-tel"
                                value={novoClienteTelefone}
                                onChange={(e) => setNovoClienteTelefone(formatPhoneBrMask(e.target.value))}
                                placeholder="(00) 00000-0000"
                                className="mt-0.5 h-9 text-sm"
                                maxLength={16}
                                inputMode="tel"
                                autoComplete="tel"
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setClienteVendaNovoInline(false)}
                                disabled={criandoCliente}
                              >
                                Voltar
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="flex-1"
                                disabled={criandoCliente || finalizando}
                                onClick={() => {
                                  if (!novoClienteNome.trim()) {
                                    toast.error("Informe o nome do cliente.")
                                    return
                                  }
                                  const telD = onlyDigits(novoClienteTelefone)
                                  if (telD.length > 0 && telD.length < 10) {
                                    toast.error("Telefone inválido. Informe o DDD (mínimo 10 dígitos) ou deixe em branco.")
                                    return
                                  }
                                  const cpfD = onlyDigits(novoClienteCpf)
                                  if (cpfD.length > 0 && (cpfD.length !== 11 || !isValidCpf(cpfD))) {
                                    toast.error("CPF inválido. Corrija ou deixe em branco.")
                                    return
                                  }
                                  void (async () => {
                                    setCriandoCliente(true)
                                    try {
                                      const r = await apiService.createAdminCustomerQuick({
                                        nif: cpfD || null,
                                        name: novoClienteNome.trim().slice(0, 30),
                                        phone: telD || null,
                                      })
                                      const data = laravelInnerData(r) as { id?: number }
                                      const newId =
                                        data && typeof data === "object" && "id" in data
                                          ? (data as { id: number }).id
                                          : undefined
                                      if (newId == null) {
                                        throw new Error("Resposta do servidor sem id do cliente.")
                                      }
                                      const nomeCad = novoClienteNome.trim().slice(0, 30)
                                      const nifCad = cpfD
                                      setDialogClienteVendaOpen(false)
                                      setNovoClienteNome("")
                                      setNovoClienteCpf("")
                                      setNovoClienteTelefone("")
                                      setBuscaClienteVenda("")
                                      setListaClienteVenda([])
                                      setClienteVendaNovoInline(false)
                                      setResumoClienteVenda({ id: newId, name: nomeCad, nif: nifCad || undefined })
                                      setDialogResumoVendaOpen(true)
                                    } catch (err) {
                                      const data = (err as { response?: { data?: unknown } }).response?.data
                                      const t422 = data ? laravelValidationErrorText(data) : null
                                      const msgFromApi =
                                        data && typeof data === "object" && data !== null && "message" in data
                                          ? String((data as { message: unknown }).message)
                                          : ""
                                      const m =
                                        (msgFromApi && msgFromApi !== "Erro de validação." ? msgFromApi : null) ??
                                        t422 ??
                                        (err as ApiError)?.message ??
                                        "Não foi possível cadastrar o cliente."
                                      toast.error(m)
                                    } finally {
                                      setCriandoCliente(false)
                                    }
                                  })()
                                }}
                              >
                                {criandoCliente ? "A guardar…" : "Cadastrar e continuar"}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                  {mostrarCadastroRapidoCliente && !clienteVendaNovoInline ? (
                    <div className="sticky bottom-0 border-t border-border/60 bg-popover/95 backdrop-blur">
                      <button
                        type="button"
                        className="w-full bg-muted/40 px-3 py-2.5 text-left text-sm font-medium text-primary hover:bg-muted"
                        onClick={() => {
                          // Só pré-preenche nome quando o usuário digitou um nome (não CPF).
                          if (docDigitosClienteVenda.length !== 11) {
                            setNovoClienteNome((n) => (n.trim() ? n : buscaClienteVenda.trim()))
                          } else {
                            setNovoClienteNome("")
                          }
                          setNovoClienteCpf(
                            docDigitosClienteVenda.length === 11 ? formatCpfCnpjMask(docDigitosClienteVenda) : "",
                          )
                          setClienteVendaNovoInline(true)
                        }}
                      >
                        + Cadastrar novo cliente{" "}
                        {docDigitosClienteVenda.length === 11 ? "com este CPF" : "com este nome"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={dialogResumoVendaOpen}
          onOpenChange={(open) => {
            setDialogResumoVendaOpen(open)
            if (!open) {
              if (skipReabrirClienteAposResumo.current) {
                skipReabrirClienteAposResumo.current = false
                setResumoClienteVenda(null)
                return
              }
              setResumoClienteVenda(null)
              setDialogClienteVendaOpen(true)
            }
          }}
        >
          <DialogContent className="h-[96dvh] max-h-[96dvh] w-full max-w-3xl gap-2 overflow-y-auto p-4 sm:h-[94dvh] sm:max-h-[94dvh] sm:max-w-3xl sm:gap-3 sm:p-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-left">
                <ShoppingCart className="h-4 w-4" />
                Resumo da venda
              </DialogTitle>
              <DialogDescription>
                Confira o cliente, os itens e o total. Se tiver selecionado a pessoa errada, toque em Voltar
                para escolher outro. Deseja imprimir o comprovante ao concluir?
              </DialogDescription>
            </DialogHeader>

            {resumoClienteVenda ? (
              <div className="space-y-3 text-sm">
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium text-foreground">{resumoClienteVenda.name}</p>
                  {resumoClienteVenda.nif ? (
                    <p className="text-xs text-muted-foreground">CPF/CNPJ: {fmtNifExibir(resumoClienteVenda.nif)}</p>
                  ) : null}
                </div>
                <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  <span>
                    Código da venda: <span className="font-mono text-foreground">{codigoVenda}</span>
                  </span>
                  <span>
                    Forma de pagamento: <span className="text-foreground">{formaPagamentoLabel}</span>
                  </span>
                </div>
                <div className="max-h-[min(40dvh,280px)] overflow-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-9 text-xs">Produto</TableHead>
                        <TableHead className="h-9 w-[4.5rem] text-right text-xs">Qtd</TableHead>
                        <TableHead className="h-9 w-[5.5rem] text-right text-xs">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linhas.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="align-top text-xs">
                            <span className="font-medium">{l.descricao}</span>
                            {l.sku && l.sku !== "—" ? (
                              <span className="mt-0.5 block text-[10px] text-muted-foreground">SKU {l.sku}</span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {fmtQty(l.qtd)} {l.un}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium tabular-nums">
                            R$ {fmtMoney(l.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="space-y-1 border-t border-border pt-2 text-sm">
                  <div className="flex justify-between gap-2 text-muted-foreground">
                    <span>Desconto</span>
                    <span className="tabular-nums">R$ {fmtMoney(desconto)}</span>
                  </div>
                  <div className="flex justify-between gap-2 text-muted-foreground">
                    <span>Acréscimo</span>
                    <span className="tabular-nums">R$ {fmtMoney(acrescimo)}</span>
                  </div>
                  <div className="flex justify-between gap-2 text-base font-semibold text-foreground">
                    <span>Total da venda</span>
                    <span className="tabular-nums">R$ {fmtMoney(totalVenda)}</span>
                  </div>
                </div>
              </div>
            ) : null}

            <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={finalizando}
                  onClick={() => {
                    setDialogResumoVendaOpen(false)
                  }}
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:min-w-[9rem] sm:w-auto"
                  disabled={finalizando || resumoClienteVenda == null}
                  onClick={() => {
                    if (resumoClienteVenda == null) return
                    void executarVenda(resumoClienteVenda.id, {
                      imprimirApos: false,
                      clienteResumo: { name: resumoClienteVenda.name, nif: resumoClienteVenda.nif },
                    })
                  }}
                >
                  {finalizando ? "A concluir…" : "Não imprimir"}
                </Button>
                <Button
                  type="button"
                  className="w-full sm:min-w-[9rem] sm:w-auto"
                  disabled={finalizando || resumoClienteVenda == null}
                  onClick={() => {
                    if (resumoClienteVenda == null) return
                    void executarVenda(resumoClienteVenda.id, {
                      imprimirApos: true,
                      clienteResumo: { name: resumoClienteVenda.name, nif: resumoClienteVenda.nif },
                    })
                  }}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {finalizando ? "A concluir…" : "Sim, imprimir"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
