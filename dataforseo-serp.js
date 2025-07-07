const fs = require('fs');
const axios = require('axios');

// Step 1: Read config
const config = JSON.parse(fs.readFileSync('data_for_seo.json', 'utf8'));
const { Authorization, location_coordinate, keyword } = config;

// Step 2: Prepare POST data
const postData = [
  {
    "keyword": keyword,
    "location_coordinate": location_coordinate,
    "language_code": "en", // default, adjust as needed
    "device": "mobile",     // changed to mobile
    "os": "android"         // added os android
  }
];

async function main() {
  try {
    // Step 2: POST to create a task
    const postResponse = await axios.post(
      'https://api.dataforseo.com/v3/serp/google/organic/task_post',
      postData,
      {
        headers: {
          'Authorization': Authorization,
          'Content-Type': 'application/json'
        }
      }
    );

    // Step 3: Extract the task ID
    const taskId = postResponse.data.tasks[0].id;
    console.log('Task created. Task ID:', taskId);

    // Step 4: Poll for results
    let result = null;
    while (!result) {
      await new Promise(res => setTimeout(res, 2000)); // 2 second delay
      const getResponse = await axios.get(
        `https://api.dataforseo.com/v3/serp/google/organic/task_get/regular/${taskId}`,
        {
          headers: {
            'Authorization': Authorization
          }
        }
      );
      const task = getResponse.data.tasks[0];
      if (task.result && task.result.length > 0) {
        result = task.result;
        fs.writeFileSync('output.json', JSON.stringify(result, null, 2));
        console.log('Task complete. Result written to output.json');
      } else {
        console.log('Task not ready yet, polling again...');
      }
    }
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

main(); 