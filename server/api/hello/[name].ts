import axios from 'axios';

export default defineEventHandler(async (event: any) => {
    const test = getRouterParam(event, 'name')
    try {
        // Example: Fetching data from JSONPlaceholder API
        const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
        const data = response.data;

        // Return the fetched data
        return {
            data: data,
            test: test
        };
    } catch (error) {
        console.error('Error fetching data:', error);

        // Handle error response
        return { error: 'An error occurred while fetching data.' };
    }
});
