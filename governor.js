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

// Main execution
async function main() {
  try {
    const preFlight = buildPreflight({ rankingPages, serviceLocationData, placeholders });
    
    // Write PreFlight output
    fs.writeFileSync(path.join(__dirname, 'pre-flight-output.json'), JSON.stringify(preFlight, null, 2));
    console.log('Pre-flight output written to pre-flight-output.json');

    // Build and write Take Off JSON
    const takeOffObject = await buildTakeOff(preFlight, dataForSeoConfig);
    fs.writeFileSync(path.join(__dirname, 'takeoff-output.json'), JSON.stringify(takeOffObject, null, 2));
    console.log('Take Off JSON written to takeoff-output.json');

    // Land the plane and get SERP results
    console.log('🛬 Starting landing sequence...');
    const serpResults = await landThePlane(takeOffObject, dataForSeoConfig);
    fs.writeFileSync(path.join(__dirname, 'landing-results.json'), JSON.stringify(serpResults, null, 2));
    console.log('✅ Plane landed successfully! SERP results written to landing-results.json');
    
  } catch (error) {
    console.error('Error in main execution:', error);
  }
}

main(); 