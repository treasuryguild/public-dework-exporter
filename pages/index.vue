<script setup lang="ts">
  import axios from 'axios'
  const orgSNET = '5c29434c-e830-442b-b9f5-d2fb00ee7b34'
  const orgSwarm = '67bd2c66-8ee8-4e2e-a22b-6cdc5d805a85'
    
  const loaded = ref(false)
  let isCancelled = ref(false);
    
  let snet: any = ref({});
  let swarm: any = ref({});
  const isDataLoaded = ref(false);
    
  async function getOrgDetails() {
    try {
      const promises = [
        axios.post(`/api/getOrganizationDetails`, { organizationId: orgSNET }),
        axios.post(`/api/getOrganizationDetails`, { organizationId: orgSwarm })
      ];
      const [responseSNET, responseSwarm] = await Promise.all(promises);
      snet.value = responseSNET.data;
      swarm.value = responseSwarm.data;
      isDataLoaded.value = true;
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }
    
  let snetSlug = ref();
  let swarmSlug = ref()

  onMounted(async () => {
    await getOrgDetails();
    await getDework();
  });

  onBeforeUnmount(() => {
    isCancelled.value = true; 
  });

function updateObjectWithSlugs(object: any, slugs: any) {
  slugs.data.getOrganization.workspaces.forEach((workspace: any) => {
    Object.keys(object).forEach(key => {
      if (object[key].id === workspace.id) {
        object[key].name = workspace.name;
        object[key].slug = workspace.slug;
      }
    });
  });
}

async function getDeworkData(id : string) {
  const response = await axios.post(`/api/getDeworkData`, { workspace: id });
  return response.data;
}

async function getsnetWorkspaces() {
  if (isCancelled.value) return;
  
  const tasksPromises = Object.keys(snet.value).map(async key => {
    const tasks = await getDeworkData(snet.value[key].id);
return { key, tasks: tasks.data.getWorkspace.tasks };
  });

  const results = await Promise.all(tasksPromises);
  results.forEach(({ key, tasks }) => {
    snet.value[key].tasks = tasks;
  });
}

async function getswarmWorkspaces() {
  if (isCancelled.value) return;
  
  const tasksPromises = Object.keys(swarm.value).map(async key => {
    const tasks = await getDeworkData(swarm.value[key].id);
return { key, tasks: tasks.data.getWorkspace.tasks };
  });

  const results = await Promise.all(tasksPromises);
  results.forEach(({ key, tasks }) => {
    swarm.value[key].tasks = tasks;
  });
}

async function getWorkspaceSlug(id: string) {
  const response = await axios.post(`/api/getWorkspaceSlug`, { organization: id });
  return response.data;
}

async function getDework() {
  loaded.value = false;
  localStorage.removeItem("snetWorkspaces");
  localStorage.removeItem("swarmWorkspaces");
  const snetSlugs = await getWorkspaceSlug(orgSNET);
  const swarmSlugs = await getWorkspaceSlug(orgSwarm);
  snetSlug.value = snetSlugs.data.getOrganization;
  swarmSlug.value = swarmSlugs.data.getOrganization;
  updateObjectWithSlugs(snet.value, snetSlugs);
  updateObjectWithSlugs(swarm.value, swarmSlugs);
  localStorage.setItem("snetWorkspaces", JSON.stringify(snet.value));
  localStorage.setItem("swarmWorkspaces", JSON.stringify(swarm.value));
  await getTasks();
  loaded.value = true;
}

async function getTasks() {
  // Initiate both tasks simultaneously and wait for both to complete
  await Promise.all([getsnetWorkspaces()]);

  // Once both tasks are complete, update localStorage
  localStorage.setItem("snetWorkspaces", JSON.stringify(snet.value));
  localStorage.setItem("swarmWorkspaces", JSON.stringify(swarm.value));
}


function countAuditedTasks(tasks: any) {
  const auditedRegex = /\baudited\b/i;
  const fundRequestRegex = /(?=.*\bfund\b)(?=.*\brequest\b).*/i;

  return tasks.filter((task: any) => {
    return task.tags.some((tag: any) => auditedRegex.test(tag.label) || fundRequestRegex.test(tag.label));
  }).length;
}

function countNonAuditedTasks(tasks: any) {
  const auditedRegex = /\baudited\b/i;
  const fundRequestRegex = /(?=.*\bfund\b)(?=.*\brequest\b).*/i;

  return tasks.filter((task: any) => {
    return !task.tags.some((tag: any) => auditedRegex.test(tag.label) || fundRequestRegex.test(tag.label));
  }).length;
}

const isAuditedTasksLoaded = (workspace: any) => {
  return countAuditedTasks(workspace.tasks) > 0;
};
function hasNonAuditedTasks(workspace: any) {
  return countNonAuditedTasks(workspace.tasks) > 0;
}
const isWorkspaceReady = computed(() => {
  return (workspace: any) => {
    return !hasNonAuditedTasks(workspace);
  };
});

function openLink(id: any) {
  let workspaceSlug = '';
  let organizationSlug = '';
  for ( let i in snetSlug.value.workspaces) {
    if (snetSlug.value.workspaces[i].id == id) {
      organizationSlug = snetSlug.value.slug
      workspaceSlug = snetSlug.value.workspaces[i].slug
    }
  }
  for ( let i in swarmSlug.value.workspaces) {
    if (swarmSlug.value.workspaces[i].id == id) {
      organizationSlug = swarmSlug.value.slug
      workspaceSlug = swarmSlug.value.workspaces[i].slug
    }
  }
  window.open(`https://app.dework.xyz/${organizationSlug}/${workspaceSlug}/view/board`, "_blank");
}

function getChargeMonth(task: any) {
  // Format a date to "dd.mm.yy"
  const formatDate = (date: any) => {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).toString().substr(-2)}`;
  };

  // Check if the auditLog is empty
  if (task.auditLog.length === 0) {
    return formatDate(task.createdAt);
  }

  // Look inside auditLog for a kind "E" with rhs of "IN_REVIEW", starting from the latest
  for (let i = task.auditLog.length - 1; i >= 0; i--) {
    const log = task.auditLog[i];
    if (log.diff && log.diff.length > 0) {
      const change = log.diff[0];
      if (change.kind === 'E' && change.rhs === 'IN_REVIEW') {
        //console.log("IN_REVIEW found", log.createdAt)
        return formatDate(log.createdAt);
      }
    }
  }

  // If no "IN_REVIEW" status is found, return the task's createdAt date
  return formatDate(task.createdAt);
}

async function getWorkspaceTasks(id: string) {
  const response = await axios.post(`/api/getWorkspaceTasks`, { workspace: id });
  return response.data;
}

async function exportData(id: any) {
  let workspaceSlug = '';
  let workspaceName = '';
  let organizationSlug = '';
  for ( let i in snetSlug.value.workspaces) {
    if (snetSlug.value.workspaces[i].id == id) {
      organizationSlug = snetSlug.value.slug
      workspaceSlug = snetSlug.value.workspaces[i].slug
      workspaceName = snetSlug.value.workspaces[i].name
    }
  }
  for ( let i in swarmSlug.value.workspaces) {
    if (swarmSlug.value.workspaces[i].id == id) {
      organizationSlug = swarmSlug.value.slug
      workspaceSlug = swarmSlug.value.workspaces[i].slug
      workspaceName = swarmSlug.value.workspaces[i].name
    }
  }
  const tasks = await getWorkspaceTasks(id);
  let csvContent = '"Name","Link","Tags","Story Points","Status","Assignees","Wallet Address","Reward","Due Date","Activities","Budget Month"\n';
  
  for (let task of tasks.data.getWorkspace.tasks) {
    //console.log("task", task)
      let name = task.name || '';
      let link = `https://app.dework.xyz/${organizationSlug}/${task.workspace.slug}?taskId=${task.id}`; 
      let tags = task.tags.map((t: any) => t.label).join(',') || ''; 
      let storyPoints = task.storyPoints || '';
      let status = task.status || '';
      let assignees = task.assignees.map((a: any) => a.username).join(',') || ''; 
      let walletAddress = ''; 
      let reward = ''; 
      let dueDate = task.dueDate || '';
      let creator = (task.creator && task.creator.username)?task.creator.username:'no-username'; 
      let createdAt = new Date(task.createdAt).toLocaleString("en-US", {month: "long", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true});
      let activities = `${creator} created on ${createdAt}`;
  
      if(task.doneAt) {
          let doneAt = new Date(task.doneAt).toLocaleString("en-US", {month: "long", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true});
          activities += `, Task completed on ${doneAt}`;
      }
      activities = activities.replace(/(\d{4}) at/g, "$1");
      let budgetMonth = getChargeMonth(task)
      csvContent += `"${name}","${link}","${tags}","${storyPoints}","${status}","${assignees}","${walletAddress}","${reward}","${dueDate}","${activities}","${budgetMonth}"\n`;
  }

  // Convert the CSV content to a Blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create a link element
  const link = document.createElement("a");

  // Add link to the body
  document.body.appendChild(link);

  // Set link attributes
  link.href = URL.createObjectURL(blob);
  link.type = "text/csv";
  link.download = `${workspaceName}-tasks-list.csv`;
  link.click();

  // Remove link after download
  setTimeout(() => {
    document.body.removeChild(link);
  }, 0);
  
}
</script>

