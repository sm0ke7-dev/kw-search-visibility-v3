const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Read DataForSEO configuration
const dataForSeoConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'data_for_seo.json'), 'utf-8'));

async function debugSerpResponse() {
  // Read the test takeoff data to get a task ID
  const takeOffData = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-takeoff-output.json'), 'utf-8'));
  
  // Get the first task ID
  const firstLocation = Object.keys(takeOffData)[0];
  const firstItem = takeOffData[firstLocation][0];
  const firstKeyword = Object.keys(firstItem.keywords)[0];
  const taskId = firstItem.keywords[firstKeyword].task_id;
  
  console.log(`Debugging task ID: ${taskId}`);
  
  try {
    const response = await axios.get(
      `https://api.dataforseo.com/v3/serp/google/organic/task_get/regular/${taskId}`,
      {
        headers: {
          'Authorization': dataForSeoConfig.Authorization
        }
      }
    );

    console.log('Full DataForSEO response structure:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Save the raw response for inspection
    fs.writeFileSync(path.join(__dirname, 'debug-serp-response.json'), JSON.stringify(response.data, null, 2));
    console.log('Raw response saved to debug-serp-response.json');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

debugSerpResponse(); 