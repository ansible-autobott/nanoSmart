import { createApp } from 'vue'
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

// focus trap
import FocusTrap from 'primevue/focustrap'
app.directive('focustrap', FocusTrap)

app.mount('#app')
