# Search Visibility Project

A comprehensive keyword generation and ranking tracking system using Google Apps Script and DataForSEO API.

## 🚀 Current Features

### Keyword Generation
- **Template-based keyword generation** with SEO prioritization
- **Geographic targeting** with location modifiers
- **Batch processing** for large datasets
- **Google Sheets integration** with custom menu

### Ranking Tracking (v2)
- **500-keyword batch processing** with DataForSEO API
- **3-page SERP results** (30 results per keyword)
- **Intelligent retry system** (up to 8 retries for queued tasks)
- **Real-time progress tracking** in Google Sheets
- **Raw response data** for comprehensive auditing
- **Skip logic** for already processed keywords

## 📁 File Structure

### Core Scripts
- `Gordon-kw-script-v2.js` - Main ranking tracking script (500-keyword batches)
- `Gordon-kw-script-v1.js` - Backup version
- `KW_GEN_PLUS_KW_RANKING.js` - Original keyword generation + ranking script

### Data Files
- `pre-flight-output.json` - Pre-generated keyword data
- `data_for_seo.json` - API configuration
- `service_location_data.json` - Location and service data

## 🔧 Setup

### Google Apps Script Setup
1. Create a new Google Apps Script project
2. Copy `Gordon-kw-script-v2.js` content
3. Add DataForSEO API key to Script Properties:
   - Key: `basic`
   - Value: Your DataForSEO API key

### DataForSEO Configuration
- **API Endpoint**: `/v3/serp/google/organic`
- **Batch Size**: 100 keywords per batch
- **Depth**: 30 results (3 pages) per keyword
- **Wait Time**: 5 minutes per batch
- **Retries**: 8 attempts for queued tasks

## 📊 Column Mapping

### Input Data
- **Column K**: Keywords with geo modifiers
- **Column L**: Latitude coordinates
- **Column M**: Longitude coordinates

### Output Data
- **Column N**: Ranking Position
- **Column O**: Ranking URL
- **Column P**: Raw Response Data (JSON)

## ⚡ Performance

### Batch Processing
- **100 keywords per batch** (optimized for reliability)
- **5-minute wait time** per batch
- **Up to 8 retries** for queued tasks
- **Real-time progress updates** in Column L

### Cost Optimization
- **30 results per keyword** (vs 100 default)
- **Lower cost** per API call
- **Comprehensive data** for auditing

## 🎯 Usage

### Running the Script
1. Open Google Sheets with your keyword data
2. Go to **🔍 Gordon KW + Rankings** menu
3. Select **"Check Rankings Only (Existing Keywords)"**
4. Confirm the batch processing dialog
5. Monitor progress in Column L

### Resume Capability
- Script automatically skips already processed keywords
- Safe to stop and restart at any time
- No data loss on interruption

## 📈 Recent Updates

### v2.0 Features
- ✅ 500-keyword batch processing
- ✅ 3-page SERP results (depth: 30)
- ✅ Intelligent retry system (8 attempts)
- ✅ Raw response data in Column P
- ✅ Fixed row mapping for accurate results
- ✅ 5-minute wait time per batch
- ✅ Real-time progress tracking

### Performance Improvements
- **8.4x faster** than original individual processing
- **60x faster** submission with batch API
- **Comprehensive auditing** with raw response data
- **Reliable processing** with intelligent retries

## 🔍 Troubleshooting

### Common Issues
- **"Task In Queue"**: Normal - script will retry automatically
- **No results written**: Check column mapping and API key
- **Script timeout**: Reduce batch size or wait time

### Debug Information
- Check execution logs for detailed progress
- Raw response data in Column P for API debugging
- Progress updates in Column L during processing

## 📝 Notes
- Repository is private with credentials for team use
- `node_modules` and output files are gitignored
- All scripts include comprehensive error handling
- DataForSEO API limits: 1000 keywords per batch (we use 100 for reliability) 