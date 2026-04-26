import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { useInfiniteQuery } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import ClientsPage from '@/pages/ClientsPage'

vi.mock('@/hooks/use-crm-data', async (importActual) => {
  const actual = await importActual<typeof import('@/hooks/use-crm-data')>()
  return { ...actual }
})

vi.mock('@/hooks/use-list-preferences', () => ({
  useListPreferences: vi.fn((key, items) => ({
    orderedItems: items || [],
    pinnedIds: [],
    togglePin: vi.fn(),
    move: vi.fn(),
  })),
}))

vi.mock('@/services/crm', () => ({
  crmService: {
    getClientsPage: vi.fn(),
    removeClient: vi.fn(),
    recalculateClientHealth: vi.fn(),
    exportClients: vi.fn(),
  },
}))

const mockInfiniteData = {
  pages: [{ data: [] as never[], pagination: { total: 0, page: 1, limit: 50, totalPages: 1 } }],
  pageParams: [undefined],
}

vi.mock('@tanstack/react-query', async (importActual) => {
  const actual = await importActual<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useInfiniteQuery: vi.fn(),
  }
})

// Use actual mock data structure from your app
const mockClientsData = [
  {
    id: 1,
    name: "Acme Corporation",
    industry: "Technology",
    manager: "Sarah Johnson",
    status: "active",
    revenue: "$45,000",
    location: "San Francisco, CA",
    avatar: "AC",
    tier: "Enterprise",
    healthScore: 92,
    nextAction: "Renewal prep call",
    segment: "Renewal",
    email: "contact@acme.com",
    phone: "+1-555-0101",
    company: "Acme Corporation",
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-03-20T14:30:00Z",
  },
  {
    id: 2,
    name: "GlobalTech Inc",
    industry: "Finance",
    manager: "Mike Chen",
    status: "active",
    revenue: "$82,000",
    location: "New York, NY",
    avatar: "GT",
    tier: "Strategic",
    healthScore: 88,
    nextAction: "Multi-region rollout",
    segment: "Expansion",
    email: "hello@globaltech.com",
    phone: "+1-555-0102",
    company: "GlobalTech Inc",
    createdAt: "2026-01-20T09:00:00Z",
    updatedAt: "2026-03-24T16:45:00Z",
  },
  {
    id: 3,
    name: "StartUp Labs",
    industry: "Healthcare",
    manager: "Emily Davis",
    status: "pending",
    revenue: "$12,000",
    location: "Austin, TX",
    avatar: "SL",
    tier: "Growth",
    healthScore: 71,
    nextAction: "Finalize onboarding docs",
    segment: "New Business",
    email: "team@startuplabs.com",
    phone: "+1-555-0103",
    company: "StartUp Labs",
    createdAt: "2026-02-01T11:00:00Z",
    updatedAt: "2026-03-22T12:15:00Z",
  }
]

describe('ClientsPage - Real App Logic', () => {
  beforeEach(async () => {
    const { useInfiniteQuery } = await import('@tanstack/react-query')
    vi.mocked(useInfiniteQuery).mockReturnValue({
      data: { pages: [{ data: mockClientsData, pagination: { total: mockClientsData.length, page: 1, limit: 50, totalPages: 1 } }], pageParams: [undefined] },
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useInfiniteQuery>)
  })

  it('renders page with correct title and description', () => {
    render(<ClientsPage />)
    
    const h1 = document.querySelector('h1');
    expect(h1).toBeInTheDocument();
    expect(h1?.textContent).toContain('Client');
    expect(h1?.textContent).toContain('Accounts');
    expect(screen.getByText(/Track account health/i)).toBeInTheDocument()
  })

  it('displays client statistics correctly', () => {
    render(<ClientsPage />)
    
    // Should show total accounts count
    expect(screen.getByText('Total Accounts')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument() // 3 mock clients
    
    // Should show Add Client button
    expect(screen.getByText('Add Client')).toBeInTheDocument()
  })

  it('renders search functionality with correct placeholder', () => {
    render(<ClientsPage />)
    
    const searchInput = screen.getByPlaceholderText(/search accounts, industries, or owners/i)
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveValue('')
  })

  it('renders status filter with all options', () => {
    render(<ClientsPage />)
    
    const statusSelect = screen.getByDisplayValue('All statuses')
    expect(statusSelect).toBeInTheDocument()
    
    // Check if options exist
    expect(screen.getByText('All statuses')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('allows search input interaction', async () => {
    render(<ClientsPage />)
    
    const searchInput = screen.getByPlaceholderText(/search accounts, industries, or owners/i)
    
    fireEvent.change(searchInput, { target: { value: 'Acme' } })
    expect(searchInput).toHaveValue('Acme')
    
    fireEvent.change(searchInput, { target: { value: 'Technology' } })
    expect(searchInput).toHaveValue('Technology')
  })

  it('allows status filter interaction', () => {
    render(<ClientsPage />)
    
    const statusSelect = screen.getByDisplayValue('All statuses')
    
    fireEvent.change(statusSelect, { target: { value: 'active' } })
    expect(statusSelect).toHaveValue('active')
    
    fireEvent.change(statusSelect, { target: { value: 'pending' } })
    expect(statusSelect).toHaveValue('pending')
  })

  it('shows loading state correctly', async () => {
    const { useInfiniteQuery } = await import('@tanstack/react-query')
    vi.mocked(useInfiniteQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useInfiniteQuery>)
    render(<ClientsPage />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows add client button', () => {
    render(<ClientsPage />)
    
    const addButton = screen.getByText('Add Client')
    expect(addButton).toBeInTheDocument()
    expect(addButton.closest('button')).toBeInTheDocument()
  })

  it('displays client portfolio badge', () => {
    render(<ClientsPage />)
    
    expect(screen.getByText('Portfolio')).toBeInTheDocument()
  })
})
