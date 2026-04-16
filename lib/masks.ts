// Utilitários para máscaras de entrada

/**
 * Aplica máscara de CPF (000.000.000-00)
 */
export const maskCPF = (value: string): string => {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  // Aplica a máscara
  if (numbers.length <= 3) {
    return numbers
  } else if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
  } else if (numbers.length <= 9) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
  } else {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`
  }
}

/**
 * Aplica máscara de telefone brasileiro
 * Formato: (00) 00000-0000 ou (00) 0000-0000
 */
export const maskPhone = (value: string): string => {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  // Aplica a máscara baseada no tamanho
  if (numbers.length <= 2) {
    return numbers
  } else if (numbers.length <= 6) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  } else if (numbers.length <= 10) {
    // Telefone fixo: (00) 0000-0000
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  } else {
    // Celular: (00) 00000-0000
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
  }
}

/**
 * Aplica máscara de CEP (00000-000)
 */
export const maskCEP = (value: string): string => {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  // Aplica a máscara
  if (numbers.length <= 5) {
    return numbers
  } else {
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`
  }
}

/**
 * Remove máscara de CPF, retornando apenas números
 */
export const unmaskCPF = (value: string): string => {
  return value.replace(/\D/g, '')
}

/**
 * Aplica máscara de CNPJ (00.000.000/0001-00)
 */
export const maskCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 2) return numbers
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`
}

/**
 * Remove máscara de CNPJ, retornando apenas números
 */
export const unmaskCNPJ = (value: string): string => {
  return value.replace(/\D/g, '')
}

/**
 * Remove máscara de CPF ou CNPJ (documento genérico)
 */
export const unmaskDocument = (value: string): string => {
  return value.replace(/\D/g, '')
}

/**
 * Valida se o CNPJ tem 14 dígitos e é válido (algoritmo oficial)
 */
export const isValidCNPJ = (cnpj: string): boolean => {
  const numbers = unmaskCNPJ(cnpj)
  if (numbers.length !== 14) return false
  if (/^(\d)\1{13}$/.test(numbers)) return false
  let size = numbers.length - 2
  let numeros = numbers.substring(0, size)
  const digitos = numbers.substring(size)
  let soma = 0
  let pos = size - 7
  for (let i = size; i >= 1; i--) {
    soma += parseInt(numeros.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado !== parseInt(digitos.charAt(0))) return false
  size = size + 1
  numeros = numbers.substring(0, size)
  soma = 0
  pos = size - 7
  for (let i = size; i >= 1; i--) {
    soma += parseInt(numeros.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  return resultado === parseInt(digitos.charAt(1))
}

/**
 * Remove máscara de telefone, retornando apenas números
 */
export const unmaskPhone = (value: string): string => {
  return value.replace(/\D/g, '')
}

/**
 * Remove máscara de CEP, retornando apenas números
 */
export const unmaskCEP = (value: string): string => {
  return value.replace(/\D/g, '')
}

/**
 * Valida se o CPF tem 11 dígitos e é válido
 */
export const isValidCPF = (cpf: string): boolean => {
  const numbers = unmaskCPF(cpf)
  
  // Verifica se tem 11 dígitos
  if (numbers.length !== 11) {
    return false
  }
  
  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1{10}$/.test(numbers)) {
    return false
  }
  
  // Validação do primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i)
  }
  let remainder = sum % 11
  let firstDigit = remainder < 2 ? 0 : 11 - remainder
  
  if (parseInt(numbers[9]) !== firstDigit) {
    return false
  }
  
  // Validação do segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i)
  }
  remainder = sum % 11
  let secondDigit = remainder < 2 ? 0 : 11 - remainder
  
  return parseInt(numbers[10]) === secondDigit
}

/**
 * Valida se o telefone tem pelo menos 10 dígitos
 */
export const isValidPhone = (phone: string): boolean => {
  const numbers = unmaskPhone(phone)
  return numbers.length >= 10 && numbers.length <= 11
}

/**
 * Valida se o CEP tem 8 dígitos
 */
export const isValidCEP = (cep: string): boolean => {
  const numbers = unmaskCEP(cep)
  return numbers.length === 8
}

/**
 * Aplica máscara de valor monetário brasileiro (R$ 0,00)
 */
export const maskCurrency = (value: string): string => {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  if (numbers.length === 0) {
    return ''
  }
  
  // Converte para centavos
  const amount = parseInt(numbers) / 100
  
  // Formata como moeda brasileira
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Remove máscara de valor monetário, retornando apenas números
 */
export const unmaskCurrency = (value: string): string => {
  // Remove tudo que não é dígito
  return value.replace(/\D/g, '')
}

/**
 * Converte valor formatado para número
 */
export const parseCurrency = (value: string): number => {
  const numbers = unmaskCurrency(value)
  return numbers.length > 0 ? parseInt(numbers) / 100 : 0
}

/**
 * Formata número como moeda brasileira
 */
export const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}


