import axios from 'axios';

function getPrefix(organizationName: any) {
  const lowercaseName = organizationName.toLowerCase();
  if (lowercaseName.includes('singularitynet ambassador program')) {
    return 'snet';
  } else if (lowercaseName.includes('swarm')) {
    return 'swarm';
  } else {
    // Handle other cases or return a default
    return 'defaultPrefix';
  }
}

function transformWorkspaces(workspaces: any, organizationName: any) {
  const prefix = getPrefix(organizationName);
  let result: any = {};

  workspaces.forEach((workspace: any) => {
    const key = prefix + workspace.name.replace(/[^\w\s]/gi, '').replace(/\s+/g, '');
    result[key] = {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      tasks: []
    };
  });

  return result;
}

export default defineEventHandler(async (event: any) => {
  const body = await readBody(event)
  const organizationId = body.workspace; 
  
    const query = `
      query GetOrganizationDetailsQuery {
        getOrganization(id: "${organizationId}") {
          name
          workspaces {
            id
            name
            slug
          }
        }
      }
    `;
  
    const variables = { organizationId };
  
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': process.env.DEWORK_AUTH,
    };
  
    try {
      const response = await axios.post('https://api.deworkxyz.com/graphql?op=GetOrganizationDetailsQuery', {
        query,
        variables,
      }, {
        headers,
      });
  
      const organization = response.data.data.getOrganization;
      const transformedWorkspaces = transformWorkspaces(organization.workspaces, organization.name);
  
      return transformedWorkspaces;
    } catch (error) {
      console.error('Error fetching organization details:', error);
      return { error: 'An error occurred while fetching organization details.' };
    }
  });