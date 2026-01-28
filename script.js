/* ======================================================
   DRIVEEASE - FIXED BOOKING SCRIPT (WITHOUT NOTES FIELD)
   ====================================================== */

import {
  dbGetCars,
  dbGetLocations,
  dbCheckAvailability,
  dbCreateBooking,
  dbTestConnection,
  dbCheckSchema,
  dbGetBookings
} from './db.js';

/* =====================
   APPLICATION MODULE
===================== */
const DriveEaseApp = (() => {
  /* =====================
     DOM ELEMENTS CACHE
  ===================== */
  const elements = {
    // Containers
    carsContainer: document.getElementById('carsContainer'),
    locationsContainer: document.getElementById('locationsContainer'),
    
    // Forms
    searchForm: document.getElementById('searchForm'),
    bookingForm: document.getElementById('bookingForm'),
    
    // Search Form Inputs
    pickupLocationSelect: document.getElementById('pickupLocation'),
    pickupDate: document.getElementById('pickupDate'),
    returnDate: document.getElementById('returnDate'),
    carType: document.getElementById('carType'),
    transmission: document.getElementById('transmission'),
    
    // Booking Form Inputs
    bookingCarId: document.getElementById('bookingCarId'),
    bookingCar: document.getElementById('bookingCar'),
    bookingName: document.getElementById('bookingName'),
    bookingEmail: document.getElementById('bookingEmail'),
    bookingPhone: document.getElementById('bookingPhone'),
    bookingDays: document.getElementById('bookingDays'),
    bookingNotes: document.getElementById('bookingNotes'),
    
    // Modals
    bookingModal: document.getElementById('bookingModal'),
    successModal: document.getElementById('successModal'),
    
    // Modal Elements
    closeModal: document.getElementById('closeModal'),
    closeSuccessModal: document.getElementById('closeSuccessModal'),
    closeSuccessBtn: document.getElementById('closeSuccessBtn'),
    bookingRef: document.getElementById('bookingRef'),
    
    // Buttons
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    bookNowBtn: document.getElementById('bookNowBtn'),
    exploreCarsBtn: document.getElementById('exploreCarsBtn'),
    
    // Other
    navMenu: document.getElementById('navMenu'),
    currentYear: document.getElementById('currentYear'),
    bookingMessage: document.getElementById('bookingMessage')
  };

  /* =====================
     APPLICATION STATE
  ===================== */
  const state = {
    cars: [],
    locations: [],
    selectedCar: null,
    filters: {
      category: '',
      transmission: ''
    },
    isLoading: false
  };

  /* =====================
     UTILITY FUNCTIONS
  ===================== */
  const utils = {
    formatCurrency(value) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(value);
    },

    generateBookingRef() {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      return `DE-${timestamp}-${random}`;
    },

    calculateDays(start, end) {
      if (!start || !end) return 1;
      const startDate = new Date(start);
      const endDate = new Date(end);
      const diffTime = Math.abs(endDate - startDate);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    },

    showMessage(element, message, type = 'info') {
      if (!element) return;
      
      element.textContent = message;
      element.className = `message ${type}`;
      element.style.display = 'block';
      
      // Set color based on type
      if (type === 'error') {
        element.style.color = '#ef4444';
        element.style.backgroundColor = '#fef2f2';
        element.style.border = '1px solid #fecaca';
      } else if (type === 'success') {
        element.style.color = '#10b981';
        element.style.backgroundColor = '#f0fdf4';
        element.style.border = '1px solid #bbf7d0';
      } else {
        element.style.color = '#3b82f6';
        element.style.backgroundColor = '#eff6ff';
        element.style.border = '1px solid #bfdbfe';
      }
      
      element.style.padding = '12px';
      element.style.borderRadius = '6px';
      element.style.marginTop = '15px';
      
      setTimeout(() => {
        element.style.display = 'none';
      }, 5000);
    },

    validateEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    },

    validatePhone(phone) {
      // Accepts numbers, spaces, dashes, parentheses, and +
      const re = /^[\+]?[1-9][\d\s\-\(\)]{8,}$/;
      return re.test(phone);
    },

    setMinDateForInput() {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Set pickup date (minimum today)
      if (elements.pickupDate) {
        elements.pickupDate.min = todayStr;
        
        // Set default pickup to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        elements.pickupDate.value = tomorrowStr;
      }
      
      // Set return date (minimum pickup date + 1 day)
      if (elements.returnDate && elements.pickupDate) {
        const pickupDate = new Date(elements.pickupDate.value);
        const minReturn = new Date(pickupDate);
        minReturn.setDate(minReturn.getDate() + 1);
        elements.returnDate.min = minReturn.toISOString().split('T')[0];
        
        // Set default return to pickup + 3 days
        const defaultReturn = new Date(pickupDate);
        defaultReturn.setDate(defaultReturn.getDate() + 3);
        elements.returnDate.value = defaultReturn.toISOString().split('T')[0];
      }
    }
  };

  /* =====================
     RENDER FUNCTIONS
  ===================== */
  const render = {
    cars(data = state.cars) {
      if (!elements.carsContainer) return;
      
      if (!data || data.length === 0) {
        elements.carsContainer.innerHTML = `
          <div class="no-results" style="text-align: center; padding: 40px; grid-column: 1 / -1;">
            <i class="fas fa-car" style="font-size: 48px; color: #9ca3af; margin-bottom: 20px;"></i>
            <h3 style="color: #4b5563; margin-bottom: 10px;">No cars available</h3>
            <p style="color: #6b7280;">Try adjusting your filters or check back later.</p>
          </div>
        `;
        return;
      }

      elements.carsContainer.innerHTML = data.map(car => `
        <div class="car-card" data-id="${car.id}" data-type="${car.category}">
          <img src="${car.image_url || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&h=250&fit=crop'}" 
               alt="${car.name}"
               style="width: 100%; height: 200px; object-fit: cover;">
          <div class="car-details">
            <h3>${car.name}</h3>
            <p style="color: #6b7280; margin: 5px 0;">${car.category} • ${car.transmission}</p>
            <p style="font-size: 24px; font-weight: bold; color: #2563eb; margin: 10px 0;">
              ${utils.formatCurrency(car.price_per_day)} <span style="font-size: 14px; font-weight: normal; color: #6b7280;">/ day</span>
            </p>
            <button class="cta-button book-btn" data-id="${car.id}" style="width: 100%; margin-top: 10px;">
              <i class="fas fa-calendar-check"></i> Book Now
            </button>
          </div>
        </div>
      `).join('');

      // Attach event listeners to book buttons
      this.attachBookButtonListeners();
    },

    attachBookButtonListeners() {
      // Add click event to all book buttons
      document.querySelectorAll('.book-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const carId = btn.getAttribute('data-id');
          if (carId) {
            DriveEaseApp.openBooking(carId);
          }
        });
      });
    },

    locations(data = state.locations) {
      if (!elements.locationsContainer) return;
      
      if (!data || data.length === 0) {
        elements.locationsContainer.innerHTML = '<p style="text-align: center; color: #6b7280;">No locations available</p>';
        return;
      }

      elements.locationsContainer.innerHTML = data.map(location => `
        <div class="location-card">
          <h3>${location.name}</h3>
          <p style="color: #6b7280; margin-top: 5px;">
            <i class="fas fa-map-marker-alt" style="color: #2563eb; margin-right: 8px;"></i>
            ${location.address}, ${location.city}
          </p>
        </div>
      `).join('');
    },

    populateLocationSelect(data = state.locations) {
      if (!elements.pickupLocationSelect) return;
      
      elements.pickupLocationSelect.innerHTML = '<option value="">Select Location</option>';
      data.forEach(location => {
        const option = document.createElement('option');
        option.value = location.id;
        option.textContent = `${location.name} - ${location.city}`;
        elements.pickupLocationSelect.appendChild(option);
      });
    }
  };

  /* =====================
     DATA MANAGEMENT
  ===================== */
  const dataManager = {
    async loadInitialData() {
      try {
        state.isLoading = true;
        
        // Load cars and locations in parallel
        const [carsData, locationsData] = await Promise.all([
          dbGetCars(),
          dbGetLocations()
        ]);
        
        state.cars = carsData || [];
        state.locations = locationsData || [];
        
        render.cars();
        render.locations();
        render.populateLocationSelect();
        
        console.log('Data loaded successfully:', {
          cars: state.cars.length,
          locations: state.locations.length
        });
        
      } catch (error) {
        console.error('Error loading initial data:', error);
        utils.showMessage(elements.bookingMessage, 'Failed to load data. Please try again.', 'error');
      } finally {
        state.isLoading = false;
      }
    },

    async searchCars(filters = {}) {
      try {
        state.isLoading = true;
        
        const filteredCars = await dbGetCars(filters);
        render.cars(filteredCars);
        
      } catch (error) {
        console.error('Error searching cars:', error);
        utils.showMessage(elements.bookingMessage, 'Search failed. Please try again.', 'error');
      } finally {
        state.isLoading = false;
      }
    }
  };

  /* =====================
     BOOKING MANAGEMENT - SIMPLIFIED
  ===================== */
  const bookingManager = {
    async openBooking(carId) {
      try {
        console.log('Opening booking for car ID:', carId);
        
        state.selectedCar = state.cars.find(c => c.id == carId);
        if (!state.selectedCar) {
          console.error('Car not found:', carId);
          utils.showMessage(elements.bookingMessage, 'Car not found.', 'error');
          return;
        }

        // Reset form
        if (elements.bookingForm) {
          elements.bookingForm.reset();
        }
        
        // Populate car info
        if (elements.bookingCarId) {
          elements.bookingCarId.value = state.selectedCar.id;
        }
        
        if (elements.bookingCar) {
          elements.bookingCar.value = state.selectedCar.name;
        }

        // Show modal
        this.showModal(elements.bookingModal);
        
        console.log('Booking modal opened for:', state.selectedCar.name);
        
      } catch (error) {
        console.error('Error opening booking:', error);
        utils.showMessage(elements.bookingMessage, 'Failed to open booking form.', 'error');
      }
    },

    async submitBooking(event) {
      event.preventDefault();
      
      console.log('Submitting booking...');
      
      // Validate required fields
      if (!this.validateBookingForm()) {
        return;
      }
      
      try {
        // Get form data
        const formData = this.getFormData();
        console.log('Form data:', formData);
        
        if (!state.selectedCar) {
          utils.showMessage(elements.bookingMessage, 'No car selected.', 'error');
          return;
        }
        
        // Use dates from search form
        const pickupDate = elements.pickupDate ? elements.pickupDate.value : '';
        const returnDate = elements.returnDate ? elements.returnDate.value : '';
        
        if (!pickupDate || !returnDate) {
          utils.showMessage(elements.bookingMessage, 'Please select dates in the search form.', 'error');
          return;
        }
        
        console.log('Checking availability for dates:', pickupDate, returnDate);
        
        // Check availability
        const isAvailable = await dbCheckAvailability(
          state.selectedCar.id,
          pickupDate,
          returnDate
        );
        
        console.log('Availability check result:', isAvailable);
        
        if (!isAvailable) {
          utils.showMessage(elements.bookingMessage, 'Car is not available on selected dates.', 'error');
          return;
        }
        
        // Calculate total
        const days = utils.calculateDays(pickupDate, returnDate);
        const totalPrice = state.selectedCar.price_per_day * days;
        
        // Get location
        let pickupLocationText = 'Selected Location';
        if (elements.pickupLocationSelect && elements.pickupLocationSelect.value) {
          const selectedOption = elements.pickupLocationSelect.options[elements.pickupLocationSelect.selectedIndex];
          pickupLocationText = selectedOption ? selectedOption.text : 'Selected Location';
        }
        
        // Prepare booking data WITHOUT notes field
        const bookingData = {
          car_id: state.selectedCar.id,
          car_name: state.selectedCar.name,
          customer_name: formData.name,
          customer_email: formData.email,
          customer_phone: formData.phone,
          pickup_location: pickupLocationText,
          pickup_date: pickupDate,
          return_date: returnDate,
          total_days: days,
          total_price: totalPrice,
          status: 'confirmed',
          booking_reference: utils.generateBookingRef()
          // DO NOT include notes field
        };
        
        console.log('Saving booking (without notes):', bookingData);
        
        // Save booking
        const savedBooking = await dbCreateBooking(bookingData);
        console.log('Booking saved successfully:', savedBooking);
        
        // Show success modal
        this.showSuccess(bookingData.booking_reference);
        
      } catch (error) {
        console.error('Booking error:', error);
        utils.showMessage(elements.bookingMessage, 'Booking failed: ' + (error.message || 'Unknown error'), 'error');
      }
    },

    validateBookingForm() {
      // Clear previous messages
      if (elements.bookingMessage) {
        elements.bookingMessage.style.display = 'none';
      }
      
      // Check required fields
      if (!elements.bookingName || !elements.bookingName.value.trim()) {
        utils.showMessage(elements.bookingMessage, 'Please enter your name.', 'error');
        return false;
      }
      
      if (!elements.bookingEmail || !elements.bookingEmail.value.trim()) {
        utils.showMessage(elements.bookingMessage, 'Please enter your email.', 'error');
        return false;
      }
      
      if (!utils.validateEmail(elements.bookingEmail.value)) {
        utils.showMessage(elements.bookingMessage, 'Please enter a valid email address.', 'error');
        return false;
      }
      
      if (!elements.bookingPhone || !elements.bookingPhone.value.trim()) {
        utils.showMessage(elements.bookingMessage, 'Please enter your phone number.', 'error');
        return false;
      }
      
      // Check search form fields
      if (!elements.pickupLocationSelect || !elements.pickupLocationSelect.value) {
        utils.showMessage(elements.bookingMessage, 'Please select a pickup location in the search form.', 'error');
        return false;
      }
      
      if (!elements.pickupDate || !elements.pickupDate.value || !elements.returnDate || !elements.returnDate.value) {
        utils.showMessage(elements.bookingMessage, 'Please select pickup and return dates in the search form.', 'error');
        return false;
      }
      
      return true;
    },

    getFormData() {
      return {
        name: elements.bookingName ? elements.bookingName.value.trim() : '',
        email: elements.bookingEmail ? elements.bookingEmail.value.trim() : '',
        phone: elements.bookingPhone ? elements.bookingPhone.value.trim() : ''
      };
    },

    showModal(modal) {
      if (!modal) return;
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    },

    closeModal(modal) {
      if (!modal) return;
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    },

    showSuccess(bookingRef) {
      if (elements.bookingRef) {
        elements.bookingRef.textContent = bookingRef;
      }
      this.closeModal(elements.bookingModal);
      this.showModal(elements.successModal);
    }
  };

  /* =====================
     EVENT HANDLERS
  ===================== */
  const eventHandlers = {
    setupEventListeners() {
      console.log('Setting up event listeners...');
      
      // Search form
      if (elements.searchForm) {
        elements.searchForm.addEventListener('submit', (e) => {
          e.preventDefault();
          dataManager.searchCars({
            category: elements.carType ? elements.carType.value : '',
            transmission: elements.transmission ? elements.transmission.value : ''
          });
        });
      }

      // Booking form
      if (elements.bookingForm) {
        elements.bookingForm.addEventListener('submit', (e) => {
          bookingManager.submitBooking(e);
        });
      }

      // Modal controls
      if (elements.closeModal) {
        elements.closeModal.addEventListener('click', () => {
          bookingManager.closeModal(elements.bookingModal);
        });
      }
      
      if (elements.closeSuccessModal) {
        elements.closeSuccessModal.addEventListener('click', () => {
          bookingManager.closeModal(elements.successModal);
        });
      }
      
      if (elements.closeSuccessBtn) {
        elements.closeSuccessBtn.addEventListener('click', () => {
          bookingManager.closeModal(elements.successModal);
        });
      }

      // Mobile menu
      if (elements.mobileMenuBtn) {
        elements.mobileMenuBtn.addEventListener('click', this.toggleMobileMenu);
      }
      
      // Book Now button in header
      if (elements.bookNowBtn) {
        elements.bookNowBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const carsSection = document.getElementById('cars');
          if (carsSection) {
            carsSection.scrollIntoView({ behavior: 'smooth' });
          }
        });
      }
      
      // Explore Cars button
      if (elements.exploreCarsBtn) {
        elements.exploreCarsBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const carsSection = document.getElementById('cars');
          if (carsSection) {
            carsSection.scrollIntoView({ behavior: 'smooth' });
          }
        });
      }

      // Filter links in footer
      document.querySelectorAll('.filter-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const category = e.target.dataset.type || e.target.closest('a').dataset.type;
          if (category) {
            elements.carType.value = category;
            dataManager.searchCars({ category });
          }
        });
      });

      // Close modals on outside click
      window.addEventListener('click', (e) => {
        if (e.target === elements.bookingModal) {
          bookingManager.closeModal(elements.bookingModal);
        }
        if (e.target === elements.successModal) {
          bookingManager.closeModal(elements.successModal);
        }
      });

      // Date validation
      if (elements.pickupDate && elements.returnDate) {
        elements.pickupDate.addEventListener('change', () => {
          if (elements.returnDate.value && new Date(elements.returnDate.value) <= new Date(elements.pickupDate.value)) {
            const minReturn = new Date(elements.pickupDate.value);
            minReturn.setDate(minReturn.getDate() + 1);
            elements.returnDate.value = minReturn.toISOString().split('T')[0];
          }
          elements.returnDate.min = elements.pickupDate.value;
        });
      }
      
      console.log('Event listeners setup complete');
    },

    toggleMobileMenu() {
      if (!elements.navMenu) return;
      
      elements.navMenu.classList.toggle('show');
      const icon = elements.mobileMenuBtn.querySelector('i');
      if (elements.navMenu.classList.contains('show')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
      } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
      }
    }
  };

  /* =====================
     INITIALIZATION
  ===================== */
  const init = {
    async start() {
      console.log('Initializing DriveEase App...');
      
      // Set current year in footer
      if (elements.currentYear) {
        elements.currentYear.textContent = new Date().getFullYear();
      }

      // Set min dates for forms
      utils.setMinDateForInput();

      // Test database connection
      try {
        console.log('Testing database connection...');
        const connected = await dbTestConnection();
        if (!connected) {
          throw new Error('Database connection failed');
        }
        console.log('Database connection successful');
        
        // Check schema
        await dbCheckSchema();
        
      } catch (error) {
        console.error('Database connection error:', error);
        utils.showMessage(elements.bookingMessage, 'Cannot connect to server. Some features may be unavailable.', 'error');
      }

      // Load data
      await dataManager.loadInitialData();

      // Setup event listeners
      eventHandlers.setupEventListeners();
      
      console.log('DriveEase App initialized successfully');
    }
  };

  /* =====================
     PUBLIC API
  ===================== */
  return {
    // Initialization
    init: init.start.bind(init),
    retryLoading: dataManager.loadInitialData.bind(dataManager),
    
    // Car Management
    getCars: () => state.cars,
    searchCars: dataManager.searchCars.bind(dataManager),
    
    // Booking Management
    openBooking: bookingManager.openBooking.bind(bookingManager),
    closeBooking: () => bookingManager.closeModal(elements.bookingModal),
    
    // Utility Functions
    formatCurrency: utils.formatCurrency,
    
    // Debug
    getState: () => ({ ...state }),
    getElements: () => ({ ...elements }),
    checkBookings: dbGetBookings
  };
})();

