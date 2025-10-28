# search-visibility-project

A Node.js script to interact with the DataForSEO SERP API. It creates a SERP task, polls for results, and writes the output to `output.json`.

## Prerequisites
- Node.js (v14+ recommended)
- npm

## Setup
1. Clone the repository:
   ```sh
   git clone https://github.com/Bright-Fox-Digital-88/search-visibility-project.git
   cd search-visibility-project
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Ensure `data_for_seo.json` contains valid DataForSEO credentials and your desired query parameters. This file is included for your convenience.

## Usage
Run the script with:
```sh
node dataforseo-serp.js
```

- The script will create a SERP task, poll for results, and write the output to `output.json`.
- Adjust the parameters in `data_for_seo.json` as needed.

## Notes
- `node_modules` and `output.json` are gitignored.
- This repo is private and includes credentials for teammate use.

## Potential Improvements

### Hybrid Keyword Generation Approach
Combine the best features of both keyword generation implementations:

**Current State:**
- `KW_GEN.js` - Google Apps Script with full spreadsheet integration, menu-driven UI
- `Gs-kw-script.js` - Pure function for Google Sheets formulas, flexible parameters

**Proposed Hybrid:**
- Use teammate's flexible parameter system with placeholders
- Keep Apps Script integration for API calls and automation
- Add 4-column output structure: [service, location, core_keyword, keyword]
- Maintain SEO prioritization logic
- Enable both formula use and full automation workflows

**Benefits:**
- More flexible template system
- Better data structure for analysis
- Reusable across different contexts
- Maintains current automation capabilities 