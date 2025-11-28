// Import Firebase functions from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- PASTE YOUR FIREBASE CONFIG HERE ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global Cart Array
let cart = [];
const YOUR_WHATSAPP_NUMBER = "94770000000"; // REPLACE WITH YOUR NUMBER (No + sign)

// ==========================================
// 1. CUSTOMER PAGE LOGIC (index.html)
// ==========================================

if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    
    // Load Products
    const productContainer = document.getElementById('product-list');
    
    // Real-time listener for products
    onSnapshot(collection(db, "products"), (snapshot) => {
        productContainer.innerHTML = '';
        snapshot.forEach((doc) => {
            const prod = doc.data();
            productContainer.innerHTML += `
                <div class="col-md-3">
                    <div class="card product-card h-100">
                        <img src="${prod.image}" class="card-img-top" alt="${prod.name}">
                        <div class="card-body">
                            <h5 class="card-title">${prod.name}</h5>
                            <p class="card-text text-success fw-bold">Rs. ${prod.price}</p>
                            <button class="btn btn-outline-primary w-100" onclick="addToCart('${doc.id}', '${prod.name}', ${prod.price})">Add to Cart</button>
                        </div>
                    </div>
                </div>
            `;
        });
    });

    // Expose addToCart to global scope
    window.addToCart = (id, name, price) => {
        cart.push({ id, name, price });
        updateCartUI();
    };

    function updateCartUI() {
        document.getElementById('cart-count').innerText = cart.length;
        const cartList = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total');
        
        cartList.innerHTML = '';
        let total = 0;

        cart.forEach((item, index) => {
            total += item.price;
            cartList.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${item.name} - Rs. ${item.price}
                    <button class="btn btn-sm btn-danger" onclick="removeFromCart(${index})">X</button>
                </li>
            `;
        });
        cartTotal.innerText = "Rs. " + total;
    }

    window.removeFromCart = (index) => {
        cart.splice(index, 1);
        updateCartUI();
    };

    window.checkout = async () => {
        if (cart.length === 0) return alert("Cart is empty!");
        
        const name = document.getElementById('customer-name').value;
        const address = document.getElementById('customer-address').value;

        if (!name || !address) return alert("Please fill in Name and Address");

        // 1. Calculate Total
        let total = cart.reduce((sum, item) => sum + item.price, 0);
        
        // 2. Prepare Order Data
        const orderData = {
            customerName: name,
            customerAddress: address,
            items: cart,
            total: total,
            createdAt: serverTimestamp() // Firestore server time
        };

        try {
            // 3. Save to Firebase (So Admin can see it)
            await addDoc(collection(db, "orders"), orderData);

            // 4. Create WhatsApp Message
            let message = `*New Order*\nName: ${name}\nAddress: ${address}\n\n*Items:*\n`;
            cart.forEach(item => {
                message += `- ${item.name} (Rs.${item.price})\n`;
            });
            message += `\n*Total: Rs. ${total}*`;

            // 5. Open WhatsApp
            const url = `https://wa.me/${YOUR_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
            
            // Clear Cart
            cart = [];
            updateCartUI();
            bootstrap.Modal.getInstance(document.getElementById('cartModal')).hide();

        } catch (e) {
            console.error("Error placing order: ", e);
            alert("Error placing order. Please try again.");
        }
    };
}

// ==========================================
// 2. ADMIN PAGE LOGIC (admin.html)
// ==========================================

if (window.location.pathname.endsWith('admin.html')) {
    
    // Add Product
    document.getElementById('add-product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('prod-name').value;
        const price = Number(document.getElementById('prod-price').value);
        const image = document.getElementById('prod-img').value;

        try {
            await addDoc(collection(db, "products"), {
                name, price, image
            });
            alert("Product Added!");
            e.target.reset();
        } catch (error) {
            alert("Error adding product: " + error.message);
        }
    });

    // Load Products for Admin
    const adminProdList = document.getElementById('admin-product-list');
    onSnapshot(collection(db, "products"), (snapshot) => {
        adminProdList.innerHTML = '';
        snapshot.forEach((doc) => {
            const prod = doc.data();
            adminProdList.innerHTML += `
                <tr>
                    <td><img src="${prod.image}" alt=""></td>
                    <td>${prod.name}</td>
                    <td>${prod.price}</td>
                    <td><button class="btn btn-danger btn-sm" onclick="deleteProduct('${doc.id}')">Delete</button></td>
                </tr>
            `;
        });
    });

    window.deleteProduct = async (id) => {
        if(confirm("Are you sure?")) {
            await deleteDoc(doc(db, "products", id));
        }
    };

    // Load Orders for Admin
    const adminOrderList = document.getElementById('admin-order-list');
    onSnapshot(collection(db, "orders"), (snapshot) => {
        adminOrderList.innerHTML = '';
        snapshot.forEach((doc) => {
            const order = doc.data();
            let date = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'Just now';
            let itemNames = order.items.map(i => i.name).join(", ");
            
            adminOrderList.innerHTML += `
                <tr>
                    <td>${date}</td>
                    <td>${order.customerName}<br><small>${order.customerAddress}</small></td>
                    <td>${itemNames}</td>
                    <td>Rs. ${order.total}</td>
                </tr>
            `;
        });
    });
}
