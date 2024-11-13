const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const moment = require('moment-timezone');  // Import moment-timezone
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Function to get the current Australian date in the required format (YYYY-MM-DD)
function getAustralianDate() {
  return moment.tz("Australia/Sydney").format("YYYY-MM-DD");
}

// Function to format any date in Australian time zone
function formatAustralianDate(date) {
  return moment.tz(date, "Australia/Sydney").format("YYYY-MM-DD");
}

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  zid: { type: String, required: true },
  fullName: { type: String, required: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// Booking Schema
const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  computerId: String,
  date: String,
  startTime: String,
  endTime: String,
});

const Booking = mongoose.model('Booking', bookingSchema);

// Register Route
app.post('/api/register', async (req, res) => {
  const { email, zid, fullName, password } = req.body;
  try {
    const user = new User({ email, zid, fullName, password });
    await user.save();
    
    res.status(201).send({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).send({ error: 'Registration failed' });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (user) {
      res.status(200).send({ message: 'Login successful', userId: user._id });
    } else {
      res.status(401).send({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).send({ error: 'Login failed' });
  }
});

// POST route for creating a booking
app.post('/api/book', async (req, res) => {
  const { userId, selectedComputer, stringDate, startTime, endTime } = req.body;
  
  try {
    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(':');
      return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
    };
    
    const newBookingStart = timeToMinutes(startTime);
    const newBookingEnd = timeToMinutes(endTime) + 30;
    const newBookingDuration = newBookingEnd - newBookingStart;
    
    const existingBookings = await Booking.find({ userId, date: stringDate });
    let totalBookedTime = 0;
    
    existingBookings.forEach((booking) => {
      const existingStart = timeToMinutes(booking.startTime);
      const existingEnd = timeToMinutes(booking.endTime) + 30;
      totalBookedTime += (existingEnd - existingStart);
    });
    
    totalBookedTime += newBookingDuration;
    
    if (totalBookedTime > process.env.MAX_MINUTES) {
      return res.status(400).send({ error: 'Booking exceeds the maximum allowed time of 4 hours per day' });
    }
    
    const booking = new Booking({
      userId,
      computerId: selectedComputer,
      date: stringDate,
      startTime,
      endTime
    });
    
    await booking.save();
    res.status(201).send({ message: 'Booking created successfully', booking });
    
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: 'Booking creation failed' });
  }
});

// Helper functions
function parseTime(timeStr) {
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  now.setHours(hours, minutes, 0, 0);
  return now;
}

function getTimeIntervals(startStr, endStr, interval = 30) {
  if (startStr == undefined || endStr == undefined) {
    return [];
  }
  const start = parseTime(startStr);
  const end = parseTime(endStr);
  const times = [];

  let current = new Date(start);

  while (current <= end) {
    const hours = current.getHours();
    const minutes = current.getMinutes();
    const formattedMinute = minutes < 10 ? '0' + minutes : minutes;
    if (hours > 11) {
      times.push(`${hours}:${formattedMinute} PM`);
    } else {
      times.push(`${hours}:${formattedMinute} AM`);
    }
    current.setMinutes(current.getMinutes() + interval);
  }
  
  return times;
}

app.get('/api/bookings/all', async (req, res) => {
  try {
    const currentDate = getAustralianDate();
    const tomorrow = moment.tz("Australia/Sydney").add(1, 'days').format("YYYY-MM-DD");

    const bookings = await Booking.find();
    const moogBookings = Array.from({ length: 12 }, () => [
      { [currentDate]: [] },
      { [tomorrow]: [] },
    ]);

    bookings.forEach((booking) => {
      const moogIndex = parseInt(booking.computerId.replace('moog', ''));
      const bookingDate = formatAustralianDate(booking.date);
      const timesArray = getTimeIntervals(booking.startTime, booking.endTime);

      if (bookingDate === currentDate) {
        moogBookings[moogIndex][0][currentDate].push(...timesArray);
      } else if (bookingDate === tomorrow) {
        moogBookings[moogIndex][1][tomorrow].push(...timesArray);
      }
    });

    res.status(200).json(moogBookings);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to retrieve bookings' });
  }
});

app.get('/api/bookings/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const currentDate = getAustralianDate();
    const tomorrow = moment.tz("Australia/Sydney").add(1, 'days').format("YYYY-MM-DD");

    const bookings = await Booking.find({ userId });
    const moogBookings = Array.from({ length: 12 }, () => [
      { [currentDate]: [] },
      { [tomorrow]: [] },
    ]);

    bookings.forEach((booking) => {
      const moogIndex = parseInt(booking.computerId.replace('moog', ''));
      const bookingDate = formatAustralianDate(booking.date);
      const timesArray = getTimeIntervals(booking.startTime, booking.endTime);

      if (bookingDate === currentDate) {
        moogBookings[moogIndex][0][currentDate].push(...timesArray);
      } else if (bookingDate === tomorrow) {
        moogBookings[moogIndex][1][tomorrow].push(...timesArray);
      }
    });

    res.status(200).json(moogBookings);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to retrieve bookings' });
  }
});

app.delete('/api/bookings/delete', async (req, res) => {
  const { userId, date, startTime } = req.body;

  try {
    const deletedBooking = await Booking.findOneAndDelete({
      userId,
      date,
      startTime
    });

    if (deletedBooking) {
      res.status(200).send({ message: 'Booking deleted successfully' });
    } else {
      res.status(404).send({ message: 'Booking not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to delete booking' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
