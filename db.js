/* =====================================================
   SUPABASE DATABASE ACCESS LAYER (db.js)
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

  return data;
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

  return data;
}

/* =====================
   BOOKING AVAILABILITY
===================== */
export async function dbCheckAvailability(carId, startDate, endDate) {
  const { data, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('car_id', carId)
    .eq('status', 'confirmed')
    .or(`pickup_date.lte.${endDate},return_date.gte.${startDate}`);

  if (error) {
    console.error('DB ERROR (availability):', error);
    return true; // fallback aman
  }

  return data.length === 0;
}

/* =====================
   SAVE BOOKING
===================== */
export async function dbCreateBooking(payload) {
  const { data, error } = await supabase
    .from('bookings')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('DB ERROR (booking):', error);
    throw error;
  }

  return data;
}

/* =====================
   DEBUG
===================== */
export async function dbTestConnection() {
  const { error } = await supabase
    .from('cars')
    .select('id')
    .limit(1);

  return !error;
}
