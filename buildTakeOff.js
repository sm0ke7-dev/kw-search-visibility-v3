const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Builds Take Off JSON object based on PreFlight data from file
 * @param {Object} dataForSeoConfig - Configuration object containing Authorization token
 * @returns {Object} Take Off JSON object
 */
async function buildTakeOff(dataForSeoConfig) {
  // Read the PreFlight JSON file
  const preFlight = JSON.parse(fs.readFileSync(path.join(__dirname, 'pre-flight-output.json'), 'utf-8'));
  console.log('📖 Loaded PreFlight data from file');
  const takeOffObject = {};

  // Step 1: Iterate for each in PreFlight (e.g., "Fort Worth")
  for (const [location, items] of Object.entries(preFlight)) {
    console.log(`Processing location: ${location}`);
    
    takeOffObject[location] = [];

    // Step 2: For each item contained within
    for (const item of items) {
      const { location: itemLocation, service, intended_url, geo_coordinate, keywords } = item;
      
      console.log(`Processing item: ${service} in ${itemLocation}`);
      console.log(`Geo coordinate: ${geo_coordinate}`);
      console.log(`Keywords: ${keywords.length} keywords found`);

      const processedItem = {
        location: itemLocation,
        service: service,
        intended_url: intended_url,
        geo_coordinate: geo_coordinate,
        keywords: {}
      };

      // Step 3: Transform keywords into objects
      for (const keyword of keywords) {
        processedItem.keywords[keyword] = {
          [keyword]: [],
          task_id: ""
        };
      }

      // Step 4: Make API calls for each keyword
      for (const keyword of keywords) {
        console.log(`Making API call for keyword: ${keyword}`);
        
        try {
          const postData = [
            {
              "keyword": keyword,
              "location_coordinate": geo_coordinate,
              "language_code": "en",
              "device": "mobile",
              "os": "android"
            }
          ];

          const response = await axios.post(
            'https://api.dataforseo.com/v3/serp/google/organic/task_post',
            postData,
            {
              headers: {
                'Authorization': dataForSeoConfig.Authorization,
                'Content-Type': 'application/json'
              }
            }
          );

          // Success handling
          const taskId = response.data.tasks[0].id;
          processedItem.keywords[keyword].task_id = taskId;
          processedItem.keywords[keyword].status = "submitted";
          console.log(`Success: Task ID ${taskId} created for keyword "${keyword}"`);

        } catch (error) {
          // Error handling
          processedItem.keywords[keyword].status = "error";
          processedItem.keywords[keyword].error_description = error.response?.data?.message || error.message;
          console.log(`Error for keyword "${keyword}": ${processedItem.keywords[keyword].error_description}`);
        }
      }

      takeOffObject[location].push(processedItem);
    }
  }

  return takeOffObject;
}

// Run takeoff if this file is executed directly
if (require.main === module) {
  // Read DataForSEO configuration
  const dataForSeoConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'data_for_seo.json'), 'utf-8'));
  
  // Takeoff phase execution
  async function takeoff() {
    try {
      console.log('🚀 Starting TAKEOFF phase...');
      
      // Check if preflight file exists
      if (!fs.existsSync(path.join(__dirname, 'pre-flight-output.json'))) {
        console.error('❌ No pre-flight-output.json found. Please run preflight phase first.');
        return;
      }
      
      // Build and write Take Off JSON
      const takeOffObject = await buildTakeOff(dataForSeoConfig);
      fs.writeFileSync(path.join(__dirname, 'takeoff-output.json'), JSON.stringify(takeOffObject, null, 2));
      console.log('✅ TAKEOFF COMPLETE! Take Off JSON written to takeoff-output.json');
      console.log('⏳ Tasks submitted to DataForSEO. Wait for completion before running landing phase.');
      
    } catch (error) {
      console.error('Error in takeoff phase:', error);
    }
  }
  
  // Run takeoff
  takeoff();
}

module.exports = buildTakeOff; 