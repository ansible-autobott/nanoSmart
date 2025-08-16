import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import axios from 'axios'
import { unref, computed } from 'vue'

const API_BASE_URL = import.meta.env.VITE_SERVER_URL_V0
const ENTRIES_ENDPOINT = `${API_BASE_URL}/fin/entries`

function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date)) return ''

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Fetches entries from the API with date range filtering and optional account filtering
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @param {Array} accountIds - Optional array of account IDs to filter by
 * @returns {Promise<Entry[]>}
 */
const fetchEntries = async (startDate, endDate, accountIds = []) => {
    const params = new URLSearchParams({
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
    })
    
    // Add account IDs to params if provided
    if (accountIds && accountIds.length > 0) {
        accountIds.forEach(id => params.append('accountIds', id));
    }
    
    const { data } = await axios.get(`${ENTRIES_ENDPOINT}?${params}`)
    return data.items || []
}

/**
 * Creates a new entry
 * @param {CreateEntryDTO} entryData
 * @returns {Promise<Entry>}
 */
const createEntry = async (entryData) => {
    const { data } = await axios.post(ENTRIES_ENDPOINT, entryData)
    return data
}

/**
 * Updates an existing entry
 * @param {UpdateEntryDTO} entryData
 * @returns {Promise<Entry>}
 */
const updateEntry = async (entryData) => {
    const { data } = await axios.put(`${ENTRIES_ENDPOINT}/${entryData.id}`, entryData)
    return data
}

/**
 * Deletes an entry
 * @param {string} id - Entry ID
 * @returns {Promise<void>}
 */
const deleteEntry = async (id) => {
    await axios.delete(`${ENTRIES_ENDPOINT}/${id}`)
}

export function useEntries(startDateRef, endDateRef, accountIdsRef = null) {
    const queryClient = useQueryClient()

    const queryKey = computed(() => {
        const start = unref(startDateRef)
        const end = unref(endDateRef)
        const accountIds = unref(accountIdsRef)
        
        const key = ['entries']
        
        if (start && end) {
            key.push(formatDate(start), formatDate(end))
        } else {
            key.push('invalid') // fallback key to avoid undefined
        }
        
        // Add account IDs to query key if provided
        if (accountIds && accountIds.length > 0) {
            key.push('accounts', ...accountIds)
        }
        
        return key
    })

    const entriesQuery = useQuery({
        queryKey,
        enabled: computed(() => !!unref(startDateRef) && !!unref(endDateRef)),
        queryFn: () => fetchEntries(
            unref(startDateRef), 
            unref(endDateRef), 
            unref(accountIdsRef)
        )
    })

    // Mutation for creating an entry
    const createEntryMutation = useMutation({
        mutationFn: createEntry,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKey.value })
            queryClient.refetchQueries({ queryKey: queryKey.value })
        }
    })

    // Mutation for updating an entry
    const updateEntryMutation = useMutation({
        mutationFn: updateEntry,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKey.value })
            queryClient.refetchQueries({ queryKey: queryKey.value })
        }
    })

    // Mutation for deleting an entry
    const deleteEntryMutation = useMutation({
        mutationFn: deleteEntry,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKey.value })
            queryClient.refetchQueries({ queryKey: queryKey.value })
        }
    })

    return {
        // Queries
        entries: entriesQuery.data,
        isLoading: entriesQuery.isLoading,
        isError: entriesQuery.isError,
        error: entriesQuery.error,
        refetch: entriesQuery.refetch,

        // Mutations
        createEntry: createEntryMutation.mutateAsync,
        updateEntry: updateEntryMutation.mutateAsync,
        deleteEntry: deleteEntryMutation.mutateAsync,

        // Mutation states
        isCreating: createEntryMutation.isLoading,
        isUpdating: updateEntryMutation.isLoading,
        isDeleting: deleteEntryMutation.isLoading
    }
}
