// Mobile menu toggle
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

// Form submission placeholder
// Home Page Search Form Logic
const homeSearchForm = document.getElementById('home-search-form');
const travelModal = document.getElementById('travel-mode-modal');
const modeBtns = document.querySelectorAll('.mode-btn');
const confirmModeBtn = document.getElementById('confirm-mode-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalTripDetails = document.getElementById('modal-trip-details');
let selectedMode = null;

if (homeSearchForm) {

    homeSearchForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Stop default form submit

        // Grab values
        const fromVal = document.getElementById('search-from').value;
        const toVal = document.getElementById('search-to').value;
        const dateVal = document.getElementById('search-date').value;

        // Format strings
        const dateObj = new Date(dateVal);
        const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

        // Update Modal Text
        if (fromVal && toVal && dateVal) {
            modalTripDetails.innerHTML = `<i class="fas fa-map-marker-alt mr-1"></i> ${fromVal} &nbsp;<i class="fas fa-long-arrow-alt-right mx-1"></i>&nbsp; ${toVal} <br> <i class="far fa-calendar-alt mt-2 mr-1"></i> ${dateStr}`;
            modalTripDetails.classList.remove('hidden');
        }

        // Show travel mode modal
        if (travelModal) travelModal.classList.remove('hidden');
    });
}

// Global variables for booking journey (Shared between Index and Routes pages)
window.bookingJourney = { from: '', to: '', date: '' };

// Fetch Distance from Backend (which securely calls Google Maps)
async function getRealDistance(fromCity, toCity) {
    if (fromCity === toCity) return { error: 'SAME_CITY' };
    try {
        const response = await fetch(`/api/distance?origins=${encodeURIComponent(fromCity)}&destinations=${encodeURIComponent(toCity)}`);
        const data = await response.json();

        if (response.status === 500 && data.error && data.error.includes('API key')) {
            return { error: 'API_KEY_MISSING' };
        }
        if (data && data.rows && data.rows[0].elements[0].status === 'OK') {
            const distanceMeters = data.rows[0].elements[0].distance.value;
            return { distance: Math.round(distanceMeters / 1000) }; // Return Kilometers
        } else if (data && data.rows && data.rows[0].elements[0].status === 'ZERO_RESULTS') {
            return { error: 'NO_ROUTE' };
        } else {
            console.error('Google Maps API Error:', data);
            return { error: 'UNKNOWN' };
        }
    } catch (error) {
        console.error('Distance fetch error:', error);
        return { error: 'NETWORK' };
    }
}

const priceDisplay = document.getElementById('price-display');
const distanceText = document.getElementById('distance-text');
const totalPriceText = document.getElementById('total-price-text');
const perSeatPriceText = document.getElementById('per-seat-price-text');
const personalInfoModal = document.getElementById('personal-info-modal');
const cancelBookingBtn = document.getElementById('cancel-booking-btn');
const bookingForm = document.getElementById('booking-form');
const bookingNotification = document.getElementById('booking-notification');

// Constants for pricing
const FUEL_CHEVY = {
    'Car': { fuel: 'Petrol', price: 102, mileage: 14, seats: 4 },
    'Van': { fuel: 'Diesel', price: 89, mileage: 10, seats: 15 },
    'Bus': { fuel: 'Diesel', price: 89, mileage: 5, seats: 60 }
};

if (modeBtns) {
    modeBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            // Remove active styles from all
            modeBtns.forEach(b => {
                b.classList.remove('border-blue-600', 'bg-blue-50');
                b.classList.add('border-gray-200');
            });
            // Add active styles to clicked
            btn.classList.remove('border-gray-200');
            btn.classList.add('border-blue-600', 'bg-blue-50');

            selectedMode = btn.getAttribute('data-mode');
            if (confirmModeBtn) confirmModeBtn.disabled = false;

            // Calculate Price (use inputs if on index, or global object if on routes)
            const fromInput = document.getElementById('search-from');
            const toInput = document.getElementById('search-to');

            let fromCity = window.bookingJourney.from;
            let toCity = window.bookingJourney.to;

            // Override with local inputs if they exist (Home page behavior)
            if (fromInput && toInput && fromInput.value && toInput.value) {
                fromCity = fromInput.value;
                toCity = toInput.value;
            }

            if (fromCity && toCity && selectedMode && priceDisplay) {
                // Show loading state
                priceDisplay.classList.remove('hidden');
                distanceText.innerHTML = `Calculating real-time distance... <i class="fas fa-spinner fa-spin"></i>`;
                totalPriceText.innerText = `...`;
                perSeatPriceText.innerText = `...`;

                const result = await getRealDistance(fromCity, toCity);

                if (result && result.distance !== undefined) {
                    const vehicleStats = FUEL_CHEVY[selectedMode];
                    const distanceKm = result.distance;

                    // Math: (Distance / Mileage) * Fuel Price
                    const fuelNeededLiters = distanceKm / vehicleStats.mileage;
                    const totalFuelCost = Math.round(fuelNeededLiters * vehicleStats.price);
                    const perSeatCost = Math.ceil(totalFuelCost / vehicleStats.seats);

                    // Update UI
                    distanceText.innerHTML = `Estimation for <strong>${distanceKm} km</strong> trip`;
                    totalPriceText.innerText = `₹${totalFuelCost.toLocaleString()}`;
                    perSeatPriceText.innerText = `₹${perSeatCost.toLocaleString()}`;
                } else {
                    let errorMsg = 'Distance calculation failed.';
                    if (result && result.error === 'API_KEY_MISSING') {
                        errorMsg = 'Server missing Google Maps API Key.';
                    } else if (result && result.error === 'NO_ROUTE') {
                        errorMsg = 'No direct driving route found (e.g., requires trek).';
                    } else if (result && result.error === 'SAME_CITY') {
                        errorMsg = 'Departure and arrival cities cannot be exactly the same.';
                    }
                    distanceText.innerHTML = `<span class="text-red-500"><i class="fas fa-exclamation-triangle"></i> ${errorMsg}</span>`;
                    totalPriceText.innerText = `-`;
                    perSeatPriceText.innerText = `-`;
                }
            }
        });
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        travelModal.classList.add('hidden');
        if (priceDisplay) priceDisplay.classList.add('hidden');
        selectedMode = null;
        confirmModeBtn.disabled = true;
        modeBtns.forEach(b => {
            b.classList.remove('border-blue-600', 'bg-blue-50');
            b.classList.add('border-gray-200');
        });
    });
}

