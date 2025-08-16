import { createApp } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import App from './App.vue'
import CustomTheme from '@/theme.js'

import 'primeflex/primeflex.css'
import 'primeicons/primeicons.css'
import '@/assets/style.scss'

import PrimeVue from 'primevue/config'

const app = createApp(App)

// https://github.com/primefaces/primevue/issues/2397
// allows to use <InputText v-model="value" v-focus /> to focus on an input item
app.directive('focus', {
    mounted(el) {
        el.focus()

        setTimeout(() => {
            el.focus()
        }, 300)
    }
})

app.use(PrimeVue, {
    // Default theme configuration
    theme: {
        preset: CustomTheme,
        options: {
            prefix: 'c',
            darkModeSelector: 'system',
            cssLayer: false
        }
    },
    locale: {
        firstDayOfWeek: 1,
    }
})

// add the app router
import router from './router'
app.use(router)


// vue query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Global default settings for queries
            refetchOnWindowFocus: false, // Disable refetching when window regains focus
            retry: 3, // Number of retries if query fails
            staleTime: 1000 * 60 * 5, // Data considered fresh for 5 minutes
            cacheTime: 1000 * 60 * 30 // Cache data for 30 minutes
        },
        mutations: {
            // Global default settings for mutations
            retry: false
        }
    }
})

app.use(VueQueryPlugin, {
    queryClient
})

app.mount('#app')
