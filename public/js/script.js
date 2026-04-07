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

// Auth Elements
const navLoginBtn = document.getElementById('nav-login-btn');
const navLogoutBtn = document.getElementById('nav-logout-btn');
const navMyBookings = document.getElementById('nav-my-bookings');
const mobileNavLoginBtn = document.getElementById('mobile-nav-login-btn');
const mobileNavLogoutBtn = document.getElementById('mobile-nav-logout-btn');
const mobileNavMyBookings = document.getElementById('mobile-nav-my-bookings');

const loginModal = document.getElementById('login-modal');
const signupModal = document.getElementById('new-signup-modal');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('new-signup-form');
const closeLoginBtn = document.getElementById('close-login-btn');
const closeSignupBtn = document.getElementById('close-signup-btn');
const switchToSignup = document.getElementById('switch-to-signup');
const switchToLogin = document.getElementById('switch-to-login');

// Cache bust auth state once
if (!localStorage.getItem('auth_id_reset_v3')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.setItem('auth_id_reset_v3', 'true');
}

let selectedMode = null;
let currentBookingAmount = 0;
let currentUser = JSON.parse(localStorage.getItem('user')) || null;
let authToken = localStorage.getItem('token') || null;

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
    'Van': { fuel: 'Diesel', price: 89, mileage: 10, seats: 20 },
    'Bus': { fuel: 'Diesel', price: 89, mileage: 5, seats: 70 }
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

                    // Show Passenger Area
                    const passengerArea = document.getElementById('passenger-count-area');
                    const passengerInput = document.getElementById('passenger-count');
                    const capacityLimitText = document.getElementById('capacity-limit-text');
                    
                    if (passengerArea) {
                        passengerArea.classList.remove('hidden');
                        passengerInput.max = vehicleStats.seats;
                        passengerInput.value = 1; // Default
                        capacityLimitText.innerText = `Max: ${vehicleStats.seats}`;
                    }

                    // Update UI with 1 passenger initially
                    updatePriceUI(distanceKm, perSeatCost, 1);
                    
                    // Function to update UI
                    function updatePriceUI(dist, pSeat, count) {
                        const totalCost = pSeat * count;
                        distanceText.innerHTML = `Estimation for <strong>${dist} km</strong> trip`;
                        totalPriceText.innerText = `₹${totalCost.toLocaleString()}`;
                        perSeatPriceText.innerText = `₹${pSeat.toLocaleString()}`;
                        currentBookingAmount = totalCost; // Store for payment
                    }

                    // Add listener for real-time recalculation (if not already added)
                    if (passengerInput) {
                        passengerInput.oninput = () => {
                            const count = parseInt(passengerInput.value) || 0;
                            const warning = document.getElementById('passenger-warning');
                            
                            if (count > vehicleStats.seats) {
                                warning.classList.remove('hidden');
                                confirmModeBtn.disabled = true;
                            } else if (count <= 0) {
                                confirmModeBtn.disabled = true;
                            } else {
                                warning.classList.add('hidden');
                                confirmModeBtn.disabled = false;
                                updatePriceUI(distanceKm, perSeatCost, count);
                            }
                        };
                    }

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
        const passengerArea = document.getElementById('passenger-count-area');
        if (passengerArea) passengerArea.classList.add('hidden');
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
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get form data
        const customerDetails = {
            name: document.getElementById('passenger-name').value,
            email: document.getElementById('passenger-email').value,
            phone: document.getElementById('passenger-phone').value
        };

        const passengerCount = document.getElementById('passenger-count').value || 1;
        const busDetails = {
            busNumber: selectedMode || 'Not Selected',
            route: `${window.bookingJourney.from || 'Direct'} to ${window.bookingJourney.to || 'Destination'}`,
            departureTime: window.bookingJourney.date || new Date().toISOString(),
            arrivalTime: window.bookingJourney.date || new Date().toISOString(),
            seats: [`${selectedMode} (${passengerCount} Persons)`]
        };

        try {
            // 1. Create order on backend
            const orderRequestData = {
                amount: currentBookingAmount,
                customerDetails,
                busDetails,
                receipt: `receipt_${Date.now()}`
            };

            // Link to user if logged in
            if (currentUser && currentUser._id) {
                orderRequestData.userId = currentUser._id;
            }

            const orderResponse = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderRequestData)
            });

            const orderData = await orderResponse.json();
            if (!orderData.success) throw new Error(orderData.error);

            // 2. Open Razorpay Modal
            const options = {
                key: orderData.key_id,
                amount: orderData.order.amount,
                currency: orderData.order.currency,
                name: 'Shree Bhawani Travels',
                description: `Booking for ${busDetails.route}`,
                order_id: orderData.order.id,
                handler: async function (response) {
                    // 3. Verify payment on backend
                    const verifyResponse = await fetch('/api/payment/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            paymentId: response.razorpay_payment_id,
                            orderId: response.razorpay_order_id,
                            signature: response.razorpay_signature
                        })
                    });

                    const verifyData = await verifyResponse.json();

                    if (verifyData.success) {
                        // 4. Save confirmation and redirect
                        const confirmationData = {
                            bookingId: 'BK' + Date.now(),
                            busDetails,
                            customerDetails,
                            amount: currentBookingAmount,
                            paymentId: response.razorpay_payment_id,
                            orderId: response.razorpay_order_id
                        };
                        localStorage.setItem('bookingConfirmation', JSON.stringify(confirmationData));
                        
                        // Hide modal and show success
                        if (personalInfoModal) personalInfoModal.classList.add('hidden');
                        window.location.href = 'booking-success.html';
                    } else {
                        alert('Payment verification failed: ' + verifyData.message);
                    }
                },
                prefill: {
                    name: customerDetails.name,
                    email: customerDetails.email,
                    contact: customerDetails.phone
                },
                theme: { color: '#2563eb' }
            };

            const rzp = new Razorpay(options);
            rzp.open();

        } catch (error) {
            console.error('Payment Error:', error);
            alert('Error processing payment: ' + error.message);
        }
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

