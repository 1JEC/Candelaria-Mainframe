import { describe, expect, it } from 'vitest'

import { firstForwardedIp, truncateIp } from './ip'

describe('truncateIp', () => {
  it('masks the last IPv4 octet', () => {
    expect(truncateIp('84.86.123.45')).toBe('84.86.123.xxx')
  })

  it('masks the last octet even for edge-value octets', () => {
    expect(truncateIp('1.2.3.0')).toBe('1.2.3.xxx')
    expect(truncateIp('255.255.255.255')).toBe('255.255.255.xxx')
  })

  it('collapses an IPv6 address to its first 3 groups', () => {
    expect(truncateIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(
      '2001:0db8:85a3::',
    )
  })

  it('collapses a short IPv6 address to its first 3 non-empty groups', () => {
    expect(truncateIp('2001:db8::1')).toBe('2001:db8:1::')
  })

  it('never returns a full address for malformed input', () => {
    expect(truncateIp('not-an-ip')).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(truncateIp(null)).toBeNull()
    expect(truncateIp(undefined)).toBeNull()
    expect(truncateIp('')).toBeNull()
  })

  it('never contains 4 full numeric IPv4 octets in its output', () => {
    const result = truncateIp('192.168.1.99')
    expect(result).not.toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
  })
})

describe('firstForwardedIp', () => {
  it('takes the first entry of a multi-hop header', () => {
    expect(firstForwardedIp('84.86.123.45, 10.0.0.1, 10.0.0.2')).toBe(
      '84.86.123.45',
    )
  })

  it('trims whitespace', () => {
    expect(firstForwardedIp('  84.86.123.45  ')).toBe('84.86.123.45')
  })

  it('returns null for an absent header', () => {
    expect(firstForwardedIp(null)).toBeNull()
  })
})