/* =====================
   APPLICATION START
===================== */
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, starting app...');
  
  // Add loading indicator
  const loaderHTML = `
    <div id="appLoader" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      transition: opacity 0.3s;
    ">
      <div style="
        width: 60px;
        height: 60px;
        border: 4px solid #e0e7ff;
        border-top-color: #2563eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
      "></div>
      <p style="color: #4b5563; font-family: 'Poppins', sans-serif;">Loading DriveEase...</p>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', loaderHTML);
  
  // Add spin animation
  const spinStyle = document.createElement('style');
  spinStyle.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(spinStyle);
  
  // Initialize app
  DriveEaseApp.init().then(() => {
    console.log('App initialization complete');
  }).catch(error => {
    console.error('App initialization failed:', error);
  }).finally(() => {
    // Remove loading indicator
    setTimeout(() => {
      const loader = document.getElementById('appLoader');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
          if (loader.parentNode) {
            loader.parentNode.removeChild(loader);
          }
        }, 300);
      }
    }, 500);
  });
});

/* =====================
   GLOBAL ACCESS & DEBUG HELPERS
===================== */
window.DriveEaseApp = DriveEaseApp;

// Test booking helper
window.testBooking = function(carId = null) {
  if (!carId && DriveEaseApp.getState().cars.length > 0) {
    carId = DriveEaseApp.getState().cars[0].id;
  }
  
  if (carId) {
    console.log('Testing booking for car ID:', carId);
    DriveEaseApp.openBooking(carId);
    
    // Auto-fill form for testing
    setTimeout(() => {
      const nameInput = document.getElementById('bookingName');
      const emailInput = document.getElementById('bookingEmail');
      const phoneInput = document.getElementById('bookingPhone');
      
      if (nameInput) nameInput.value = 'Test User';
      if (emailInput) emailInput.value = 'test@example.com';
      if (phoneInput) phoneInput.value = '+1234567890';
      
      console.log('Test form auto-filled. Please ensure location and dates are selected in search form.');
    }, 500);
  } else {
    console.error('No cars available for testing');
  }
};

// Check database schema
window.checkSchema = function() {
  dbCheckSchema().then(result => {
    console.log('Schema check result:', result);
  });
};

// View recent bookings
window.viewBookings = function() {
  dbGetBookings().then(bookings => {
    console.log('Recent bookings:', bookings);
  });
};

console.log('DriveEase App loaded. Debug helpers:');
console.log('• testBooking() - Test booking functionality');
console.log('• checkSchema() - Check database structure');
console.log('• viewBookings() - View recent bookings');
console.log('• DriveEaseApp.getState() - View app state');