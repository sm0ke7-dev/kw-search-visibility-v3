const fs = require('fs');
const path = require('path');
const buildPreflight = require('./buildPreflight');
const buildTakeOff = require('./buildTakeOff');
const landThePlane = require('./landThePlane');

const topDomain = "aaacwildliferemoval.com";
const rankingPages = JSON.parse(fs.readFileSync(path.join(__dirname, 'ranking_pages.json'), 'utf-8'));
const serviceLocationData = JSON.parse(fs.readFileSync(path.join(__dirname, 'service_location_data.json'), 'utf-8'));
const placeholders = JSON.parse(fs.readFileSync(path.join(__dirname, 'placeholder.json'), 'utf-8'));

// Read DataForSEO configuration
const dataForSeoConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'data_for_seo.json'), 'utf-8'));

// Test function - limits data to just a few keywords
function createTestPreFlight(preFlight) {
  const testPreFlight = {};
  
  // Only take the first location
  const firstLocation = Object.keys(preFlight)[0];
  testPreFlight[firstLocation] = preFlight[firstLocation].slice(0, 1); // Only first service
  
  // Limit to just 3 keywords for testing
  testPreFlight[firstLocation][0].keywords = testPreFlight[firstLocation][0].keywords.slice(0, 3);
  
  return testPreFlight;
}

// Main execution
async function main() {
  try {
    console.log('🧪 Starting TEST mode with limited dataset...');
    
    const preFlight = buildPreflight({ rankingPages, serviceLocationData, placeholders });
    
    // Create test version with limited data
    const testPreFlight = createTestPreFlight(preFlight);
    
    // Write test PreFlight output
    fs.writeFileSync(path.join(__dirname, 'test-pre-flight-output.json'), JSON.stringify(testPreFlight, null, 2));
    console.log('Test Pre-flight output written to test-pre-flight-output.json');

    // Build and write test Take Off JSON
    const takeOffObject = await buildTakeOff(testPreFlight, dataForSeoConfig);
    fs.writeFileSync(path.join(__dirname, 'test-takeoff-output.json'), JSON.stringify(takeOffObject, null, 2));
    console.log('Test Take Off JSON written to test-takeoff-output.json');

    // Land the plane and get SERP results
    console.log('🛬 Starting landing sequence for test data...');
    const serpResults = await landThePlane(takeOffObject, dataForSeoConfig);
    fs.writeFileSync(path.join(__dirname, 'test-landing-results.json'), JSON.stringify(serpResults, null, 2));
    console.log('✅ Test plane landed successfully! SERP results written to test-landing-results.json');
    
  } catch (error) {
    console.error('Error in test execution:', error);
  }
}

main(); 