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

module.exports = buildPreflight; 