// Authentication Logic
function updateAuthState() {
    if (authToken && currentUser) {
        if (navLoginBtn) navLoginBtn.classList.add('hidden');
        if (navLogoutBtn) navLogoutBtn.classList.remove('hidden');
        if (navMyBookings) navMyBookings.classList.remove('hidden');
        if (mobileNavLoginBtn) mobileNavLoginBtn.classList.add('hidden');
        if (mobileNavLogoutBtn) mobileNavLogoutBtn.classList.remove('hidden');
        if (mobileNavMyBookings) mobileNavMyBookings.classList.remove('hidden');
    } else {
        if (navLoginBtn) navLoginBtn.classList.remove('hidden');
        if (navLogoutBtn) navLogoutBtn.classList.add('hidden');
        if (navMyBookings) navMyBookings.classList.add('hidden');
        if (mobileNavLoginBtn) mobileNavLoginBtn.classList.remove('hidden');
        if (mobileNavLogoutBtn) mobileNavLogoutBtn.classList.add('hidden');
        if (mobileNavMyBookings) mobileNavMyBookings.classList.add('hidden');
    }
}

// Initial check
updateAuthState();

// Event Listeners for Auth
if (navLoginBtn) navLoginBtn.onclick = () => loginModal.classList.remove('hidden');
if (mobileNavLoginBtn) mobileNavLoginBtn.onclick = () => loginModal.classList.remove('hidden');

if (closeLoginBtn) closeLoginBtn.onclick = () => loginModal.classList.add('hidden');
if (closeSignupBtn) closeSignupBtn.onclick = () => signupModal.classList.add('hidden');

if (switchToSignup) {
    switchToSignup.onclick = (e) => {
        e.preventDefault();
        loginModal.classList.add('hidden');
        signupModal.classList.remove('hidden');
    };
}

if (switchToLogin) {
    switchToLogin.onclick = (e) => {
        e.preventDefault();
        signupModal.classList.add('hidden');
        loginModal.classList.remove('hidden');
    };
}

const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authToken = null;
    currentUser = null;
    updateAuthState();
    window.location.reload();
};

if (navLogoutBtn) navLogoutBtn.onclick = handleLogout;
if (mobileNavLogoutBtn) mobileNavLogoutBtn.onclick = handleLogout;

// Signup Form
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const signupData = {
            name: document.getElementById('new-signup-name').value,
            email: document.getElementById('new-signup-email').value,
            password: document.getElementById('new-signup-password').value
        };

        try {
            // Add cache-busting timestamp
            const response = await fetch(`/api/auth/signup?t=${Date.now()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signupData)
            });
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify({ _id: data._id, name: data.name, email: data.email }));
                window.location.reload();
            } else {
                alert('Signup failed: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Signup error:', error);
            alert('Signup error: ' + error.message);
        }
    });
}

// Login Form
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loginData = {
            email: document.getElementById('login-email').value,
            password: document.getElementById('login-password').value
        };

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
            });
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify({ _id: data._id, name: data.name, email: data.email }));
                window.location.reload();
            } else {
                alert('Login failed: ' + (data.error || 'Invalid credentials'));
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login error: ' + error.message);
        }
    });
}
