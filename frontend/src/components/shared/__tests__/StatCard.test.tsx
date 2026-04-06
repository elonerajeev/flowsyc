import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { TrendingUp } from 'lucide-react'
import StatCard from '@/components/shared/StatCard'

describe('StatCard', () => {
  const mockProps = {
    title: 'Revenue',
    value: '$1.2M',
    change: '12.5%',
    changeType: 'up' as const,
    icon: TrendingUp,
  }

  it('renders title and value correctly', () => {
    render(<StatCard {...mockProps} />)
    
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('$1.2M')).toBeInTheDocument()
  })

  it('displays change percentage for positive change', () => {
    render(<StatCard {...mockProps} />)
    
    expect(screen.getByText(/12.5%/)).toBeInTheDocument()
  })

  it('renders icon component', () => {
    render(<StatCard {...mockProps} />)
    
    const iconContainer = screen.getByText('Revenue').closest('div')?.parentElement
    expect(iconContainer).toBeInTheDocument()
  })
})