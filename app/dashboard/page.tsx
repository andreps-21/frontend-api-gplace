"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ShoppingCart, TrendingUp, Users, DollarSign, Target, Award, Loader2, Wifi, Smartphone, Headphones, Coins, Wallet, Cake } from "lucide-react"
import { apiService } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { isGestorLevelRole } from "@/lib/permissions-role"
import { notifications } from "@/lib/notifications"
import { TopLojasCard } from "@/components/TopLojasCard"

interface DashboardStats {
  vendasHoje: number
  vendasOntem: number
  variacaoVendas: number
  faturamentoHoje: number
  metaMes: number
  vendedoresAtivos: number
  faturamentoServico: number
  faturamentoChip: number
  faturamentoAparelho: number
  faturamentoAcessorio: number
  quantidadeVendasServico: number
  quantidadeVendasChip: number
  quantidadeVendasAparelho: number
  quantidadeVendasAcessorio: number
  variacaoServico: number
  variacaoChip: number
  variacaoAparelho: number
  variacaoAcessorio: number
}

interface RecentSale {
  id: number
  vendedor: string
  produto: string
  valor: number
  loja: string
  data: string
}

interface TopStore {
  id: number
  nome: string
  vendas: number
  meta: number
  faturamento: number
}

interface Aniversariante {
  id: number
  name: string
  email: string
  birthdate: string | null
  day_of_month: number | null
  establishment_name?: string | null
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    vendasHoje: 0,
    vendasOntem: 0,
    variacaoVendas: 0,
    faturamentoHoje: 0,
    metaMes: 0,
    vendedoresAtivos: 0,
    faturamentoServico: 0,
    faturamentoChip: 0,
    faturamentoAparelho: 0,
    faturamentoAcessorio: 0,
    quantidadeVendasServico: 0,
    quantidadeVendasChip: 0,
    quantidadeVendasAparelho: 0,
    quantidadeVendasAcessorio: 0,
    variacaoServico: 0,
    variacaoChip: 0,
    variacaoAparelho: 0,
    variacaoAcessorio: 0
  })
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [establishments, setEstablishments] = useState<any[]>([])
  const [aniversariantes, setAniversariantes] = useState<Aniversariante[]>([])

  // Função para obter data de hoje no formato YYYY-MM-DD
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  // Função para obter data de ontem no formato YYYY-MM-DD
  const getYesterdayDate = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }

  // Função para obter data de 7 dias atrás no formato YYYY-MM-DD
  const getWeekAgoDate = () => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return weekAgo.toISOString().split('T')[0]
  }

  // Função para obter primeiro dia do mês atual no formato YYYY-MM-DD
  const getFirstDayOfMonth = () => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    return firstDay.toISOString().split('T')[0]
  }

  // Função para obter último dia do mês atual no formato YYYY-MM-DD
  const getLastDayOfMonth = () => {
    const today = new Date()
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return lastDay.toISOString().split('T')[0]
  }

  // Função para buscar vendas do mês atual
  const fetchTodaySales = async () => {
    try {
      const today = getTodayDate()
      const yesterday = getYesterdayDate()
      const firstDayOfMonth = getFirstDayOfMonth()
      const lastDayOfMonth = getLastDayOfMonth()
      
      console.log('🔍 fetchTodaySales: Iniciando busca de vendas do mês atual...')
      console.log('📅 Data de hoje:', today)
      console.log('📅 Data de ontem:', yesterday)
      console.log('📅 Primeiro dia do mês:', firstDayOfMonth)
      console.log('📅 Último dia do mês:', lastDayOfMonth)
      console.log('👤 Usuário atual:', user)
      console.log('🏢 Establishment ID do usuário:', user?.establishment_id)
      console.log('👤 Role do usuário:', user?.role)
      
      // Ajustar filtro baseado no role do usuário
      let salesParams: any = {
        date_from: firstDayOfMonth,
        date_to: lastDayOfMonth,
        page: 1,
        per_page: 10000 // Buscar todas as vendas do mês
      }
      
      // Aplicar filtros baseados no role do usuário
      if (user?.role === 'vendedor') {
        // Vendedor: apenas suas próprias vendas
        salesParams.seller_id = user.id
        if (user?.establishment_id) {
          salesParams.establishment_id = user.establishment_id
          console.log('🔍 Vendedor: Filtrando por seller_id e establishment_id:', user.id, user.establishment_id)
        } else {
          console.log('🔍 Vendedor: Filtrando apenas por seller_id:', user.id)
        }
      } else if (user?.role === 'gerente') {
        // Gerente: vendas do seu estabelecimento
        if (user?.establishment_id) {
          salesParams.establishment_id = user.establishment_id
          console.log('🔍 Gerente: Filtrando por establishment_id:', user.establishment_id)
        } else {
          console.log('⚠️ Gerente sem establishment_id, buscando todas as vendas')
        }
      } else {
        // Gestor: todas as vendas
        console.log('👑 Usuário gestor/admin, buscando todas as vendas')
      }
      
      console.log('📋 Parâmetros da busca:', salesParams)
      
      const response = await apiService.getSales(salesParams)
      
      console.log('📥 Resposta da API de vendas:', response)

      if (response.data && response.data.data) {
        const vendas = response.data.data
        console.log('📊 Vendas encontradas (mês atual):', vendas.length)
        console.log('📋 Lista de vendas:', vendas)
        
        // Filtrar vendas de hoje e ontem para calcular variação
        const vendasHoje = vendas.filter((venda: any) => {
          const vendaDate = new Date(venda.created_at).toISOString().split('T')[0]
          return vendaDate === today
        })
        
        const vendasOntem = vendas.filter((venda: any) => {
          const vendaDate = new Date(venda.created_at).toISOString().split('T')[0]
          return vendaDate === yesterday
        })
        
        // Calcular faturamento do mês inteiro
        const faturamentoMes = vendas.reduce((sum: number, venda: any) => {
          return sum + (parseFloat(venda.total_price) || 0)
        }, 0)
        
        const vendasHojeCount = vendasHoje.length
        const vendasOntemCount = vendasOntem.length
        
        // Calcular variação percentual
        let variacaoVendas = 0
        if (vendasOntemCount > 0) {
          variacaoVendas = ((vendasHojeCount - vendasOntemCount) / vendasOntemCount) * 100
        } else if (vendasHojeCount > 0) {
          variacaoVendas = 100 // Se não havia vendas ontem mas há hoje, é 100% de crescimento
        }

        console.log('📊 Vendas de hoje:', vendasHojeCount)
        console.log('📊 Vendas de ontem:', vendasOntemCount)
        console.log('📈 Variação percentual:', variacaoVendas.toFixed(1) + '%')
        console.log('💰 Faturamento do mês:', faturamentoMes)

        setStats(prev => ({
          ...prev,
          vendasHoje: vendasHojeCount,
          vendasOntem: vendasOntemCount,
          variacaoVendas: variacaoVendas
          // faturamentoHoje é definido pelo endpoint /dashboard/stats
        }))

        // Preparar vendas recentes (últimas 5 do mês atual)
        const recentSalesData = vendas.slice(0, 5).map((venda: any) => ({
          id: venda.id,
          vendedor: venda.seller?.name || 'Vendedor não informado',
          produto: venda.product_name || venda.product?.name || 'Produto não informado',
          valor: parseFloat(venda.total_price) || 0,
          loja: venda.establishment?.name || 'Loja não informada',
          data: venda.created_at
        }))

        console.log('🔄 Vendas recentes processadas (mês atual):', recentSalesData)
        setRecentSales(recentSalesData)
      } else {
        console.log('⚠️ Nenhuma venda encontrada ou resposta inválida')
        console.log('📥 Resposta completa:', response)
      }
    } catch (error) {
      console.error('Erro ao buscar vendas de hoje:', error)
      notifications.custom.error('Erro ao carregar dados do dashboard')
    }
  }


  // Função para buscar dados de faturamento por categoria
  const fetchFaturamentoData = async () => {
    try {
      console.log('🔍 fetchFaturamentoData: Iniciando busca de faturamento por categoria...')
      
      const firstDayOfMonth = getFirstDayOfMonth()
      const lastDayOfMonth = getLastDayOfMonth()
      
      console.log('📅 Primeiro dia do mês:', firstDayOfMonth)
      console.log('📅 Último dia do mês:', lastDayOfMonth)
      console.log('👤 Usuário atual:', user)
      
      // Preparar parâmetros baseado no role do usuário
      let params: any = {
        date_from: firstDayOfMonth,
        date_to: lastDayOfMonth
      }
      
      // Apenas Gestor/Master podem especificar establishment_id
      if (isGestorLevelRole(user?.role)) {
        // Gestor / administrador / master pode especificar establishment_id se quiser filtrar
        console.log('👑 Usuário gestor/master, pode especificar establishment_id')
      } else {
        console.log('👤 Usuário vendedor/gerente, filtro automático por role')
      }
      
      console.log('📋 Parâmetros da busca de faturamento:', params)
      
      const response = await apiService.getDashboardFaturamento(params)
      
      console.log('📥 Resposta da API de faturamento:', response)

      if (response.data) {
        const data = response.data
        console.log('📊 Dados de faturamento recebidos:', data)
        
        setStats(prev => ({
          ...prev,
          faturamentoServico: data.faturamento?.servico || 0,
          faturamentoChip: data.faturamento?.chip || 0,
          faturamentoAparelho: data.faturamento?.aparelho || 0,
          faturamentoAcessorio: data.faturamento?.acessorio || 0,
          quantidadeVendasServico: data.quantidade_vendas?.servico || 0,
          quantidadeVendasChip: data.quantidade_vendas?.chip || 0,
          quantidadeVendasAparelho: data.quantidade_vendas?.aparelho || 0,
          quantidadeVendasAcessorio: data.quantidade_vendas?.acessorio || 0,
          variacaoServico: data.variacoes?.servico || 0,
          variacaoChip: data.variacoes?.chip || 0,
          variacaoAparelho: data.variacoes?.aparelho || 0,
          variacaoAcessorio: data.variacoes?.acessorio || 0
        }))
        
        console.log('✅ Dados de faturamento atualizados no estado')
      } else {
        console.log('⚠️ Nenhum dado de faturamento encontrado ou resposta inválida')
        console.log('📥 Resposta completa:', response)
      }
    } catch (error: any) {
      console.error('❌ Erro ao buscar dados de faturamento:', error)
      
      // Tratar erro de acesso negado especificamente
      if (error.response?.status === 403) {
        console.error('🚫 Acesso negado: Você só pode ver faturamento da sua loja')
      } else {
        console.error('❌ Erro geral ao carregar faturamento:', error.message)
      }
    }
  }


  // Função para buscar estabelecimentos
  const fetchEstablishments = async () => {
    try {
      console.log('Iniciando busca de estabelecimentos...')
      console.log('Usuário atual:', user)
      
      // Verificar token no localStorage
      const token = localStorage.getItem('auth_token')
      console.log('Token de autenticação:', token ? `${token.substring(0, 20)}...` : 'Não encontrado')
      
      // Verificar se há token antes de fazer a requisição
      if (!token) {
        console.error('Token de autenticação não encontrado')
        setEstablishments([])
        return
      }

      // Se for gestor/gerente ou administrador, buscar todos os estabelecimentos
      if (isGestorLevelRole(user?.role) || user?.role === 'gerente' || user?.email === 'admin@tim.com.br' || user?.name?.includes('Administrador')) {
        const response = await apiService.getEstablishments()
        console.log('Resposta da API de estabelecimentos:', response)
        
        // A API retorna o array diretamente em response.data
        const establishments = Array.isArray(response.data) ? response.data : (response.data?.data || [])
        console.log('Estabelecimentos carregados:', establishments)
        setEstablishments(establishments)
      } else {
        // Se não for gestor, criar array com apenas o estabelecimento do usuário
        console.log('Usuário não é gestor, usando apenas seu estabelecimento')
        console.log('ID do estabelecimento do usuário:', user?.establishment_id)
        
        if (user?.establishment_id && user.establishment_id > 0) {
          // Buscar dados do estabelecimento do usuário usando novo endpoint
          try {
            console.log('🔍 Buscando estabelecimento do vendedor...')
            const response = await apiService.getMyEstablishment()
            console.log('📥 Resposta da API de estabelecimento:', response)
            
            if (response && response.data) {
              console.log('✅ Estabelecimento do vendedor carregado:', response.data)
              setEstablishments([response.data])
            } else {
              console.log('⚠️ Resposta vazia, criando objeto básico')
              // Fallback: criar objeto básico
              setEstablishments([{
                id: user.establishment_id,
                name: 'Minha Loja',
                // outros campos necessários
              }])
            }
          } catch (error: any) {
            console.error('❌ Erro ao buscar estabelecimento do vendedor:', error)
            console.error('Tipo do erro:', typeof error)
            console.error('Mensagem do erro:', error?.message || 'Erro desconhecido')
            console.error('Status do erro:', error?.response?.status || 'N/A')
            console.error('Dados do erro:', error?.response?.data || 'N/A')
            console.error('Stack trace:', error?.stack || 'N/A')
            
            // Fallback: criar objeto básico
            console.log('🔄 Criando estabelecimento básico como fallback')
            setEstablishments([{
              id: user.establishment_id,
              name: 'Minha Loja',
            }])
          }
        } else {
          console.log('⚠️ Usuário sem estabelecimento definido ou ID inválido')
          console.log('Dados do usuário:', user)
          console.log('establishment_id:', user?.establishment_id)
          console.log('Tipo do establishment_id:', typeof user?.establishment_id)
          
          // Para vendedores sem establishment_id, usar fallback
          if (user?.role === 'vendedor' || user?.role === 'gerente') {
            console.log('🔄 Vendedor/Gerente sem establishment_id, usando fallback')
            setEstablishments([{
              id: 1, // ID padrão
              name: 'Loja Padrão',
              address: 'Endereço não definido',
              phone: 'Telefone não definido'
            }])
          } else {
            setEstablishments([])
            // Mostrar notificação para o usuário
            notifications.noEstablishment()
          }
        }
      }
    } catch (error) {
      console.error('Erro detalhado ao buscar estabelecimentos:', error)
      console.error('Tipo do erro:', typeof error)
      console.error('Mensagem do erro:', error instanceof Error ? error.message : 'Erro desconhecido')
      
      // Verificar se é erro de autenticação
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any
        console.error('Status HTTP:', axiosError.response?.status)
        console.error('Dados da resposta:', axiosError.response?.data)
        
        // Se for erro 401, pode ser token expirado
        if (axiosError.response?.status === 401) {
          console.error('Token pode ter expirado ou ser inválido')
          // Limpar token e redirecionar para login
          localStorage.removeItem('auth_token')
          window.location.href = '/login'
        }
      }
      
      // Em caso de erro, usar fallback baseado no tipo de usuário
      if (user?.role === 'vendedor' || user?.role === 'gerente') {
        console.log('🔄 Erro para vendedor/gerente, usando fallback')
        setEstablishments([{
          id: 1,
          name: 'Loja Padrão',
          address: 'Endereço não definido',
          phone: 'Telefone não definido'
        }])
      } else {
        setEstablishments([])
      }
    }
  }

  // Função para buscar estatísticas gerais do dashboard
  const fetchDashboardStatsData = async () => {
    try {
      console.log('🔍 fetchDashboardStatsData: Iniciando busca de estatísticas gerais...')
      
      let params: any = {}
      
      // Aplicar filtros baseados no role do usuário
      if (isGestorLevelRole(user?.role) || user?.email === 'admin@tim.com.br' || user?.name?.includes('Administrador')) {
        console.log('👑 Usuário gestor/master/admin, buscando todas as estatísticas')
      } else if (user?.role === 'gerente' && user?.establishment_id) {
        console.log('👤 Usuário gerente, filtrando por estabelecimento:', user.establishment_id)
        params.establishment_id = user.establishment_id
      } else if (user?.role === 'vendedor' && user?.id) {
        console.log('👤 Usuário vendedor, filtrando por vendedor:', user.id)
        params.seller_id = user.id
      }
      
      const response = await apiService.getDashboardStats(params)
      console.log('📥 Resposta da API de estatísticas:', response)
      
      if (response.data) {
        const data = response.data
        console.log('📊 Dados de estatísticas recebidos:', data)
        
        setStats(prev => ({
          ...prev,
          vendedoresAtivos: data.vendedores_ativos || 0,
          faturamentoHoje: data.faturamento_mes_atual || 0
        }))

        setAniversariantes(Array.isArray(data.aniversariantes_do_mes) ? data.aniversariantes_do_mes : [])
        
        console.log('✅ Estatísticas atualizadas no estado')
      } else {
        console.log('⚠️ Nenhum dado de estatísticas encontrado')
      }
    } catch (error: any) {
      console.error('❌ Erro ao buscar estatísticas:', error)
      
      if (error.response?.status === 403) {
        console.error('🚫 Acesso negado: Você só pode ver estatísticas da sua loja')
      } else {
        console.error('❌ Erro geral ao carregar estatísticas:', error.message)
      }
    }
  }

  // Função para buscar estatísticas gerais
  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      
      // Buscar estabelecimentos primeiro
      await fetchEstablishments()
      
      // Buscar estatísticas gerais (faturamento do mês e vendedores ativos)
      await fetchDashboardStatsData()
      
      // Buscar vendas de hoje (para variação)
      await fetchTodaySales()
      
      // Buscar dados de faturamento por categoria
      await fetchFaturamentoData()
      
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
      notifications.custom.error('Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }



  useEffect(() => {
    if (user && user.id) {
      console.log('Usuário autenticado, iniciando carregamento do dashboard:', user)
      fetchDashboardStats()
    } else {
      console.log('Usuário não autenticado ou dados incompletos:', user)
    }
  }, [user])

  const statsData = [
  {
    title: "Vendas Hoje",
      value: loading ? "..." : stats.vendasHoje.toString(),
      change: loading ? "..." : (() => {
        if (stats.variacaoVendas > 0) {
          return `+${stats.variacaoVendas.toFixed(1)}%`
        } else if (stats.variacaoVendas < 0) {
          return `${stats.variacaoVendas.toFixed(1)}%`
        } else {
          return "0%"
        }
      })(),
    icon: ShoppingCart,
    color: "text-blue-600",
  },
  {
    title: "Faturamento do Mês",
      value: loading ? "..." : `${stats.faturamentoHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: "Mensal", // Faturamento acumulado do mês
    icon: Coins,
    color: "text-green-600",
  },
  {
    title: "Meta do Mês",
      value: "0%", // Meta zerada conforme solicitado
      change: "Não definida",
    icon: Target,
      color: "text-gray-500",
  },
  {
    title: "Vendedores Ativos",
      value: loading ? "..." : stats.vendedoresAtivos.toString(),
      change: (isGestorLevelRole(user?.role) || user?.email === 'admin@tim.com.br' || user?.name?.includes('Administrador')) ? `${establishments.length} lojas` : "Sua loja",
    icon: Users,
    color: "text-purple-600",
  },
  {
    title: "Faturamento Serviço",
    value: loading ? "..." : `R$ ${stats.faturamentoServico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    change: loading ? "..." : (() => {
      const quantity = stats.quantidadeVendasServico
      const variation = stats.variacaoServico
      const variationText = variation >= 0 ? `+${variation.toFixed(1)}%` : `${variation.toFixed(1)}%`
      return `${quantity} ${quantity === 1 ? 'venda' : 'vendas'} • ${variationText}`
    })(),
    icon: Wifi,
    color: "text-blue-600",
  },
  {
    title: "Faturamento Chip",
    value: loading ? "..." : `R$ ${stats.faturamentoChip.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    change: loading ? "..." : (() => {
      const quantity = stats.quantidadeVendasChip
      const variation = stats.variacaoChip
      const variationText = variation >= 0 ? `+${variation.toFixed(1)}%` : `${variation.toFixed(1)}%`
      return `${quantity} ${quantity === 1 ? 'venda' : 'vendas'} • ${variationText}`
    })(),
    icon: Smartphone,
    color: "text-green-600",
  },
  {
    title: "Faturamento Aparelho",
    value: loading ? "..." : `R$ ${stats.faturamentoAparelho.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    change: loading ? "..." : (() => {
      const quantity = stats.quantidadeVendasAparelho
      const variation = stats.variacaoAparelho
      const variationText = variation >= 0 ? `+${variation.toFixed(1)}%` : `${variation.toFixed(1)}%`
      return `${quantity} ${quantity === 1 ? 'venda' : 'vendas'} • ${variationText}`
    })(),
    icon: Smartphone,
    color: "text-purple-600",
  },
  {
    title: "Faturamento Acessório",
    value: loading ? "..." : `R$ ${stats.faturamentoAcessorio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    change: loading ? "..." : (() => {
      const quantity = stats.quantidadeVendasAcessorio
      const variation = stats.variacaoAcessorio
      const variationText = variation >= 0 ? `+${variation.toFixed(1)}%` : `${variation.toFixed(1)}%`
      return `${quantity} ${quantity === 1 ? 'venda' : 'vendas'} • ${variationText}`
    })(),
    icon: Headphones,
    color: "text-orange-600",
  },
]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Bem-vindo ao Sistema TIM</h2>
        <p className="text-muted-foreground">Visão geral das operações comerciais das 7 lojas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {statsData.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-background dark:from-violet-950/30 dark:border-violet-800/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cake className="w-5 h-5 text-violet-600" />
            Aniversariantes do mês
            <span className="text-sm font-normal text-muted-foreground">
              ({new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aniversariantes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Nenhum colaborador com data de nascimento neste mês no teu âmbito, ou as fichas ainda não têm data de nascimento preenchida.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {aniversariantes.map((p) => {
                const hoje = new Date()
                const aniversarioHoje =
                  p.day_of_month != null && p.day_of_month === hoje.getDate()

                return (
                <li
                  key={p.id}
                  className="flex flex-col rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-foreground inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span>Dia {p.day_of_month ?? '—'} —</span>
                    {aniversarioHoje ? (
                      <Cake className="w-4 h-4 shrink-0 text-pink-500" aria-label="Aniversário hoje" />
                    ) : null}
                    <span>{p.name}</span>
                  </span>
                  {p.establishment_name ? (
                    <span className="text-xs text-muted-foreground truncate">{p.establishment_name}</span>
                  ) : null}
                </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Vendas Recentes (Mês Atual)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSales.length > 0 ? (
                recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{sale.vendedor}</p>
                    <p className="text-sm text-muted-foreground">
                      {sale.produto} • {sale.loja}
                    </p>
                  </div>
                    <div className="font-semibold text-foreground">
                      R$ {sale.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-muted-foreground">Nenhuma venda no mês atual</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <TopLojasCard />
      </div>
    </div>
  )
}
