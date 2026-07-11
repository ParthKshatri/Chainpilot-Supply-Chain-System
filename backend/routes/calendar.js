const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const CalendarEvent = require('../models/CalendarEvent');

// GET /api/calendar?year=2024&month=1
router.get('/', auth, async (req, res) => {
  try {
    const { year, month, startDate, endDate } = req.query;
    let filter = { userId: req.user._id };

    if (year && month) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    } else if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const events = await CalendarEvent.find(filter)
      .populate('materialId', 'name unit')
      .sort({ date: 1 });

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/calendar
router.post('/', auth, async (req, res) => {
  try {
    const event = await CalendarEvent.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/calendar/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const event = await CalendarEvent.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/calendar/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const event = await CalendarEvent.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
