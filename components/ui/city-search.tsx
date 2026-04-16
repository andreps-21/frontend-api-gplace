// components/ui/city-search.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, MapPin } from 'lucide-react'
import { apiService, City } from '@/lib/api'

interface CitySearchProps {
  value: string
  onCitySelect: (city: City) => void
  onStateChange: (state: string) => void
  placeholder?: string
  label?: string
  required?: boolean
  selectedCity?: City | null // Cidade pré-selecionada (para seleção automática)
}

export default function CitySearch({ 
  value, 
  onCitySelect, 
  onStateChange, 
  placeholder = "Digite o nome da cidade...",
  label = "Cidade",
  required = false,
  selectedCity: externalSelectedCity
}: CitySearchProps) {
  const [searchTerm, setSearchTerm] = useState(value || '')
  const [cities, setCities] = useState<City[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Sincronizar com cidade externa (seleção automática)
  useEffect(() => {
    if (externalSelectedCity && externalSelectedCity.id > 0) {
      console.log('🔄 CitySearch: Cidade externa recebida, selecionando automaticamente:', externalSelectedCity)
      setSelectedCity(externalSelectedCity)
      setSearchTerm(externalSelectedCity.title)
      setShowResults(false) // Fechar dropdown
      setCities([]) // Limpar lista de cidades
      // Não chama onCitySelect aqui para evitar loop infinito
    }
  }, [externalSelectedCity])

  // Sincronizar com o value prop
  useEffect(() => {
    if (value && value !== searchTerm && !externalSelectedCity) {
      console.log('🔄 CitySearch: Sincronizando com value prop:', value)
      setSearchTerm(value)
      // Não cria cidade fake se já temos uma selecionada
      if (!selectedCity || selectedCity.id === 0) {
        setSelectedCity({
          id: 0,
          title: value,
          state_id: 0,
          letter: '',
          lat: '',
          long: '',
          created_at: '',
          updated_at: ''
        })
      }
    }
  }, [value, externalSelectedCity, selectedCity])

  // Buscar cidades quando o termo de busca muda
  useEffect(() => {
    // Se já temos uma cidade selecionada e o termo corresponde a ela, não buscar
    if (selectedCity && selectedCity.id > 0 && searchTerm === selectedCity.title) {
      setCities([])
      setShowResults(false)
      return
    }

    if (searchTerm.length < 2) {
      setCities([])
      setShowResults(false)
      return
    }

    // Debounce da busca
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(async () => {
      await searchCities(searchTerm)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm, selectedCity])

  // Fechar resultados quando clica fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current && 
        !resultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchCities = async (term: string) => {
    // Verificar se term é uma string válida
    if (!term || typeof term !== 'string' || term.length < 2) return

    // Se já temos uma cidade selecionada e o termo corresponde a ela, não buscar
    if (selectedCity && selectedCity.id > 0 && term.trim().toLowerCase() === selectedCity.title?.toLowerCase().trim()) {
      console.log('✅ Cidade já selecionada, não buscando:', selectedCity.title)
      setCities([])
      setShowResults(false)
      return
    }

    setIsLoading(true)
    try {
      console.log('🔍 Buscando cidades para:', term)
      
      // Usar o método getCities da API
      const response = await apiService.getCities()
      console.log('📡 Resposta da API de cidades:', response)
      
      // Filtrar cidades localmente baseado no termo de busca
      const allCities = response.data || []
      console.log('📊 Total de cidades carregadas:', allCities.length)
      console.log('🔍 Primeira cidade como exemplo:', allCities[0])
      
      const filteredCities = allCities.filter((city: City) => {
        const cityName = city.title?.toLowerCase() || ''
        const searchTerm = typeof term === 'string' ? term.toLowerCase() : ''
        
        const matches = cityName.includes(searchTerm)
        
        if (matches) {
          console.log('✅ Cidade encontrada:', city.title)
        }
        
        return matches
      }).slice(0, 10) // Limitar a 10 resultados
      
      console.log('🏙️ Cidades filtradas:', filteredCities)
      setCities(filteredCities)
      // Só mostrar resultados se não tivermos uma cidade já selecionada
      if (!selectedCity || selectedCity.id === 0) {
        setShowResults(true)
      }
    } catch (error: any) {
      console.error('❌ Erro ao buscar cidades:', error)
      console.error('❌ Status do erro:', error.response?.status)
      console.error('❌ Dados do erro:', error.response?.data)
      setCities([])
      setShowResults(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCitySelect = (city: City) => {
    console.log('✅ Cidade selecionada:', city)
    console.log('🗺️ Estado da cidade:', city.letter)
    
    setSelectedCity(city)
    setSearchTerm(city.title)
    setShowResults(false)
    onCitySelect(city)
    onStateChange(city.letter || '') // Usar o código do estado da cidade
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchTerm(newValue)
    
    // Se limpar o campo, limpar também a cidade selecionada
    if (newValue === '') {
      setSelectedCity(null)
      onCitySelect({ id: 0, title: '', state_id: 0, letter: '', lat: '', long: '', created_at: '', updated_at: '' })
      onStateChange('')
    }
  }

  const handleInputFocus = () => {
    // Se já temos uma cidade selecionada, não mostrar resultados ao focar
    if (selectedCity && selectedCity.id > 0) {
      setShowResults(false)
      return
    }
    if (cities.length > 0) {
      setShowResults(true)
    }
  }

  return (
    <div className="relative">
      <Label htmlFor="city-search" className="text-sm font-medium text-gray-700">
        {label} {required && '*'}
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id="city-search"
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="pl-10 pr-4"
          required={required}
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Resultados da busca */}
      {showResults && cities.length > 0 && (
        <div
          ref={resultsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {cities.map((city) => (
            <div
              key={city.id}
              onClick={() => handleCitySelect(city)}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {city.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    ID: {city.id}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mensagem quando não há resultados */}
      {showResults && cities.length === 0 && !isLoading && searchTerm.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4">
          <p className="text-sm text-gray-500 text-center">
            Nenhuma cidade encontrada para "{searchTerm}"
          </p>
        </div>
      )}
    </div>
  )
}
