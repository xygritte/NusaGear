/* ======================================================
   DRIVEEASE - ENHANCED MAIN APPLICATION SCRIPT
   ====================================================== */

import {
  dbGetCars,
  dbGetLocations,
  dbCheckAvailability,
  dbCreateBooking,
  dbTestConnection
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
    
    // Form Inputs
    pickupLocationSelect: document.getElementById('pickupLocation'),
    pickupDate: document.getElementById('pickupDate'),
    returnDate: document.getElementById('returnDate'),
    carType: document.getElementById('carType'),
    transmission: document.getElementById('transmission'),
    
    // Booking Modal
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
      const startDate = new Date(start);
      const endDate = new Date(end);
      const diffTime = Math.abs(endDate - startDate);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    },

    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    },

    setMinDateForInput(inputElement) {
      const today = new Date().toISOString().split('T')[0];
      inputElement.min = today;
      
      // Set default pickup to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      inputElement.value = tomorrowStr;
      
      // Set default return to pickup + 3 days
      const returnDate = new Date(tomorrow);
      returnDate.setDate(returnDate.getDate() + 3);
      elements.returnDate.value = returnDate.toISOString().split('T')[0];
    },

    showLoading(container) {
      container.innerHTML = `
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      `;
    },

    showError(message, container) {
      container.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>${message}</p>
          <button class="cta-button-outline" onclick="DriveEaseApp.retryLoading()">Retry</button>
        </div>
      `;
    },

    showMessage(element, message, type = 'info') {
      element.textContent = message;
      element.className = `message ${type}`;
      element.style.display = 'block';
      
      setTimeout(() => {
        element.style.display = 'none';
      }, 5000);
    },

    validateEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    },

    validatePhone(phone) {
      const re = /^[\+]?[1-9][\d]{0,15}$/;
      return re.test(phone.replace(/\D/g, ''));
    }
  };

  /* =====================
     RENDER FUNCTIONS
  ===================== */
  const render = {
    cars(data = state.cars) {
      if (!data || data.length === 0) {
        elements.carsContainer.innerHTML = `
          <div class="no-results">
            <i class="fas fa-car"></i>
            <h3>No cars available</h3>
            <p>Try adjusting your filters or check back later.</p>
          </div>
        `;
        return;
      }

      elements.carsContainer.innerHTML = data.map(car => `
        <div class="car-card" data-id="${car.id}" data-type="${car.category}">
          <div class="car-image-container">
            <img src="${car.image_url || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&h=250&fit=crop'}" 
                 alt="${car.name}" 
                 class="car-image"
                 onerror="this.src='https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&h=250&fit=crop'">
            ${car.is_featured ? '<span class="featured-badge">Featured</span>' : ''}
          </div>
          <div class="car-details">
            <div class="car-header">
              <h3>${car.name}</h3>
              <span class="car-type">${car.category}</span>
            </div>
            <div class="car-features">
              <span><i class="fas fa-cog"></i> ${car.transmission}</span>
              <span><i class="fas fa-users"></i> ${car.seats || 5} seats</span>
              <span><i class="fas fa-gas-pump"></i> ${car.fuel_type || 'Petrol'}</span>
            </div>
            <div class="car-price">
              <div>
                <strong class="price">${utils.formatCurrency(car.price_per_day)}</strong>
                <span class="price-label">/ day</span>
              </div>
              <button class="cta-button book-btn" data-id="${car.id}">
                <i class="fas fa-calendar-check"></i> Book Now
              </button>
            </div>
          </div>
        </div>
      `).join('');

      // Re-attach event listeners
      document.querySelectorAll('.book-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const carId = btn.dataset.id;
          DriveEaseApp.openBooking(carId);
        });
      });
    },

    locations(data = state.locations) {
      if (!data || data.length === 0) {
        elements.locationsContainer.innerHTML = '<p>No locations available</p>';
        return;
      }

      elements.locationsContainer.innerHTML = data.map(location => `
        <div class="location-card">
          <div class="location-icon">
            <i class="fas fa-map-marker-alt"></i>
          </div>
          <div class="location-details">
            <h3>${location.name}</h3>
            <p class="location-address">${location.address}, ${location.city}</p>
            <p class="location-hours"><i class="fas fa-clock"></i> ${location.hours || 'Mon-Sun: 8:00 AM - 10:00 PM'}</p>
            <p class="location-phone"><i class="fas fa-phone"></i> ${location.phone || '+1 (555) 123-4567'}</p>
          </div>
          <button class="cta-button-outline select-location" data-id="${location.id}">
            Select
          </button>
        </div>
      `).join('');

      // Add location selection functionality
      document.querySelectorAll('.select-location').forEach(btn => {
        btn.addEventListener('click', () => {
          elements.pickupLocationSelect.value = btn.dataset.id;
          window.scrollTo({
            top: elements.searchForm.offsetTop - 100,
            behavior: 'smooth'
          });
        });
      });
    },

    populateLocationSelect(data = state.locations) {
      elements.pickupLocationSelect.innerHTML = '<option value="">Select Location</option>';
      data.forEach(location => {
        const option = document.createElement('option');
        option.value = location.id;
        option.textContent = `${location.name} - ${location.city}`;
        elements.pickupLocationSelect.appendChild(option);
      });
    },

    updateCarFilters() {
      state.filters.category = elements.carType.value;
      state.filters.transmission = elements.transmission.value;
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
        
        state.cars = carsData;
        state.locations = locationsData;
        
        render.cars();
        render.locations();
        render.populateLocationSelect();
        
      } catch (error) {
        console.error('Error loading initial data:', error);
        utils.showError('Failed to load data. Please try again.', elements.carsContainer);
      } finally {
        state.isLoading = false;
      }
    },

    async searchCars(filters = {}) {
      try {
        state.isLoading = true;
        utils.showLoading(elements.carsContainer);
        
        const filteredCars = await dbGetCars(filters);
        render.cars(filteredCars);
        
      } catch (error) {
        console.error('Error searching cars:', error);
        utils.showError('Search failed. Please try again.', elements.carsContainer);
      } finally {
        state.isLoading = false;
      }
    },

    async filterByCategory(category) {
      elements.carType.value = category;
      render.updateCarFilters();
      await dataManager.searchCars(state.filters);
      
      // Scroll to cars section
      document.getElementById('cars').scrollIntoView({ behavior: 'smooth' });
    }
  };

  /* =====================
     BOOKING MANAGEMENT
  ===================== */
  const bookingManager = {
    async openBooking(carId) {
      try {
        state.selectedCar = state.cars.find(c => c.id == carId);
        if (!state.selectedCar) {
          utils.showMessage(elements.bookingMessage, 'Car not found.', 'error');
          return;
        }

        // Reset and populate form
        elements.bookingForm.reset();
        elements.bookingCarId.value = state.selectedCar.id;
        elements.bookingCar.value = state.selectedCar.name;
        elements.bookingDays.value = 3;

        // Show modal
        this.showModal(elements.bookingModal);
        
      } catch (error) {
        console.error('Error opening booking:', error);
        utils.showMessage(elements.bookingMessage, 'Failed to open booking form.', 'error');
      }
    },

    async submitBooking(event) {
      event.preventDefault();
      
      if (!this.validateBookingForm()) return;
      
      try {
        const formData = this.getFormData();
        
        // Check availability
        const isAvailable = await dbCheckAvailability(
          formData.carId,
          formData.pickupDate,
          formData.returnDate
        );
        
        if (!isAvailable) {
          utils.showMessage(elements.bookingMessage, 'Car is not available on selected dates.', 'error');
          return;
        }
        
        // Calculate total
        const days = utils.calculateDays(formData.pickupDate, formData.returnDate);
        const totalPrice = state.selectedCar.price_per_day * days;
        
        // Prepare booking data
        const bookingData = {
          car_id: formData.carId,
          car_name: state.selectedCar.name,
          customer_name: formData.name,
          customer_email: formData.email,
          customer_phone: formData.phone,
          pickup_location_id: formData.locationId,
          pickup_date: formData.pickupDate,
          return_date: formData.returnDate,
          total_days: days,
          total_price: totalPrice,
          notes: formData.notes,
          status: 'confirmed',
          booking_reference: utils.generateBookingRef()
        };
        
        // Save booking
        await dbCreateBooking(bookingData);
        
        // Show success
        this.showSuccess(bookingData.booking_reference);
        
      } catch (error) {
        console.error('Booking error:', error);
        utils.showMessage(elements.bookingMessage, 'Booking failed. Please try again.', 'error');
      }
    },

    validateBookingForm() {
      let isValid = true;
      
      // Clear previous errors
      document.querySelectorAll('.error-message').forEach(el => el.remove());
      document.querySelectorAll('.form-group').forEach(el => el.classList.remove('error'));
      
      // Validate name
      if (!elements.bookingName.value.trim()) {
        this.showFieldError(elements.bookingName, 'Name is required');
        isValid = false;
      }
      
      // Validate email
      if (!elements.bookingEmail.value.trim()) {
        this.showFieldError(elements.bookingEmail, 'Email is required');
        isValid = false;
      } else if (!utils.validateEmail(elements.bookingEmail.value)) {
        this.showFieldError(elements.bookingEmail, 'Invalid email address');
        isValid = false;
      }
      
      // Validate phone
      if (!elements.bookingPhone.value.trim()) {
        this.showFieldError(elements.bookingPhone, 'Phone number is required');
        isValid = false;
      } else if (!utils.validatePhone(elements.bookingPhone.value)) {
        this.showFieldError(elements.bookingPhone, 'Invalid phone number');
        isValid = false;
      }
      
      // Validate location
      if (!elements.pickupLocationSelect.value) {
        this.showFieldError(elements.pickupLocationSelect, 'Please select a location');
        isValid = false;
      }
      
      // Validate dates
      if (!elements.pickupDate.value || !elements.returnDate.value) {
        this.showFieldError(elements.pickupDate, 'Please select dates');
        isValid = false;
      }
      
      return isValid;
    },

    getFormData() {
      const location = state.locations.find(l => l.id == elements.pickupLocationSelect.value);
      
      return {
        carId: elements.bookingCarId.value,
        name: elements.bookingName.value.trim(),
        email: elements.bookingEmail.value.trim(),
        phone: elements.bookingPhone.value.trim(),
        locationId: elements.pickupLocationSelect.value,
        pickupLocation: location ? `${location.name}, ${location.city}` : '',
        pickupDate: elements.pickupDate.value,
        returnDate: elements.returnDate.value,
        days: parseInt(elements.bookingDays.value),
        notes: elements.bookingNotes.value.trim()
      };
    },

    showFieldError(input, message) {
      const formGroup = input.closest('.form-group');
      formGroup.classList.add('error');
      
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.textContent = message;
      formGroup.appendChild(errorDiv);
    },

    showModal(modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    },

    closeModal(modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    },

    showSuccess(bookingRef) {
      elements.bookingRef.textContent = bookingRef;
      this.closeModal(elements.bookingModal);
      this.showModal(elements.successModal);
    }
  };

  /* =====================
     EVENT HANDLERS
  ===================== */
  const eventHandlers = {
    setupEventListeners() {
      // Search form
      elements.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        render.updateCarFilters();
        dataManager.searchCars(state.filters);
      });

      // Booking form
      elements.bookingForm.addEventListener('submit', (e) => {
        bookingManager.submitBooking(e);
      });

      // Modal controls
      elements.closeModal.addEventListener('click', () => {
        bookingManager.closeModal(elements.bookingModal);
      });
      
      elements.closeSuccessModal.addEventListener('click', () => {
        bookingManager.closeModal(elements.successModal);
      });
      
      elements.closeSuccessBtn.addEventListener('click', () => {
        bookingManager.closeModal(elements.successModal);
      });

      // Mobile menu
      elements.mobileMenuBtn.addEventListener('click', this.toggleMobileMenu);
      
      // Book Now button
      elements.bookNowBtn.addEventListener('click', () => {
        document.getElementById('cars').scrollIntoView({ behavior: 'smooth' });
      });
      
      // Explore Cars button
      elements.exploreCarsBtn.addEventListener('click', () => {
        document.getElementById('cars').scrollIntoView({ behavior: 'smooth' });
      });

      // Filter links in footer
      document.querySelectorAll('.filter-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const category = e.target.dataset.type;
          dataManager.filterByCategory(category);
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
      elements.pickupDate.addEventListener('change', () => {
        if (elements.returnDate.value && new Date(elements.returnDate.value) <= new Date(elements.pickupDate.value)) {
          const minReturn = new Date(elements.pickupDate.value);
          minReturn.setDate(minReturn.getDate() + 1);
          elements.returnDate.value = minReturn.toISOString().split('T')[0];
        }
        elements.returnDate.min = elements.pickupDate.value;
      });
    },

    toggleMobileMenu() {
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
      // Set current year
      if (elements.currentYear) {
        elements.currentYear.textContent = new Date().getFullYear();
      }

      // Set min dates
      utils.setMinDateForInput(elements.pickupDate);
      if (elements.returnDate) {
        elements.returnDate.min = elements.pickupDate.value;
      }

      // Test database connection
      try {
        const connected = await dbTestConnection();
        if (!connected) {
          throw new Error('Database connection failed');
        }
      } catch (error) {
        console.error('Database connection error:', error);
        utils.showError('Cannot connect to server. Some features may be unavailable.', elements.carsContainer);
      }

      // Load data
      await dataManager.loadInitialData();

      // Setup event listeners
      eventHandlers.setupEventListeners();

      // Add CSS for mobile menu
      this.addMobileMenuStyles();
      
      console.log('DriveEase App initialized successfully');
    },

    addMobileMenuStyles() {
      const style = document.createElement('style');
      style.textContent = `
        @media (max-width: 768px) {
          #navMenu {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            box-shadow: var(--shadow-md);
            padding: 20px;
            flex-direction: column;
            gap: 15px;
            z-index: 1000;
          }
          
          #navMenu.show {
            display: flex;
            animation: slideDown 0.3s ease;
          }
          
          .loading-state, .error-state {
            text-align: center;
            padding: 40px;
          }
          
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--primary-light);
            border-top-color: var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          
          .error-state i {
            font-size: 48px;
            color: #ef4444;
            margin-bottom: 20px;
          }
          
          .featured-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background: var(--accent-color);
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
          }
        }
      `;
      document.head.appendChild(style);
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
    filterByCategory: dataManager.filterByCategory.bind(dataManager),
    
    // Booking Management
    openBooking: bookingManager.openBooking.bind(bookingManager),
    closeBooking: () => bookingManager.closeModal(elements.bookingModal),
    
    // Utility Functions
    formatCurrency: utils.formatCurrency,
    calculateDays: utils.calculateDays,
    
    // State Access (for debugging)
    getState: () => ({ ...state }),
    getElements: () => ({ ...elements })
  };
})();

/* =====================
   APPLICATION START
===================== */
document.addEventListener('DOMContentLoaded', () => {
  // Add loading indicator to body
  document.body.insertAdjacentHTML('beforeend', `
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
  `);
  
  // Initialize app
  DriveEaseApp.init().finally(() => {
    // Remove loading indicator
    const loader = document.getElementById('appLoader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 300);
    }
  });
});

/* =====================
   GLOBAL ACCESS
===================== */
// Make app accessible globally for debugging
window.DriveEaseApp = DriveEaseApp;

// Add global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // You could send this to an error tracking service
});

// Add unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});