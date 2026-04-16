"use client"

import { useState, useEffect } from 'react'
import { apiService, Establishment } from '@/lib/api'

export function EstablishmentsTest() {
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadEstablishments = async () => {
      try {
        setLoading(true)
        const response = await apiService.getEstablishments()
        setEstablishments(response.data.data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadEstablishments()
  }, [])

  if (loading) return <div>Carregando estabelecimentos...</div>
  if (error) return <div>Erro: {error}</div>

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Estabelecimentos TIM</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {establishments.map((establishment) => (
          <div key={establishment.id} className="border rounded-lg p-4 shadow">
            <h3 className="font-semibold text-lg">{establishment.name}</h3>
            <p className="text-gray-600">{establishment.cnpj}</p>
            <p className="text-sm text-gray-500">{establishment.city}, {establishment.state}</p>
            <p className="text-sm text-gray-500">{establishment.address}</p>
            <p className="text-sm text-gray-500">{establishment.phone}</p>
            <p className="text-sm text-gray-500">{establishment.email}</p>
            <span className={`inline-block px-2 py-1 rounded text-xs ${
              establishment.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {establishment.is_active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}












