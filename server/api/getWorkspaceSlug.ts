import axios from 'axios';

export default defineEventHandler(async (event: any) => {
  const body = await readBody(event)
  const organization = body.organization; 
  
  const query = `
    query GetOrganizationDetailsQuery {
        getOrganization(id: "${organization}") {
        id
        slug
        name
        workspaces {
          id
          name
          slug
        }
      }
    }
  `;
  
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': process.env.DEWORK_AUTH,
    };
  
    try {
      const response = await axios.post('https://api.deworkxyz.com/graphql?op=GetOrganizationDetailsQuery', {
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