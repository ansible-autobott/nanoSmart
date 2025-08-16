import { definePreset } from '@primevue/themes'
import Lara from '@primevue/themes/lara'

const CustomTheme = definePreset(Lara, {
    primitive: {
        borderRadius: {
            none: '0',
            xs: '1px',
            sm: '1px',
            md: '1px',
            lg: '1px',
            xl: '1px'
        }
    },
    semantic: {
        primary: {
            50: '{teal.50}',
            100: '{teal.100}',
            200: '{teal.200}',
            300: '{teal.300}',
            400: '{teal.400}',
            500: '{teal.500}',
            600: '{teal.600}',
            700: '{teal.700}',
            800: '{teal.800}',
            900: '{teal.900}',
            950: '{teal.950}'
        },
        focusRing: {
            width: '20px', // Adjust the width of the focus ring
            color: '{primary.color}', // Use primary color (can be customized)
            offset: '0px', // Adjust the offset of the focus ring
            boxShadow: 'none', // Remove the shadow by setting box-shadow to none
            outline: 'none'
        }
    }
})

export default CustomTheme
// --c-avatar-lg-width);
