const fs = require('fs');
const path = require('path');
const buildPreflight = require('./buildPreflight');

const topDomain = "aaacwildliferemoval.com";
const rankingPages = JSON.parse(fs.readFileSync(path.join(__dirname, 'ranking_pages.json'), 'utf-8'));
const serviceLocationData = JSON.parse(fs.readFileSync(path.join(__dirname, 'service_location_data.json'), 'utf-8'));
const placeholders = JSON.parse(fs.readFileSync(path.join(__dirname, 'placeholder.json'), 'utf-8'));

const preFlight = buildPreflight({ rankingPages, serviceLocationData, placeholders });

fs.writeFileSync(path.join(__dirname, 'pre-flight-output.json'), JSON.stringify(preFlight, null, 2));
console.log('Pre-flight output written to pre-flight-output.json'); 