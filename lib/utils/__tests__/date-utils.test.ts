import { getIncompleteStartDateStr } from '../date-utils'

describe('getIncompleteStartDateStr', () => {
  // Mock the current date to ensure consistent test results
  const mockDate = new Date('2024-01-24')
  
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(mockDate)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns date from 7 days ago for week range', () => {
    const result = getIncompleteStartDateStr('week')
    expect(result).toBe('2024-01-17')
  })

  it('returns date from 1 month ago for month range', () => {
    const result = getIncompleteStartDateStr('month')
    expect(result).toBe('2023-12-24')
  })

  it('returns date from 1 year ago for year range', () => {
    const result = getIncompleteStartDateStr('year')
    expect(result).toBe('2023-01-24')
  })

  it('returns today for all range', () => {
    const result = getIncompleteStartDateStr('all')
    expect(result).toBe('2024-01-24')
  })

  it('returns today for unknown range (default case)', () => {
    // @ts-expect-error Testing invalid input
    const result = getIncompleteStartDateStr('invalid')
    expect(result).toBe('2024-01-24')
  })
}) 