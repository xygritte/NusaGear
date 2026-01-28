/* =====================================================
   SUPABASE DATABASE ACCESS LAYER (db.js) - FIXED VERSION
   ===================================================== */

/* =====================
   CONFIG
===================== */
const SUPABASE_URL = 'https://bpfwkzawbmitlujsjgrh.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwZndremF3Ym1pdGx1anNqZ3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MzM4NDMsImV4cCI6MjA4NTEwOTg0M30.BWInso3y8BP_zy6ZmAMKTI1FfpuVDsrnjEs5uPKdJJo';

/* =====================
   INIT CLIENT
===================== */
export const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* =====================
   CARS
===================== */
export async function dbGetCars(filters = {}) {
  let query = supabase
    .from('cars')
    .select('*')
    .eq('is_available', true);

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  if (filters.transmission) {
    query = query.eq('transmission', filters.transmission);
  }

  const { data, error } = await query.order('price_per_day');

  if (error) {
    console.error('DB ERROR (cars):', error);
    throw error;
  }

  return data || [];
}

/* =====================
   LOCATIONS
===================== */
export async function dbGetLocations() {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .order('city');

  if (error) {
    console.error('DB ERROR (locations):', error);
    throw error;
  }

  return data || [];
}

/* =====================
   BOOKING AVAILABILITY
===================== */
export async function dbCheckAvailability(carId, startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('car_id', carId)
      .eq('status', 'confirmed')
      .or(`pickup_date.lte.${endDate},return_date.gte.${startDate}`);

    if (error) {
      console.error('DB ERROR (availability):', error);
      return true; // fallback safe
    }

    return data.length === 0;
  } catch (error) {
    console.error('Availability check error:', error);
    return true; // fallback safe
  }
}

/* =====================
   SAVE BOOKING - UPDATED FOR CORRECT SCHEMA
===================== */
export async function dbCreateBooking(payload) {
  console.log('Creating booking with payload:', payload);
  
  // Prepare data according to database schema
  // Remove any fields that might not exist in the database
  const bookingData = {
    car_id: payload.car_id,
    car_name: payload.car_name,
    customer_name: payload.customer_name,
    customer_email: payload.customer_email,
    customer_phone: payload.customer_phone,
    pickup_location: payload.pickup_location,
    pickup_date: payload.pickup_date,
    return_date: payload.return_date,
    total_days: payload.total_days,
    total_price: payload.total_price,
    status: payload.status || 'confirmed',
    booking_reference: payload.booking_reference
    // Remove 'notes' field if it doesn't exist in your database
    // notes: payload.notes // Commented out since column doesn't exist
  };

  console.log('Booking data to insert:', bookingData);

  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select()
      .single();

    if (error) {
      console.error('DB ERROR (booking):', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }

    console.log('Booking created successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to create booking:', error);
    
    // Fallback: Try without notes and created_at
    if (error.message && error.message.includes('notes')) {
      console.log('Retrying without notes field...');
      delete bookingData.notes;
      
      const { data, error: retryError } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();
        
      if (retryError) {
        console.error('Retry also failed:', retryError);
        throw retryError;
      }
      
      return data;
    }
    
    throw error;
  }
}

/* =====================
   GET BOOKINGS (for debugging)
===================== */
export async function dbGetBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('DB ERROR (get bookings):', error);
    return [];
  }

  console.log('Recent bookings:', data);
  return data || [];
}

/* =====================
   CHECK DATABASE SCHEMA
===================== */
export async function dbCheckSchema() {
  console.log('Checking database schema...');
  
  try {
    // Check cars table
    const { data: carsColumns, error: carsError } = await supabase
      .from('cars')
      .select('*')
      .limit(1);
      
    console.log('Cars table sample:', carsColumns);
    
    // Check bookings table
    const { data: bookingsColumns, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .limit(1);
      
    console.log('Bookings table sample:', bookingsColumns);
    
    // Check table structure
    console.log('Available tables:');
    console.log('- cars:', carsError ? 'Error' : 'OK');
    console.log('- bookings:', bookingsError ? 'Error' : 'OK');
    
    return !carsError && !bookingsError;
  } catch (error) {
    console.error('Schema check error:', error);
    return false;
  }
}

/* =====================
   DEBUG
===================== */
export async function dbTestConnection() {
  try {
    const { error } = await supabase
      .from('cars')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Connection test failed:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Connection test error:', error);
    return false;
  }
}
