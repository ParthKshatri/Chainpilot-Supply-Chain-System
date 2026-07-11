const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const UsageEntry = require('../models/UsageEntry');
const Material = require('../models/Material');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['text/csv', 'application/xml', 'text/xml', 'text/plain'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(csv|xml)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and XML files allowed'));
    }
  }
});

// GET /api/usage/:materialId
router.get('/:materialId', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = {
      userId: req.user._id,
      materialId: req.params.materialId
    };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const entries = await UsageEntry.find(filter).sort({ date: -1 }).limit(365);
    res.json({ success: true, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/usage - Log daily usage
router.post('/', auth, async (req, res) => {
  try {
    const { materialId, date, quantity, notes } = req.body;

    // Upsert: replace if same day exists
    const entry = await UsageEntry.findOneAndUpdate(
      {
        userId: req.user._id,
        materialId,
        date: new Date(new Date(date).toDateString())
      },
      {
        userId: req.user._id,
        materialId,
        date: new Date(new Date(date).toDateString()),
        quantity,
        notes,
        source: 'manual'
      },
      { upsert: true, new: true }
    );

    // Update material's daily usage (rolling average)
    await updateMaterialDailyAverage(req.user._id, materialId);

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/usage/upload/:materialId - Upload CSV or XML
router.post('/upload/:materialId', auth, upload.single('file'), async (req, res) => {
  try {
    const { materialId } = req.params;
    const fileContent = req.file.buffer.toString('utf8');
    const filename = req.file.originalname.toLowerCase();

    let parsedData = [];

    if (filename.endsWith('.csv')) {
      parsedData = parseCSV(fileContent);
    } else if (filename.endsWith('.xml')) {
      parsedData = parseXML(fileContent);
    }

    if (parsedData.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid data found in file' });
    }

    // Delete existing uploaded entries for this material to avoid stale predictions
    await UsageEntry.deleteMany({
      userId: req.user._id,
      materialId,
      source: { $in: ['csv_upload', 'xml_upload'] }
    });

    // Insert new entries
    const entries = parsedData.map(row => ({
      userId: req.user._id,
      materialId,
      date: new Date(new Date(row.date).toDateString()),
      quantity: parseFloat(row.quantity),
      notes: row.notes || `Imported from ${filename}`,
      source: filename.endsWith('.csv') ? 'csv_upload' : 'xml_upload'
    }));

    // Use insertMany with ordered:false to skip duplicates
    const inserted = await UsageEntry.insertMany(entries, { ordered: false })
      .catch(err => {
        if (err.code === 11000) return err.insertedDocs || [];
        throw err;
      });

    // Update material daily average
    await updateMaterialDailyAverage(req.user._id, materialId);

    res.json({
      success: true,
      message: `Imported ${entries.length} usage records`,
      count: entries.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper: parse CSV
function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
  const dateIdx = headers.findIndex(h => h.includes('date'));
  const qtyIdx = headers.findIndex(h => h.includes('qty') || h.includes('quantity') || h.includes('usage') || h.includes('amount'));

  if (dateIdx === -1 || qtyIdx === -1) return [];

  return lines.slice(1)
    .map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
      const date = cols[dateIdx];
      const quantity = parseFloat(cols[qtyIdx]);
      if (!date || isNaN(quantity)) return null;
      return { date, quantity, notes: cols[2] || '' };
    })
    .filter(Boolean);
}

// Helper: parse XML
function parseXML(content) {
  const results = [];
  const entryRegex = /<(?:entry|record|row|item)[^>]*>([\s\S]*?)<\/(?:entry|record|row|item)>/gi;
  let match;

  while ((match = entryRegex.exec(content)) !== null) {
    const block = match[1];
    const dateMatch = block.match(/<(?:date)[^>]*>([^<]+)<\/date>/i);
    const qtyMatch = block.match(/<(?:quantity|qty|usage|amount)[^>]*>([^<]+)<\/(?:quantity|qty|usage|amount)>/i);

    if (dateMatch && qtyMatch) {
      const quantity = parseFloat(qtyMatch[1]);
      if (!isNaN(quantity)) {
        results.push({ date: dateMatch[1].trim(), quantity });
      }
    }
  }
  return results;
}

// Helper: update rolling average
async function updateMaterialDailyAverage(userId, materialId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentEntries = await UsageEntry.find({
    userId,
    materialId,
    date: { $gte: thirtyDaysAgo }
  });

  if (recentEntries.length > 0) {
    const avg = recentEntries.reduce((sum, e) => sum + e.quantity, 0) / recentEntries.length;
    await Material.findByIdAndUpdate(materialId, { dailyUsage: Math.round(avg * 100) / 100 });
  }
}

module.exports = router;
