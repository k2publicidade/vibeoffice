'use client'

import { useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { Message } from '@/types/chat'

export interface MessageSearchFilters {
  senderId?: string
  roomId?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface SearchResult {
  message: Message
  matches: Array<{
    key: string
    value: string
    indices: [number, number][]
  }>
}

export function useMessageSearch(messages: Message[]) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<MessageSearchFilters>({})

  // Configure Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(messages, {
      keys: ['content', 'userId'],
      threshold: 0.3, // Lower = more strict matching
      includeMatches: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
    })
  }, [messages])

  // Perform search and apply filters
  const results = useMemo(() => {
    let filtered = messages

    // Apply filters first
    if (filters.senderId) {
      filtered = filtered.filter((m) => m.userId === filters.senderId)
    }

    if (filters.roomId) {
      filtered = filtered.filter((m) => m.roomId === filters.roomId)
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((m) => new Date(m.timestamp) >= filters.dateFrom!)
    }

    if (filters.dateTo) {
      const endOfDay = new Date(filters.dateTo)
      endOfDay.setHours(23, 59, 59, 999)
      filtered = filtered.filter((m) => new Date(m.timestamp) <= endOfDay)
    }

    // If no search term, return filtered results
    if (!searchTerm.trim()) {
      return filtered.map((message) => ({
        message,
        matches: [],
      }))
    }

    // Perform fuzzy search on filtered results
    const searchFuse = new Fuse(filtered, {
      keys: ['content'],
      threshold: 0.3,
      includeMatches: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
    })

    const fuseResults = searchFuse.search(searchTerm)

    return fuseResults.map((result) => ({
      message: result.item,
      matches: result.matches?.map((match) => ({
        key: match.key || '',
        value: match.value || '',
        indices: match.indices || [],
      })) || [],
    }))
  }, [messages, searchTerm, filters])

  return {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    results,
    resultCount: results.length,
  }
}