if (confirmModeBtn) {
    confirmModeBtn.addEventListener('click', () => {
        if (selectedMode) {
            // Hide travel mode modal, show personal info modal
            if (travelModal) travelModal.classList.add('hidden');
            if (priceDisplay) priceDisplay.classList.add('hidden');
            if (personalInfoModal) personalInfoModal.classList.remove('hidden');
        }
    });
}

if (cancelBookingBtn) {
    cancelBookingBtn.addEventListener('click', () => {
        if (personalInfoModal) personalInfoModal.classList.add('hidden');
        // Reset everything
        selectedMode = null;
        if (confirmModeBtn) confirmModeBtn.disabled = true;
        modeBtns.forEach(b => {
            b.classList.remove('border-blue-600', 'bg-blue-50');
            b.classList.add('border-gray-200');
        });
    });
}

if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get form data
        const formData = new FormData(bookingForm);
        const customerDetails = {
            name: formData.get('passenger-name'),
            email: formData.get('passenger-email'),
            phone: formData.get('passenger-phone')
        };

        // Get booking details from selected mode
        const bookingData = {
            amount: selectedMode ? selectedMode.price : 0,
            customerDetails: customerDetails,
            busDetails: {
                busNumber: selectedMode ? selectedMode.name : '',
                route: `${window.bookingJourney.from} to ${window.bookingJourney.to}`,
                departureTime: window.bookingJourney.date,
                arrivalTime: window.bookingJourney.date,
                seats: selectedMode ? [selectedMode.name] : []
            }
        };

        // Store booking data in localStorage for payment page
        localStorage.setItem('bookingData', JSON.stringify(bookingData));

        // Hide modal
        if (personalInfoModal) personalInfoModal.classList.add('hidden');

        // Reset forms and states
        bookingForm.reset();
        const homeForm = document.getElementById('home-search-form');
        if (homeForm) homeForm.reset();

        selectedMode = null;
        if (confirmModeBtn) confirmModeBtn.disabled = true;
        modeBtns.forEach(b => {
            b.classList.remove('border-blue-600', 'bg-blue-50');
            b.classList.add('border-gray-200');
        });

        // Redirect to payment page
        window.location.href = 'payment.html';
    });
}

// Smooth scrolling for anchors
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
});

// Animate on scroll (simple)
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.animate-fade-in').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    observer.observe(el);
});

// Routes Page Booking Logic
const routeBtns = document.querySelectorAll('.route-book-btn');
const routeDepartureModal = document.getElementById('route-departure-modal');
const routeDestName = document.getElementById('route-dest-name');
const routeDepartureForm = document.getElementById('route-departure-form');
const cancelRouteBookingBtn = document.getElementById('cancel-route-booking-btn');

if (routeBtns.length > 0 && routeDepartureModal) {
    let currentDestination = '';

    routeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentDestination = btn.getAttribute('data-destination');
            routeDestName.innerText = currentDestination;
            routeDepartureModal.classList.remove('hidden');
        });
    });

    if (cancelRouteBookingBtn) {
        cancelRouteBookingBtn.addEventListener('click', () => {
            routeDepartureModal.classList.add('hidden');
            if (routeDepartureForm) routeDepartureForm.reset();
        });
    }

    if (routeDepartureForm) {
        routeDepartureForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const fromVal = document.getElementById('route-search-from').value;
            const dateVal = document.getElementById('route-search-date').value;
            const toVal = currentDestination;

            // Save globally
            window.bookingJourney.from = fromVal;
            window.bookingJourney.to = toVal;
            window.bookingJourney.date = dateVal;

            // Format date for display
            const dateObj = new Date(dateVal);
            const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

            // Update Travel Mode modal trip details description
            if (modalTripDetails) {
                modalTripDetails.innerHTML = `<i class="fas fa-map-marker-alt mr-1"></i> ${fromVal} &nbsp;<i class="fas fa-long-arrow-alt-right mx-1"></i>&nbsp; ${toVal} <br> <i class="far fa-calendar-alt mt-2 mr-1"></i> ${dateStr}`;
                modalTripDetails.classList.remove('hidden');
            }

            // Transition Modals
            routeDepartureModal.classList.add('hidden');
            if (travelModal) travelModal.classList.remove('hidden');
        });
    }
}
