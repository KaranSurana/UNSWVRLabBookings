const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
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
  computerId: String,  // ID of the computer being booked
  date: String,
  startTime: String,     // Start time of the booking
  endTime: String,       // End time of the booking
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
    // Function to convert time string (e.g., '14:30') to minutes
    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(':');
      return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
    };
    
    // Calculate duration of the new booking in minutes
    const newBookingStart = timeToMinutes(startTime);
    const newBookingEnd = timeToMinutes(endTime)+30;
    const newBookingDuration = newBookingEnd - newBookingStart;
    
    // Find all existing bookings for the user on the same date
    const existingBookings = await Booking.find({ userId, date: stringDate });
    
    // Calculate total booked time for the user on the same day
    let totalBookedTime = 0;
    
    existingBookings.forEach((booking) => {
      const existingStart = timeToMinutes(booking.startTime);
      const existingEnd = timeToMinutes(booking.endTime)+30;      
      totalBookedTime += (existingEnd - existingStart);
    });
    
    // Add the new booking duration to the total booked time
    totalBookedTime += newBookingDuration;
    
    // Check if the total booked time exceeds 4 hours (240 minutes)
    if (totalBookedTime > process.env.MAX_MINUTES) {
      return res.status(400).send({ error: 'Booking exceeds the maximum allowed time of 4 hours per day' });
    }
    
    // Create and save the new booking
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


function parseTime(timeStr) {
  // Split the time and period (AM/PM)
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  // Return a Date object with today's date and the parsed time
  const now = new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" });
  const australianDate = new Date(now);
  australianDate.setHours(hours, minutes, 0, 0); // Set hours and minutes to the parsed values
  
  return australianDate;
}

function getTimeIntervals(startStr, endStr, interval=30) {
  if (startStr==undefined || endStr==undefined) {
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
      // Format the time string in 24-hour format and append "PM" if required
      if (hours>11) {
        times.push(`${hours}:${formattedMinute} PM`);
      } else {
        times.push(`${hours}:${formattedMinute} AM`);
      }
      current.setMinutes(current.getMinutes() + interval);
  }
  
  return times;
}

function formatDate(date) {
  const dates = new Date();
  const years = dates.getFullYear();
  const months = String(date.getMonth() + 1).padStart(2, '0');
  const days = String(date.getDate()).padStart(2, '0');
  return `${years}-${months}-${days}`;

}

app.get('/api/bookings/all', async (req, res) => {
  try {
    // Get today's date
      const today = new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" });
      const currentDate = formatDate(today);

      // Get tomorrow's date
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const nextDate = formatDate(tomorrow);      

    
    // Find bookings for today and tomorrow
    const bookings = await Booking.find();
    
    // Prepare structure for 12 moogs (moog00 to moog11)
    const moogBookings = Array.from({ length: 12 }, () => [
      { [currentDate]: [] },
      { [nextDate]: [] },
    ]);

    // Populate the booking data
    bookings.forEach((booking) => {
      const moogIndex = parseInt(booking.computerId.replace('moog', '')); // Get moog index (00 -> 0, 01 -> 1, etc.)
      const bookingStartTime = booking.startTime;
      const bookingDate = booking.date;
      const timesArray = getTimeIntervals(booking.startTime, booking.endTime);
      
      // Initialize array if it doesn't exist for the current date
      if (bookingDate === currentDate) {
          if (!moogBookings[moogIndex][0][bookingDate]) {
              moogBookings[moogIndex][0][bookingDate] = [];
          }
          moogBookings[moogIndex][0][bookingDate].push(...timesArray); // Add to today's bookings
        } else if (bookingDate === nextDate) {
          if (!moogBookings[moogIndex][1][bookingDate]) {
              moogBookings[moogIndex][1][bookingDate] = [];
          }
          moogBookings[moogIndex][1][bookingDate].push(...timesArray); // Add to tomorrow's bookings
      }
  });
  console.log(moogBookings);
  
  
    
    res.status(200).json(moogBookings);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to retrieve bookings' });
  }
});

app.get('/api/bookings/user/:userId', async (req, res) => {
  const { userId } = req.params;  // Get the userId from the request parameters

  try {
    // Helper function to format date as YYYY-MM-DD
    function formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is zero-indexed
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Get today's date
    const today = new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" });
    const currentDate = formatDate(today); // Format as YYYY-MM-DD

    // Get tomorrow's date
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextDate = formatDate(tomorrow); // Format as YYYY-MM-DD

    // Find bookings for the specific user
    const bookings = await Booking.find({ userId });

    // Prepare structure for 12 moogs (moog00 to moog11)
    const moogBookings = Array.from({ length: 12 }, () => [
      { [currentDate]: [] },
      { [nextDate]: [] },
    ]);

    // Populate the booking data
    bookings.forEach((booking) => {
      const moogIndex = parseInt(booking.computerId.replace('moog', '')); // Get moog index (00 -> 0, 01 -> 1, etc.)
      const bookingDate = formatDate(new Date(booking.date)); // Ensure the booking date is in YYYY-MM-DD format
      const timesArray = getTimeIntervals(booking.startTime, booking.endTime);

      // Add bookings to the correct date (current date or next date)
      if (bookingDate === currentDate) {
        moogBookings[moogIndex][0][currentDate].push(...timesArray);
      } else if (bookingDate === nextDate) {
        moogBookings[moogIndex][1][nextDate].push(...timesArray);
      }
    });

    // Send the response with formatted moog bookings
    res.status(200).json(moogBookings);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to retrieve bookings' });
  }
});


// DELETE route for deleting a booking based on userId, date, and startTime
app.delete('/api/bookings/delete', async (req, res) => {
  const { userId, date, startTime } = req.body;

  try {
    // Find and delete the booking
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
  
