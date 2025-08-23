<script setup>
import Card from 'primevue/card'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { useRouter } from 'vue-router'
import { useSmartOverview } from '@/composables/useSmartMonitor'

const router = useRouter()

// Use the SMART monitoring composable
const { 
    devices, 
    isLoading, 
    isError, 
    error, 
    refreshAll,
    totalDevices,
    warningDevices,
    lastCheck
} = useSmartOverview()


const healthSeverity = (health) => {
    switch (health) {
        case 'Good': return 'success'
        case 'Warning': return 'warn'
        case 'Critical': return 'danger'
        default: return 'info'
    }
}

const viewDetails = (device) => {
    const targetPath = `/detail/${device.id}`
    try {
        router.push(targetPath)
    } catch (error) {
        console.error('Navigation failed:', error)
    }
}
</script>

<template>
    <div class="overview-container">
        <div class="page-header">
            <h1 class="font-semibold" style="font-size: 2rem">nano SMART</h1>
        </div>
        
        <Card class="devices-table-card">
            <template #title>
                <div class="table-header">
                    <div class="table-header-left">
                        <i class="pi pi-list stat-icon"></i>
                        Storage Devices
                        <span class="table-stats">
                            ({{ totalDevices }} total, {{ warningDevices }} warnings)
                        </span>
                    </div>
                    <div class="table-header-right">
                        Last check: {{ lastCheck }}
                    </div>
                </div>
            </template>
            <template #content>
                <div v-if="isLoading" class="loading-state">
                    <i class="pi pi-spin pi-spinner" style="font-size: 2rem;"></i>
                    <p>Loading SMART data...</p>
                </div>
                
                <div v-else-if="isError" class="error-state">
                    <i class="pi pi-exclamation-triangle" style="font-size: 2rem; color: var(--c-danger-500);"></i>
                    <p>Error loading SMART data: {{ error?.message || 'Unknown error' }}</p>
                    <Button @click="refreshAll" label="Retry" icon="pi pi-refresh" />
                </div>
                
                <DataTable 
                    v-else
                    :value="devices" 
                    :rows="50"
                    responsiveLayout="scroll"
                    class="devices-table"
                >
                    <Column field="name" header="Device" sortable>
                        <template #body="{ data }">
                            <code>{{ data.name }}</code>
                        </template>
                    </Column>
                    
                    <Column field="model" header="Model" sortable></Column>
                    
                    <Column field="size" header="Size" sortable></Column>
                    
                    <Column field="health" header="Health" sortable>
                        <template #body="{ data }">
                            <Tag 
                                :value="data.health" 
                                :severity="healthSeverity(data.health)"
                            />
                        </template>
                    </Column>
                    
                    <Column field="powerOnHours" header="Power On Hours" sortable>
                        <template #body="{ data }">
                            {{ data.powerOnHours.toLocaleString() }}h
                        </template>
                    </Column>
                    
                    <Column header="Actions">
                        <template #body="{ data }">
                            <Button 
                                icon="pi pi-eye" 
                                label="Details" 
                                size="small"
                                @click="viewDetails(data)"
                                class="detail-button"
                            />
                        </template>
                    </Column>
                </DataTable>
            </template>
        </Card>
    </div>
</template>

<style scoped>
.overview-container {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
}

.page-header {
    margin-bottom: 2rem;
    text-align: center;
}

.page-header h1 {
    font-size: 2.5rem;
    color: var(--c-primary-600);
}

.devices-table-card {
    margin-bottom: 2rem;
}

.table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 1.3rem;
}

.table-header-left {
    flex-grow: 1;
}

.table-header-right {
    font-size: 1rem;
    color: var(--c-text-color-secondary);
    margin-left: 0.5rem;
}

.table-stats {
    font-size: 1rem;
    color: var(--c-text-color-secondary);
    margin-left: 0.5rem;
}

.devices-table {
    margin-top: 1rem;
}

.detail-button {
    min-width: 80px;
}

.loading-state, .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: var(--c-text-color-secondary);
    font-size: 1.1rem;
}

.loading-state i, .error-state i {
    margin-bottom: 1rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .overview-container {
        padding: 1rem;
    }
    
    .page-header h1 {
        font-size: 2rem;
    }
}
</style> 