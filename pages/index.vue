<script setup lang="ts">
import axios from 'axios'
    const workspace = '5c29434c-e830-442b-b9f5-d2fb00ee7b34';
    const { data } = await useFetch(`/api/hello/${workspace}`);
    try { 
          const response = await axios.post(`/api/getOrganizationDetails`, { workspace });
          console.log(response.data);
        } catch (error) {
          console.error('Error fetching tasks:', error);
        }
</script>

<template>
  <pre>{{ data }}</pre>
</template>
