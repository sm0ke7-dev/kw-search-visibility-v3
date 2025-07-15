const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Builds Take Off JSON object based on PreFlight data
 * @param {Object} preFlight - The PreFlight object containing location and item data
 * @param {Object} dataForSeoConfig - Configuration object containing Authorization token
 * @returns {Object} Take Off JSON object
 */
async function buildTakeOff(preFlight, dataForSeoConfig) {
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

module.exports = buildTakeOff; 