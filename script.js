// Supabase Configuration - MENGGUNAKAN KREDENSIAL ANDA
const supabaseUrl = 'https://bpfwkzawbmitlujsjgrh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwZndremF3Ym1pdGx1anNqZ3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MzM4NDMsImV4cCI6MjA4NTEwOTg0M30.BWInso3y8BP_zy6ZmAMKTI1FfpuVDsrnjEs5uPKdJJo';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// DOM elements
const carsContainer = document.getElementById('carsContainer');
const locationsContainer = document.getElementById('locationsContainer');
const bookingModal = document.getElementById('bookingModal');
const successModal = document.getElementById('successModal');
const closeModal = document.getElementById('closeModal');
const closeSuccessModal = document.getElementById('closeSuccessModal');
const closeSuccessBtn = document.getElementById('closeSuccessBtn');
const bookNowBtn = document.getElementById('bookNowBtn');
const exploreCarsBtn = document.getElementById('exploreCarsBtn');
const bookingForm = document.getElementById('bookingForm');
const bookingCar = document.getElementById('bookingCar');
const bookingCarId = document.getElementById('bookingCarId');
const searchForm = document.getElementById('searchForm');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navMenu = document.getElementById('navMenu');
const pickupLocationSelect = document.getElementById('pickupLocation');
const currentYearSpan = document.getElementById('currentYear');
const bookingRefSpan = document.getElementById('bookingRef');

// State
let selectedCar = null;
let allCars = [];
let allLocations = [];

// Initialize date inputs with today and tomorrow
function initializeDates() {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    const todayFormatted = today.toISOString().split('T')[0];
    const tomorrowFormatted = tomorrow.toISOString().split('T')[0];
    
    document.getElementById('pickupDate').value = todayFormatted;
    document.getElementById('pickupDate').min = todayFormatted;
    document.getElementById('returnDate').value = tomorrowFormatted;
    document.getElementById('returnDate').min = tomorrowFormatted;
}

// Fetch cars from Supabase
async function fetchCars() {
    try {
        console.log('Fetching cars from Supabase...');
        const { data, error } = await supabase
            .from('cars')
            .select('*')
            .eq('is_available', true)
            .order('price_per_day', { ascending: true });
        
        if (error) {
            console.error('Error fetching cars:', error);
            throw error;
        }
        
        console.log('Cars fetched successfully:', data);
        allCars = data || [];
        renderCars(allCars);
        return data;
    } catch (error) {
        console.error('Error fetching cars:', error);
        // Fallback to sample data if Supabase fails
        const sampleCars = [
            {
                id: 1,
                name: "Toyota Camry",
                type: "Sedan",
                category: "economy",
                transmission: "Automatic",
                seats: 5,
                luggage: 2,
                image_url: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1064&q=80",
                price_per_day: 45
            },
            {
                id: 2,
                name: "Ford Explorer",
                type: "SUV",
                category: "suv",
                transmission: "Automatic",
                seats: 7,
                luggage: 4,
                image_url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1064&q=80",
                price_per_day: 75
            }
        ];
        allCars = sampleCars;
        renderCars(sampleCars);
        return sampleCars;
    }
}

// Fetch locations from Supabase
async function fetchLocations() {
    try {
        console.log('Fetching locations from Supabase...');
        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .eq('is_active', true)
            .order('city');
        
        if (error) {
            console.error('Error fetching locations:', error);
            throw error;
        }
        
        console.log('Locations fetched successfully:', data);
        allLocations = data || [];
        renderLocations(allLocations);
        populateLocationSelect(allLocations);
        return data;
    } catch (error) {
        console.error('Error fetching locations:', error);
        // Fallback to sample locations
        const sampleLocations = [
            { id: 1, name: 'Main Office', address: '123 Drive Street', city: 'Cityville', phone: '+1 (555) 123-4567' },
            { id: 2, name: 'Airport Branch', address: '456 Airport Road', city: 'Cityville', phone: '+1 (555) 987-6543' }
        ];
        allLocations = sampleLocations;
        renderLocations(sampleLocations);
        populateLocationSelect(sampleLocations);
        return sampleLocations;
    }
}

