import axios from 'axios';

export default defineEventHandler(async (event: any) => {
  const body = await readBody(event)
  const workspace = body.workspace; 
  
  const query = `
  query GetWorkspaceTasksQuery {
    getWorkspace(id: "${workspace}") {
    id
    tasks(filter: { statuses: [IN_REVIEW] }) {
      id
      name
      assignees {
        id
        username
      }
      auditLog {
        createdAt
        diff
      }
      createdAt
      creator {
        id
        username
      }
      deletedAt
      doneAt
      dueDate
      owners {
        id
        username
      }
      status
      storyPoints
      tags {
        id
        label
        color
      }
      workspaceId
      workspace { 
        name
        slug
      }
    }
  }
}
`;
  
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': process.env.DEWORK_AUTH,
    };
  
    try {
      const response = await axios.post('https://api.deworkxyz.com/graphql?op=GetWorkspaceTasksQuery', {
        query,
      }, {
        headers,
      });
  
      return response.data;
    } catch (error) {
      console.error('Error fetching workspace details:', error);
      return { error: 'An error occurred while fetching workspace details.' };
    }
  });