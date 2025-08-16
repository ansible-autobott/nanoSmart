import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import axios from 'axios'
import AccountProvider from '@/models/AccountProvider'
import Account from '@/models/Account'

// API Endpoints
const API_BASE_URL = import.meta.env.VITE_SERVER_URL_V0
const ACCOUNTS_ENDPOINT = `${API_BASE_URL}/fin/account`
const PROVIDER_ENDPOINT = `${API_BASE_URL}/fin/provider`

// Helper: standard response handlers
const extractData = (res) => res.data
const extractItems = (res) => res.data.items || []

// API Functions
const fetchProviders = async () => {
    const res = await axios.get(PROVIDER_ENDPOINT)
    return extractItems(res)
}

const createAccountProvider = (data) => axios.post(PROVIDER_ENDPOINT, data).then(extractData)
const updateAccountProvider = (data) =>
    axios.put(`${PROVIDER_ENDPOINT}/${data.id}`, data).then(extractData)
const deleteAccountProvider = (id) => axios.delete(`${PROVIDER_ENDPOINT}/${id}`)

const createAccount = (data) => axios.post(ACCOUNTS_ENDPOINT, data).then(extractData)
const updateAccount = (data) => axios.put(`${ACCOUNTS_ENDPOINT}/${data.id}`, data).then(extractData)
const deleteAccount = (id) => axios.delete(`${ACCOUNTS_ENDPOINT}/${id}`)

// Helper: normalize API response
const transformProviders = (data) =>
    data.map(
        (item) =>
            new AccountProvider({
                id: item.id,
                name: item.name,
                description: item.description,
                accounts: item.accounts.map(
                    (acc) =>
                        new Account({
                            id: acc.id,
                            name: acc.name,
                            currency: acc.currency,
                            type: acc.type,
                        })
                )
            })
    )

// Vue Query Hook
export function useAccounts() {
    const queryClient = useQueryClient()
    const QUERY_KEY = ['accounts']

    const invalidateAndRefetch = () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY })
        queryClient.refetchQueries({ queryKey: QUERY_KEY })
    }

    const accountsQuery = useQuery({
        queryKey: QUERY_KEY,
        queryFn: fetchProviders,
        select: transformProviders
    })

    const createAccountProviderMutation = useMutation({
        mutationFn: createAccountProvider,
        onSuccess: invalidateAndRefetch
    })

    const updateAccountProviderMutation = useMutation({
        mutationFn: updateAccountProvider,
        onSuccess: invalidateAndRefetch
    })

    const deleteAccountProviderMutation = useMutation({
        mutationFn: deleteAccountProvider,
        onSuccess: invalidateAndRefetch
    })

    const createAccountMutation = useMutation({
        mutationFn: createAccount,
        onSuccess: invalidateAndRefetch
    })

    const updateAccountMutation = useMutation({
        mutationFn: updateAccount,
        onSuccess: invalidateAndRefetch
    })

    const deleteAccountMutation = useMutation({
        mutationFn: deleteAccount,
        onSuccess: invalidateAndRefetch
    })

    return {
        // Queries
        accounts: accountsQuery.data,
        isLoading: accountsQuery.isLoading,
        isError: accountsQuery.isError,
        error: accountsQuery.error,
        refetch: accountsQuery.refetch,

        // Mutations
        createAccountProvider: createAccountProviderMutation.mutateAsync,
        updateAccountProvider: updateAccountProviderMutation.mutateAsync,
        deleteAccountProvider: deleteAccountProviderMutation.mutateAsync,

        createAccount: createAccountMutation.mutateAsync,
        updateAccount: updateAccountMutation.mutateAsync,
        deleteAccount: deleteAccountMutation.mutateAsync,

        // Mutation states
        isCreating: createAccountMutation.isLoading,
        isUpdating: updateAccountMutation.isLoading,
        isDeleting: deleteAccountMutation.isLoading || deleteAccountProviderMutation.isLoading
    }
}
