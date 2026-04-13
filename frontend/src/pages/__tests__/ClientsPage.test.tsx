import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { useClients } from '@/hooks/use-crm-data'
import ClientsPage from '@/pages/ClientsPage'

// Mock the hooks
vi.mock('@/hooks/use-crm-data', () => ({
  useClients: vi.fn(),
}))

vi.mock('@/hooks/use-list-preferences', () => ({
  useListPreferences: vi.fn(() => ({
    orderedItems: [],
    pinnedIds: new Set(),
    togglePin: vi.fn(),
    move: vi.fn(),
  })),
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const mockClients = [
  {
    id: 1,
    name: 'Acme Corp',
    industry: 'Technology',
    manager: 'John Doe',
    status: 'active',
    revenue: '$50,000',
    location: 'San Francisco',
    avatar: 'AC',
    tier: 'Enterprise',
    healthScore: 95,
    nextAction: 'Renewal call',
    segment: 'Renewal',
    email: 'contact@acme.com',
    phone: '+1-555-0101',
    company: 'Acme Corp',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-03-20T14:30:00Z',
  },
  {
    id: 2,
    name: 'Beta Inc',
    industry: 'Finance',
    manager: 'Jane Smith',
    status: 'pending',
    revenue: '$25,000',
    location: 'New York',
    avatar: 'BI',
    tier: 'Growth',
    healthScore: 78,
    nextAction: 'Follow up',
    segment: 'New Business',
    email: 'ops@beta.com',
    phone: '+1-555-0102',
    company: 'Beta Inc',
    createdAt: '2026-02-01T09:00:00Z',
    updatedAt: '2026-03-25T16:45:00Z',
  },
]

describe('ClientsPage', () => {
  beforeEach(() => {
    vi.mocked(useClients).mockReturnValue({
      data: mockClients,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useClients>)
  })

  it('renders clients page title', async () => {
    render(<ClientsPage />)
    
    const h1 = document.querySelector('h1');
    expect(h1).toBeInTheDocument();
    expect(h1?.textContent).toContain('Client');
    expect(h1?.textContent).toContain('Accounts');
  })

  it('shows loading state', () => {
    vi.mocked(useClients).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useClients>)
    
    render(<ClientsPage />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders search input with correct placeholder', () => {
    render(<ClientsPage />)
    
    const searchInput = screen.getByPlaceholderText(/search accounts, industries, or owners/i)
    expect(searchInput).toBeInTheDocument()
  })

  it('renders status filter dropdown', () => {
    render(<ClientsPage />)
    
    const statusFilter = screen.getByDisplayValue('All statuses')
    expect(statusFilter).toBeInTheDocument()
  })

  it('allows typing in search input', async () => {
    render(<ClientsPage />)
    
    const searchInput = screen.getByPlaceholderText(/search accounts, industries, or owners/i)
    fireEvent.change(searchInput, { target: { value: 'Acme' } })
    
    expect(searchInput).toHaveValue('Acme')
  })

  it('shows client statistics', () => {
    render(<ClientsPage />)
    
    expect(screen.getByText('Total Accounts')).toBeInTheDocument()
    expect(screen.getByText('Add Client')).toBeInTheDocument()
  })
})
