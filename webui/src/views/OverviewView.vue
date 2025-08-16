<script setup>
import Card from 'primevue/card'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Sample data - in a real app, this would come from your SMART monitoring API
const devices = ref([
    {
        id: 1,
        name: '/dev/sda',
        model: 'Samsung SSD 860 EVO',
        size: '500GB',
        health: 'Good',
        temperature: 35,
        powerOnHours: 8760,
        lastCheck: '2024-01-15 10:30:00'
    },
    {
        id: 2,
        name: '/dev/sdb',
        model: 'Western Digital WD Blue',
        size: '1TB',
        health: 'Warning',
        temperature: 42,
        powerOnHours: 17520,
        lastCheck: '2024-01-15 10:30:00'
    },
    {
        id: 3,
        name: '/dev/nvme0n1',
        model: 'Samsung NVMe SSD 970 EVO',
        size: '250GB',
        health: 'Good',
        temperature: 38,
        powerOnHours: 4380,
        lastCheck: '2024-01-15 10:30:00'
    }
])

const healthSeverity = (health) => {
    switch (health) {
        case 'Good': return 'success'
        case 'Warning': return 'warn'
        case 'Critical': return 'danger'
        default: return 'info'
    }
}

const viewDetails = (device) => {
    router.push(`/detail/${device.id}`)
}

onMounted(() => {
    // In a real app, fetch initial data here
    console.log('Overview view mounted')
})
</script>

<template>
    <div class="overview-container">
        <div class="page-header">
            <h1>SMART Monitor</h1>
        </div>
        
        <Card class="devices-table-card">
            <template #title>
                <div class="table-header">
                    <div class="table-header-left">
                        <i class="pi pi-list stat-icon"></i>
                        Storage Devices
                        <span class="table-stats">
                            ({{ devices.length }} total, {{ devices.filter(d => d.health === 'Warning').length }} warnings)
                        </span>
                    </div>
                    <div class="table-header-right">
                        Last check: {{ devices[0]?.lastCheck || 'N/A' }}
                    </div>
                </div>
            </template>
            <template #content>
                <DataTable 
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
                    
                    <Column field="lifespan" header="Lifespan" sortable>
                        <template #body="{ data }">
                            <div class="lifespan-cell">
                                <span>{{ Math.round((data.powerOnHours / 50000) * 100) }}%</span>
                                <ProgressBar 
                                    :value="(data.powerOnHours / 50000) * 100" 
                                    :max="100"
                                    :showValue="false"
                                    class="lifespan-progress"
                                />
                            </div>
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

.lifespan-cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.lifespan-progress {
    height: 0.5rem;
}

.detail-button {
    min-width: 80px;
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