<template>
  <div class="main">
    <div v-if="isDataLoaded">
      <table>
        <thead>
          <tr>
            <th>Workspace</th>
            <th class="centered">Fund Request</th>
            <th class="centered">Not Fund Request</th>
            <th>Status</th> <!-- New column -->
            <th>Link</th>
            <th>Export</th>
          </tr>
        </thead>
        <tbody>
          <tr>SNET</tr> 
          <tr v-for="(workspace, key) in snet" :key="'snet-' + key">
            <td>{{ workspace.name }}</td>
            <td class="centered">{{ countAuditedTasks(workspace.tasks) }}</td>
            <td class="centered">{{ countNonAuditedTasks(workspace.tasks) }}</td>
            <td :class="{
              'green-text': isAuditedTasksLoaded(workspace),
              'red-text': !isWorkspaceReady(workspace)
            }">{{ isWorkspaceReady(workspace) ? 'All Audited' : 'Not Audited' }}</td>
            <td><button @click="openLink(workspace.id)">Open Board</button></td>
            <td><button @click="exportData(workspace.id)">Export csv</button></td>
          </tr>
          <tr>Swarm</tr>
          <tr v-for="(workspace, key) in swarm" :key="'swarm-' + key">
            <td>{{ workspace.name }}</td>
            <td class="centered">{{ countAuditedTasks(workspace.tasks) }}</td>
            <td class="centered">{{ countNonAuditedTasks(workspace.tasks) }}</td>
            <td :class="{
              'green-text': isAuditedTasksLoaded(workspace),
              'red-text': !isWorkspaceReady(workspace)
            }">{{ isWorkspaceReady(workspace) ? 'All Audited' : 'Not Audited' }}</td>
            <td><button @click="openLink(workspace.id)">Open Board</button></td>
            <td><button @click="exportData(workspace.id)">Export csv</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="loading">Getting dework workspaces...</div>
  </div>
</template>

<style>
.main {
  display: flex;
  justify-content: center; 
  align-items: center; 
}

.centered {
  text-align: center;
}

table {
  border-collapse: collapse;
}

th,
td {
  border: 1px solid #ddd;
  padding-left: 8px;
  padding-right: 8px;
  font-size: 12px; 
}

.green-text {
  color: green;
}
.red-text {
  color: red;
}
.loading {
    animation: flash 1s linear infinite;
  }

  @keyframes flash {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
</style>