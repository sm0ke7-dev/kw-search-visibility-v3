const fs = require('fs');
const path = require('path');

function buildPreflight({ rankingPagesPath, serviceLocationDataPath, placeholderPath, outputPath }) {
  const rankingPages = JSON.parse(fs.readFileSync(rankingPagesPath, 'utf-8'));
  const serviceLocationData = JSON.parse(fs.readFileSync(serviceLocationDataPath, 'utf-8'));
  const placeholders = JSON.parse(fs.readFileSync(placeholderPath, 'utf-8'));
  const output = {};

  for (const city in rankingPages) {
    if (!serviceLocationData[city]) continue;
    const cityData = serviceLocationData[city];
    output[city] = rankingPages[city].map(item => {
      // Find geo_coordinate for location
      const locationObj = cityData.locations.find(loc => loc.name === item.location);
      const geo_coordinate = locationObj ? locationObj.geo_coordinate : null;
      
      // Find service for keywords
      const serviceObj = cityData.services.find(svc => svc.name === item.service);
      const brand = cityData.brand;
      
      let keywords = [];
      
      if (serviceObj && serviceObj.keyword_list) {
        // Iterate through each keyword in the service's keyword_list
        serviceObj.keyword_list.forEach(keyword => {
          // Apply placeholder templates to each keyword
          placeholders.forEach(template => {
            const locationKeyword = template
              .replace(/\{keyword\}/gi, keyword)
              .replace(/\{location\}/gi, item.location.toLowerCase())
              .replace(/\{brand\}/gi, brand);
            keywords.push(locationKeyword);
          });
        });
      }
      
      return {
        ...item,
        geo_coordinate,
        keywords
      };
    });
  }

  if (outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`Pre-flight output written to ${outputPath}`);
  }
  return output;
}

// If run directly, execute with default paths
if (require.main === module) {
  buildPreflight({
    rankingPagesPath: path.join(__dirname, 'ranking_pages.json'),
    serviceLocationDataPath: path.join(__dirname, 'service_location_data.json'),
    placeholderPath: path.join(__dirname, 'placeholder.json'),
    outputPath: path.join(__dirname, 'pre-flight-output.json')
  });
}

module.exports = buildPreflight; 