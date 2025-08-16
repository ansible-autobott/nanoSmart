import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
    history: createWebHistory('/'),
    routes: [
        {
            path: '/',
            name: 'overview',
            component: () => import('@/views/OverviewView.vue')
        },
        {
            path: '/detail/:id',
            name: 'detail',
            component: () => import('@/views/DetailView.vue')
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
