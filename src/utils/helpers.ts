export function generateReferenceNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substr(2, 4).toUpperCase()
  return `SG-${year}${month}${day}-${random}`
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function suggestCategory(description: string): string {
  const text = description.toLowerCase()
  
  if (text.includes('safety') || text.includes('hazard') || text.includes('accident')) {
    return 'safety'
  }
  if (text.includes('welfare') || text.includes('benefit') || text.includes('health') || text.includes('leave')) {
    return 'employee_welfare'
  }
  if (text.includes('technology') || text.includes('software') || text.includes('system') || text.includes('computer') || text.includes('app')) {
    return 'technology'
  }
  if (text.includes('customer') || text.includes('service')) {
    return 'customer_service'
  }
  if (text.includes('cost') || text.includes('save') || text.includes('budget') || text.includes('expense')) {
    return 'cost_reduction'
  }
  if (text.includes('workplace') || text.includes('office') || text.includes('environment') || text.includes('facility')) {
    return 'workplace_improvement'
  }
  
  return 'other'
}
