const fs = require('fs');
const path = require('path');

const buildPreflight = ({ rankingPages, serviceLocationData, placeholders }) => {
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
  return output;
};

// Run preflight if this file is executed directly
if (require.main === module) {
  // Load data files
  const rankingPages = JSON.parse(fs.readFileSync(path.join(__dirname, 'ranking_pages.json'), 'utf-8'));
  const serviceLocationData = JSON.parse(fs.readFileSync(path.join(__dirname, 'service_location_data.json'), 'utf-8'));
  const placeholders = JSON.parse(fs.readFileSync(path.join(__dirname, 'placeholder.json'), 'utf-8'));
  
  // Preflight phase execution
  async function preflight() {
    try {
      console.log('📋 Starting PREFLIGHT phase...');
      
      // Build PreFlight data
      const preFlight = buildPreflight({ rankingPages, serviceLocationData, placeholders });
      
      // Write PreFlight output
      fs.writeFileSync(path.join(__dirname, 'pre-flight-output.json'), JSON.stringify(preFlight, null, 2));
      console.log('✅ PREFLIGHT COMPLETE! PreFlight output written to pre-flight-output.json');
      console.log('🚀 Ready for takeoff phase.');
      
    } catch (error) {
      console.error('Error in preflight phase:', error);
    }
  }
  
  // Run preflight
  preflight();
}

module.exports = buildPreflight; 