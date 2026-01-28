/* ======================================================
   DriveEase - Main Application Script (Clean Version)
   ====================================================== */

import {
  dbGetCars,
  dbGetLocations,
  dbCheckAvailability,
  dbCreateBooking,
  dbTestConnection
} from './db.js';

/* =====================
   DOM ELEMENTS
===================== */
const carsContainer = document.getElementById('carsContainer');
const locationsContainer = document.getElementById('locationsContainer');
const pickupLocationSelect = document.getElementById('pickupLocation');
const searchForm = document.getElementById('searchForm');
const bookingForm = document.getElementById('bookingForm');
const bookingModal = document.getElementById('bookingModal');
const successModal = document.getElementById('successModal');
const bookingRefSpan = document.getElementById('bookingRef');
const currentYearSpan = document.getElementById('currentYear');

/* =====================
   STATE
===================== */
let cars = [];
let locations = [];
let selectedCar = null;

/* =====================
   UTILITIES
===================== */
const formatCurrency = value =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);

const generateBookingRef = () =>
  `BK-${Date.now().toString(36).toUpperCase()}`;

const calculateDays = (start, end) =>
  Math.ceil((new Date(end) - new Date(start)) / 86400000);

/* =====================
   INIT
===================== */
document.addEventListener('DOMContentLoaded', init);

async function init() {
  setCurrentYear();

  const connected = await dbTestConnection();
  if (!connected) {
    alert('Failed to connect to database');
    return;
  }

  await loadInitialData();
  setupEventListeners();
}

/* =====================
   LOAD DATA
===================== */
async function loadInitialData() {
  cars = await dbGetCars();
  locations = await dbGetLocations();

  renderCars(cars);
  renderLocations(locations);
  populateLocationSelect(locations);
}

/* =====================
   RENDER FUNCTIONS
===================== */
function renderCars(data) {
  carsContainer.innerHTML = '';

  if (!data.length) {
    carsContainer.innerHTML = '<p>No cars available</p>';
    return;
  }

  data.forEach(car => {
    const div = document.createElement('div');
    div.className = 'car-card';
    div.innerHTML = `
      <img src="${car.image_url}" alt="${car.name}">
      <div class="car-details">
        <h3>${car.name}</h3>
        <p>${car.type} • ${car.transmission}</p>
        <p><strong>${formatCurrency(car.price_per_day)}</strong> / day</p>
        <button class="cta-button" data-id="${car.id}">Book Now</button>
      </div>
    `;
    carsContainer.appendChild(div);
  });

  document.querySelectorAll('.car-card button').forEach(btn => {
    btn.addEventListener('click', () => openBooking(btn.dataset.id));
  });
}

function renderLocations(data) {
  locationsContainer.innerHTML = '';

  data.forEach(loc => {
    const div = document.createElement('div');
    div.className = 'location-card';
    div.innerHTML = `
      <h3>${loc.name}</h3>
      <p>${loc.address}, ${loc.city}</p>
    `;
    locationsContainer.appendChild(div);
  });
}

function populateLocationSelect(data) {
  pickupLocationSelect.innerHTML = '<option value="">Select Location</option>';
  data.forEach(loc => {
    const opt = document.createElement('option');
    opt.value = loc.id;
    opt.textContent = `${loc.name} - ${loc.city}`;
    pickupLocationSelect.appendChild(opt);
  });
}

/* =====================
   BOOKING
===================== */
function openBooking(carId) {
  selectedCar = cars.find(c => c.id == carId);
  if (!selectedCar) return;

  bookingForm.reset();
  bookingForm.bookingCar.value = selectedCar.name;
  bookingForm.bookingCarId.value = selectedCar.id;

  bookingModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeBooking() {
  bookingModal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

async function submitBooking(e) {
  e.preventDefault();

  const pickupDate = bookingForm.pickupDate.value;
  const returnDate = bookingForm.returnDate.value;
  const locationId = bookingForm.pickupLocation.value;

  if (!pickupDate || !returnDate || !locationId) {
    alert('Please complete all required fields');
    return;
  }

  const available = await dbCheckAvailability(
    selectedCar.id,
    pickupDate,
    returnDate
  );

  if (!available) {
    alert('Car not available on selected dates');
    return;
  }

  const days = calculateDays(pickupDate, returnDate);
  const total = selectedCar.price_per_day * days;
  const location = locations.find(l => l.id == locationId);

  const payload = {
    car_id: selectedCar.id,
    car_name: selectedCar.name,
    customer_name: bookingForm.bookingName.value,
    customer_email: bookingForm.bookingEmail.value,
    customer_phone: bookingForm.bookingPhone.value,
    pickup_location: `${location.name}, ${location.city}`,
    pickup_date: pickupDate,
    return_date: returnDate,
    total_days: days,
    total_price: total,
    status: 'confirmed',
    booking_reference: generateBookingRef()
  };

  await dbCreateBooking(payload);

  bookingRefSpan.textContent = payload.booking_reference;
  closeBooking();
  openSuccess();
}

/* =====================
   SEARCH
===================== */
async function handleSearch(e) {
  e.preventDefault();

  const category = document.getElementById('carType').value;
  const transmission = document.getElementById('transmission').value;

  const filtered = await dbGetCars({ category, transmission });
  renderCars(filtered);
}

/* =====================
   MODAL
===================== */
function openSuccess() {
  successModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeSuccess() {
  successModal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

/* =====================
   EVENTS
===================== */
function setupEventListeners() {
  searchForm.addEventListener('submit', handleSearch);
  bookingForm.addEventListener('submit', submitBooking);

  document
    .getElementById('closeModal')
    .addEventListener('click', closeBooking);

  document
    .getElementById('closeSuccessModal')
    .addEventListener('click', closeSuccess);

  document
    .getElementById('closeSuccessBtn')
    .addEventListener('click', closeSuccess);
}

/* =====================
   FOOTER
===================== */
function setCurrentYear() {
  currentYearSpan.textContent = new Date().getFullYear();
}
