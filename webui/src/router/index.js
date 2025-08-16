import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
    history: createWebHistory('/'),
    routes: [
        {
            path: '/',
            redirect: '/404'
        },
        {
            path: '/404',
            name: 'NotFound',
            component: () => import('@/views/404.vue')
        },
        {
            path: '/:pathMatch(.*)*',
            name: 'CatchAll',
            redirect: '/404'
        }
    ]
})

export default router
