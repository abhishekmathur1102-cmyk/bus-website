// Razorpay Payment Integration
class RazorpayPayment {
    constructor() {
        this.keyId = 'rzp_test_SZ66p5BobD8L4Y';
        this.isInitialized = false;
    }

    // Initialize Razorpay
    init() {
        if (typeof Razorpay === 'undefined') {
            console.error('Razorpay SDK not loaded');
            return false;
        }
        this.isInitialized = true;
        return true;
    }

    // Create payment order
    async createOrder(amount, customerDetails, busDetails) {
        try {
            const response = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: amount,
                    currency: 'INR',
                    receipt: `receipt_${Date.now()}`,
                    customerDetails: customerDetails,
                    busDetails: busDetails
                })
            });

            const data = await response.json();
            
            if (data.success) {
                return data;
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error creating order:', error);
            throw error;
        }
    }

    // Open payment modal
    async openPaymentModal(orderData, options = {}) {
        if (!this.isInitialized) {
            this.init();
        }

        const defaultOptions = {
            key: this.keyId,
            amount: orderData.order.amount * 100, // Convert to paise
            currency: orderData.order.currency,
            name: 'Bus Booking',
            description: 'Bus Ticket Payment',
            order_id: orderData.order.id,
            handler: async (response) => {
                try {
                    await this.verifyPayment(response);
                    if (options.onSuccess) {
                        options.onSuccess(response);
                    }
                } catch (error) {
                    if (options.onError) {
                        options.onError(error);
                    }
                }
            },
            modal: {
                ondismiss: function() {
                    if (options.onDismiss) {
                        options.onDismiss();
                    }
                }
            },
            prefill: {
                name: orderData.customerDetails?.name || '',
                email: orderData.customerDetails?.email || '',
                contact: orderData.customerDetails?.phone || ''
            },
            theme: {
                color: '#3399cc'
            }
        };

        const finalOptions = { ...defaultOptions, ...options };
        const rzp = new Razorpay(finalOptions);
        rzp.open();
    }

    // Verify payment
    async verifyPayment(paymentResponse) {
        try {
            const response = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    paymentId: paymentResponse.razorpay_payment_id,
                    orderId: paymentResponse.razorpay_order_id,
                    signature: paymentResponse.razorpay_signature
                })
            });

            const data = await response.json();
            
            if (data.success) {
                return data;
            } else {
                throw new Error(data.message || 'Payment verification failed');
            }
        } catch (error) {
            console.error('Error verifying payment:', error);
            throw error;
        }
    }

    // Get order status
    async getOrderStatus(orderId) {
        try {
            const response = await fetch(`/api/payment/order/${orderId}`);
            const data = await response.json();
            
            if (data.success) {
                return data.order;
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error fetching order status:', error);
            throw error;
        }
    }
}

// Initialize global payment instance
const payment = new RazorpayPayment();

// Payment flow function for bus booking
async function processBusPayment(bookingData) {
    try {
        // Show loading state
        showPaymentLoading(true);

        // Create order
        const orderData = await payment.createOrder(
            bookingData.amount,
            bookingData.customerDetails,
            bookingData.busDetails
        );

        // Open payment modal
        await payment.openPaymentModal(orderData, {
            onSuccess: async (response) => {
                showPaymentSuccess(response);
                hidePaymentLoading();
                
                // Save booking confirmation
                const bookingData = getBookingData();
                const confirmationData = {
                    bookingId: 'BK' + Date.now(),
                    busDetails: bookingData.busDetails,
                    customerDetails: bookingData.customerDetails,
                    amount: bookingData.amount,
                    paymentId: response.razorpay_payment_id,
                    orderId: response.razorpay_order_id
                };
                
                localStorage.setItem('bookingConfirmation', JSON.stringify(confirmationData));
                
                // Redirect to success page
                setTimeout(() => {
                    window.location.href = 'booking-success.html';
                }, 2000);
            },
            onError: (error) => {
                showPaymentError(error);
                hidePaymentLoading();
            },
            onDismiss: () => {
                showPaymentCancelled();
                hidePaymentLoading();
            }
        });

    } catch (error) {
        console.error('Payment processing error:', error);
        showPaymentError(error);
        hidePaymentLoading();
    }
}

// UI Helper Functions
function showPaymentLoading(show) {
    const loadingElement = document.getElementById('payment-loading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

function showPaymentSuccess(response) {
    const successElement = document.getElementById('payment-success');
    if (successElement) {
        successElement.innerHTML = `
            <div class="alert alert-success">
                <h4>Payment Successful!</h4>
                <p>Payment ID: ${response.razorpay_payment_id}</p>
                <p>Your booking has been confirmed.</p>
            </div>
        `;
        successElement.style.display = 'block';
    }
}

function showPaymentError(error) {
    const errorElement = document.getElementById('payment-error');
    if (errorElement) {
        errorElement.innerHTML = `
            <div class="alert alert-danger">
                <h4>Payment Failed</h4>
                <p>${error.message}</p>
                <p>Please try again or contact support.</p>
            </div>
        `;
        errorElement.style.display = 'block';
    }
}

function showPaymentCancelled() {
    const cancelledElement = document.getElementById('payment-cancelled');
    if (cancelledElement) {
        cancelledElement.innerHTML = `
            <div class="alert alert-warning">
                <h4>Payment Cancelled</h4>
                <p>You cancelled the payment. You can try again when ready.</p>
            </div>
        `;
        cancelledElement.style.display = 'block';
    }
}

// Export for use in other files
window.RazorpayPayment = RazorpayPayment;
window.processBusPayment = processBusPayment;
window.payment = payment;