// Populate location select dropdown
function populateLocationSelect(locations) {
    pickupLocationSelect.innerHTML = '<option value="">Select Location</option>';
    
    locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location.id;
        option.textContent = `${location.name} - ${location.city}`;
        pickupLocationSelect.appendChild(option);
    });
}

// Render cars to the page
function renderCars(carsArray) {
    carsContainer.innerHTML = '';
    
    if (carsArray.length === 0) {
        carsContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <h3>No cars found matching your criteria</h3>
                <p>Try adjusting your search filters</p>
            </div>
        `;
        return;
    }
    
    carsArray.forEach(car => {
        const carCard = document.createElement('div');
        carCard.className = 'car-card';
        carCard.innerHTML = `
            <img src="${car.image_url}" alt="${car.name}" class="car-image">
            <div class="car-details">
                <h3>${car.name}</h3>
                <p>${car.type}</p>
                <div class="car-features">
                    <span><i class="fas fa-user-friends"></i> ${car.seats} seats</span>
                    <span><i class="fas fa-suitcase"></i> ${car.luggage} luggage</span>
                    <span><i class="fas fa-cog"></i> ${car.transmission}</span>
                </div>
                <div class="car-price">
                    <div class="price">$${car.price_per_day}<span>/day</span></div>
                    <button class="cta-button book-car-btn" data-id="${car.id}" data-name="${car.name}">Book Now</button>
                </div>
            </div>
        `;
        carsContainer.appendChild(carCard);
    });
    
    // Add event listeners to book buttons
    document.querySelectorAll('.book-car-btn').forEach(button => {
        button.addEventListener('click', function() {
            const carId = this.getAttribute('data-id');
            const carName = this.getAttribute('data-name');
            selectedCar = allCars.find(car => car.id == carId);
            openBookingModal(carName, carId);
        });
    });
}

// Render locations to the page
function renderLocations(locationsArray) {
    if (!locationsContainer) return;
    
    locationsContainer.innerHTML = '';
    
    locationsArray.forEach(location => {
        const locationCard = document.createElement('div');
        locationCard.className = 'location-card';
        locationCard.innerHTML = `
            <h3>${location.name}</h3>
            <div class="location-address">
                <p><i class="fas fa-map-marker-alt"></i> ${location.address}</p>
                <p><i class="fas fa-city"></i> ${location.city}</p>
                ${location.phone ? `<p><i class="fas fa-phone"></i> ${location.phone}</p>` : ''}
            </div>
            <button class="cta-button select-location-btn" data-id="${location.id}" style="width: 100%;">
                Select This Location
            </button>
        `;
        locationsContainer.appendChild(locationCard);
    });
    
    // Add event listeners to location buttons
    document.querySelectorAll('.select-location-btn').forEach(button => {
        button.addEventListener('click', function() {
            const locationId = this.getAttribute('data-id');
            const selectedLocation = allLocations.find(loc => loc.id == locationId);
            if (selectedLocation) {
                pickupLocationSelect.value = locationId;
                // Scroll to search form
                document.querySelector('.search-form').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Open booking modal
function openBookingModal(carName, carId) {
    bookingCar.value = carName;
    bookingCarId.value = carId;
    bookingModal.style.display = 'flex';
}

// Close booking modal
function closeBookingModal() {
    bookingModal.style.display = 'none';
    bookingForm.reset();
    document.getElementById('bookingMessage').style.display = 'none';
}

// Close success modal
function closeSuccessModalFunc() {
    successModal.style.display = 'none';
}

// Show message in booking form
function showBookingMessage(message, type = 'error') {
    const messageDiv = document.getElementById('bookingMessage');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
}

// Calculate total price
function calculateTotalPrice(pricePerDay, days) {
    return pricePerDay * days;
}

// Generate booking reference
function generateBookingReference() {
    return 'BK-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
}

// Handle booking form submission
async function handleBooking(e) {
    e.preventDefault();
    
    const carId = bookingCarId.value;
    const carName = bookingCar.value;
    const name = document.getElementById('bookingName').value.trim();
    const email = document.getElementById('bookingEmail').value.trim();
    const phone = document.getElementById('bookingPhone').value.trim();
    const days = parseInt(document.getElementById('bookingDays').value);
    const notes = document.getElementById('bookingNotes').value.trim();
    const pickupLocationId = document.getElementById('pickupLocation').value;
    const pickupDate = document.getElementById('pickupDate').value;
    const returnDate = document.getElementById('returnDate').value;
    
    // Validation
    if (!pickupLocationId) {
        showBookingMessage('Please select a pickup location', 'error');
        return;
    }
    
    if (!pickupDate || !returnDate) {
        showBookingMessage('Please select both pickup and return dates', 'error');
        return;
    }
    
    if (new Date(pickupDate) > new Date(returnDate)) {
        showBookingMessage('Return date must be after pickup date', 'error');
        return;
    }
    
    // Calculate total price
    const car = allCars.find(c => c.id == carId);
    if (!car) {
        showBookingMessage('Car not found. Please try again.', 'error');
        return;
    }
    
    const totalPrice = calculateTotalPrice(car.price_per_day, days);
    const bookingRef = generateBookingReference();
    
    try {
        // Insert booking into Supabase
        const { data, error } = await supabase
            .from('bookings')
            .insert([
                {
                    car_id: carId,
                    car_name: carName,
                    customer_name: name,
                    customer_email: email,
                    customer_phone: phone,
                    pickup_location: pickupLocationId,
                    pickup_date: pickupDate,
                    return_date: returnDate,
                    total_days: days,
                    total_price: totalPrice,
                    notes: notes,
                    status: 'confirmed'
                }
            ])
            .select();
        
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        console.log('Booking saved to Supabase:', data);
        
        // Show success modal
        bookingRefSpan.textContent = bookingRef;
        closeBookingModal();
        successModal.style.display = 'flex';
        
        // Reset form
        bookingForm.reset();
        
    } catch (error) {
        console.error('Error saving booking:', error);
        showBookingMessage('Error saving booking. Please try again.', 'error');
    }
}

// Handle search form submission
async function handleSearch(e) {
    e.preventDefault();
    
    const carType = document.getElementById('carType').value;
    const transmission = document.getElementById('transmission').value;
    
    let query = supabase
        .from('cars')
        .select('*')
        .eq('is_available', true);
    
    if (carType) {
        query = query.eq('category', carType);
    }
    
    if (transmission) {
        query = query.eq('transmission', transmission);
    }
    
    try {
        const { data, error } = await query.order('price_per_day', { ascending: true });
        
        if (error) throw error;
        
        renderCars(data || []);
        
        // Scroll to cars section
        document.getElementById('cars').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error searching cars:', error);
        // Fallback to filtering local data
        let filteredCars = allCars;
        
        if (carType) {
            filteredCars = filteredCars.filter(car => car.category === carType);
        }
        
        if (transmission) {
            filteredCars = filteredCars.filter(car => car.transmission === transmission);
        }
        
        renderCars(filteredCars);
        document.getElementById('cars').scrollIntoView({ behavior: 'smooth' });
    }
}

// Toggle mobile menu
function toggleMobileMenu() {
    navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
}

// Set current year in footer
function setCurrentYear() {
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    initializeDates();
    setCurrentYear();
    
    // Fetch data from Supabase
    await fetchCars();
    await fetchLocations();
    
    // Setup event listeners
    bookNowBtn.addEventListener('click', () => openBookingModal('Any Available Car'));
    exploreCarsBtn.addEventListener('click', () => {
        document.getElementById('cars').scrollIntoView({ behavior: 'smooth' });
    });
    
    closeModal.addEventListener('click', closeBookingModal);
    closeSuccessModal.addEventListener('click', closeSuccessModalFunc);
    closeSuccessBtn.addEventListener('click', closeSuccessModalFunc);
    bookingForm.addEventListener('submit', handleBooking);
    searchForm.addEventListener('submit', handleSearch);
    mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === bookingModal) {
            closeBookingModal();
        }
        if (e.target === successModal) {
            closeSuccessModalFunc();
        }
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
                
                // Close mobile menu if open
                if (window.innerWidth <= 768) {
                    navMenu.style.display = 'none';
                }
            }
        });
    });
    
    // Filter links in footer
    document.querySelectorAll('.filter-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const type = this.getAttribute('data-type');
            document.getElementById('carType').value = type;
            document.getElementById('searchForm').dispatchEvent(new Event('submit'));
        });
    });
});