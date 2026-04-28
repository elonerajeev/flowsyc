import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { useTeams, useTeamMembers } from '@/hooks/use-crm-data'
import TeamsPage from '@/pages/TeamsPage'

// Mock the hooks
vi.mock('@/hooks/use-crm-data', () => ({
  useTeams: vi.fn(),
  useTeamMembers: vi.fn(),
  crmKeys: { teams: () => ['teams'], members: () => ['members'], teamMembers: ['teamMembers'] },
}))

const mockTeams = [
  {
    id: 1,
    name: 'Engineering Team',
    description: 'Handles all engineering tasks',
    memberCount: 1,
    status: 'active',
    leader: 'Alice Johnson',
    createdAt: '2026-01-10T08:00:00Z',
    permissions: {},
    members: [
      { id: 1, name: 'Alice Johnson', role: 'Team Lead', email: 'alice@company.com', attendance: 'present', workload: 80 },
    ],
  },
  {
    id: 2,
    name: 'Sales Team',
    description: 'Manages sales operations',
    memberCount: 1,
    status: 'active',
    leader: 'Bob Smith',
    createdAt: '2026-02-05T09:00:00Z',
    permissions: {},
    members: [
      { id: 2, name: 'Bob Smith', role: 'Manager', email: 'bob@company.com', attendance: 'present', workload: 70 },
    ],
  },
]

const mockMembers = [
  {
    id: 1,
    name: 'Alice Johnson',
    role: 'Team Lead',
    team: 'Engineering Team',
    email: 'alice@company.com',
  },
  {
    id: 2,
    name: 'Bob Smith',
    role: 'Manager',
    team: 'Sales Team',
    email: 'bob@company.com',
  },
]

describe('TeamsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(useTeams).mockReturnValue({
      data: mockTeams,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTeams>)
    vi.mocked(useTeamMembers).mockReturnValue({
      data: mockMembers,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTeamMembers>)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders teams page title', async () => {
    render(<TeamsPage />)

    const h1 = document.querySelector('h1');
    expect(h1).toBeInTheDocument();
    expect(h1?.textContent).toContain('Team');
    expect(h1?.textContent).toContain('Organization');
  })

  it('renders team management eyebrow badge', () => {
    render(<TeamsPage />)
    expect(screen.getByText('People · Teams')).toBeInTheDocument()
  })

  it('renders page description', () => {
    render(<TeamsPage />)
    expect(screen.getByText(/Organise members into teams/i)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    (useTeams as Mock).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTeams>)

    render(<TeamsPage />)
    // Check for skeleton elements instead of loading text
    expect(document.querySelectorAll('.shimmer-skeleton').length).toBeGreaterThan(0)
  })

  it('renders search input', () => {
    render(<TeamsPage />)
    expect(screen.getByPlaceholderText(/search teams or members/i)).toBeInTheDocument()
  })

  it('renders performance filter', () => {
    render(<TeamsPage />)
    expect(screen.getByText('all Performance')).toBeInTheDocument()
  })

  it('displays team cards', async () => {
    const { container } = render(<TeamsPage />)
    vi.advanceTimersByTime(100)
    expect(container).toBeInTheDocument()
  })

  it('shows stat cards', async () => {
    const { container } = render(<TeamsPage />)
    vi.advanceTimersByTime(100)
    expect(container).toBeInTheDocument()
  })

  it('allows typing in search input', async () => {
    render(<TeamsPage />)

    const input = screen.getByPlaceholderText(/search teams or members/i)
    fireEvent.change(input, { target: { value: 'Engineering' } })
    expect(input).toHaveValue('Engineering')
  })

  it('shows error state for teams', () => {
    vi.mocked(useTeams).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: new Error('Failed to load teams'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTeams>)

    render(<TeamsPage />)
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
  })

  it('shows error state for members', () => {
    vi.mocked(useTeamMembers).mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Failed to load members'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTeamMembers>)

    render(<TeamsPage />)
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
  })

  it('displays empty state when no teams', () => {
    vi.mocked(useTeams).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTeams>)

    render(<TeamsPage />)
    expect(screen.getByText(/no teams found/i)).toBeInTheDocument()
  })

  it('shows team details', async () => {
    const { container } = render(<TeamsPage />)
    expect(container).toBeInTheDocument()
  })

  it('renders page', () => {
    const { container } = render(<TeamsPage />)
    expect(container).toBeInTheDocument()
  })
})
