<script setup>
import Card from 'primevue/card'
import Button from 'primevue/button'
</script>

<template>
    <div class="flex align-items-center justify-content-center min-h-screen p-4">
        <Card class="w-30rem">
            <template #title>Page Not Found</template>
            <template #content>
                <div class="flex flex-column align-items-center gap-4">
                    <i
                        class="pi pi-exclamation-triangle"
                        style="font-size: 4rem; color: var(--c-warning-500)"
                    ></i>
                    <h2>404 - Page Not Found</h2>
                    <p>
                        The page you are looking for does not exist or has been
                        moved.
                    </p>
                    <Button
                        label="Go to Home"
                        icon="pi pi-home"
                        @click="$router.push('/')"
                    />
                </div>
            </template>
        </Card>
    </div>
</template>

<style scoped>
.flex {
    display: flex;
}
.flex-column {
    flex-direction: column;
}
.align-items-center {
    align-items: center;
}
.justify-content-center {
    justify-content: center;
}
.min-h-screen {
    min-height: 100vh;
}
.gap-4 {
    gap: 1rem;
}
.p-4 {
    padding: 1rem;
}
.w-30rem {
    width: 30rem;
}
</style>
